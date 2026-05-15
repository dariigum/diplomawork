import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose';
import { setSession } from '@/lib/auth';
import { User } from '@/lib/db/schema';
import { signGooglePendingToken } from '@/lib/google-pending-signup';

interface GoogleUserInfo {
  email?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || request.nextUrl.origin;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const code = request.nextUrl.searchParams.get('code');

  if (!clientId || !clientSecret || !code) {
    return NextResponse.redirect(new URL('/login?error=google_auth_failed', appUrl));
  }

  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/google/callback`;

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(new URL('/login?error=google_auth_failed', appUrl));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token as string | undefined;

    if (!accessToken) {
      return NextResponse.redirect(new URL('/login?error=google_auth_failed', appUrl));
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(new URL('/login?error=google_auth_failed', appUrl));
    }

    const userInfo = await userInfoResponse.json() as GoogleUserInfo;
    const email = userInfo.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=google_auth_failed', appUrl));
    }

    await dbConnect();
    const user = await User.findOne({ email });

    if (!user) {
      const displayName =
        `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim() || userInfo.name || email;
      const pendingToken = await signGooglePendingToken(email, displayName);
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
    return NextResponse.redirect(new URL('/', appUrl));
  } catch (error) {
    return NextResponse.redirect(new URL('/login?error=google_auth_failed', appUrl));
  }
}
