import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose';
import { setSession } from '@/lib/auth';
import { User } from '@/lib/db/schema';
import { signGooglePendingToken } from '@/lib/google-pending-signup';
import * as fs from 'fs';

interface GoogleUserInfo {
  email?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
}

const GOOGLE_FETCH_TIMEOUT_MS = 5000;
const GOOGLE_FETCH_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableFetchError(error: unknown): boolean {
  const err = error as { name?: string; cause?: { code?: string }; code?: string };
  const code = err?.cause?.code || err?.code;
  return (
    err?.name === 'AbortError' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'UND_ERR_CONNECT_TIMEOUT'
  );
}

async function fetchGoogleWithRetry(url: string, init: RequestInit, label: string): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= GOOGLE_FETCH_ATTEMPTS; attempt++) {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(GOOGLE_FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
      writeDebugLog(`${label} network error`, {
        attempt,
        attempts: GOOGLE_FETCH_ATTEMPTS,
        message: error instanceof Error ? error.message : String(error),
        causeCode: (error as any)?.cause?.code || (error as any)?.code,
      });

      if (!isRetryableFetchError(error) || attempt === GOOGLE_FETCH_ATTEMPTS) {
        throw error;
      }

      await sleep(250 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${label} failed`);
}

function writeDebugLog(message: string, data?: any) {
  try {
    const logPath = '/Users/yaycat/Documents/diploma_new/diplomawork/auth_error.log';
    const timestamp = new Date().toISOString();
    const dataStr = data ? '\nData: ' + JSON.stringify(data, null, 2) : '';
    fs.appendFileSync(logPath, `[${timestamp}] ${message}${dataStr}\n\n`);
  } catch (err) {
    console.error('Failed to write debug log:', err);
  }
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || request.nextUrl.origin;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const code = request.nextUrl.searchParams.get('code');

  writeDebugLog('Callback triggered', {
    appUrl,
    clientId: clientId ? `${clientId.substring(0, 10)}...` : 'missing',
    clientSecret: clientSecret ? 'present (hidden)' : 'missing',
    code: code ? `${code.substring(0, 10)}...` : 'missing',
    searchParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
  });

  if (!clientId || !clientSecret || !code) {
    writeDebugLog('Missing clientId, clientSecret, or code', { clientId: !!clientId, clientSecret: !!clientSecret, code: !!code });
    return NextResponse.redirect(new URL('/login?error=google_not_configured', appUrl));
  }

  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/google/callback`;
  writeDebugLog('Redirect URI constructed', { redirectUri });

  try {
    const tokenResponse = await fetchGoogleWithRetry('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    }, 'Google token exchange');

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text().catch(() => '');
      console.error('Google token exchange failed:', tokenResponse.status, errBody);
      writeDebugLog('Google token exchange failed', { status: tokenResponse.status, body: errBody });
      return NextResponse.redirect(new URL('/login?error=google_auth_failed', appUrl));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token as string | undefined;

    if (!accessToken) {
      console.error('Google token response did not contain access_token');
      writeDebugLog('Google token response did not contain access_token', {
        keys: Object.keys(tokenData || {}),
      });
      return NextResponse.redirect(new URL('/login?error=google_auth_failed', appUrl));
    }

    const userInfoResponse = await fetchGoogleWithRetry('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    }, 'Google userinfo fetch');

    if (!userInfoResponse.ok) {
      const errBody = await userInfoResponse.text().catch(() => '');
      console.error('Google userinfo fetch failed:', userInfoResponse.status, errBody);
      writeDebugLog('Google userinfo fetch failed', { status: userInfoResponse.status, body: errBody });
      return NextResponse.redirect(new URL('/login?error=google_auth_failed', appUrl));
    }

    const userInfo = await userInfoResponse.json() as GoogleUserInfo;
    const email = userInfo.email?.trim().toLowerCase();

    if (!email) {
      console.error('Google userinfo did not contain email:', userInfo);
      writeDebugLog('Google userinfo did not contain email', userInfo);
      return NextResponse.redirect(new URL('/login?error=google_auth_failed', appUrl));
    }

    writeDebugLog('User email found', { email, name: userInfo.name });

    await dbConnect();
    writeDebugLog('DB connected successfully');
    const user = await User.findOne({ email });
    writeDebugLog('User lookup completed', { exists: !!user, role: user?.role });

    if (!user) {
      const displayName =
        `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim() || userInfo.name || email;
      const pendingToken = await signGooglePendingToken(email, displayName);
      writeDebugLog('New user pending signup', { displayName });
      const res = NextResponse.redirect(new URL(`${appUrl.replace(/\/$/, '')}/signup/complete-google`, appUrl));
      res.cookies.set('google_signup_pending', pendingToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 900,
        path: '/',
      });
      return res;
    }

    await setSession({ id: user.id, role: user.role, email: user.email });
    writeDebugLog('Session set successfully for user', { id: user.id, email: user.email });
    return NextResponse.redirect(new URL('/', appUrl));
  } catch (error: any) {
    console.error('Google callback route exception:', error);
    writeDebugLog('Google callback route exception', {
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause ? {
        message: error.cause?.message,
        code: error.cause?.code,
        stack: error.cause?.stack,
        error: error.cause
      } : 'No cause',
      error,
    });
    const isNetworkError = isRetryableFetchError(error);
    return NextResponse.redirect(
      new URL(`/login?error=${isNetworkError ? 'google_network_error' : 'google_auth_failed'}`, appUrl),
    );
  }
}
