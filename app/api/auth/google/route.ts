import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

  if (!clientId || !appUrl) {
    return NextResponse.redirect(new URL('/login?error=google_not_configured', appUrl || 'http://localhost:3000'));
  }

  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/google/callback`;
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');

  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('prompt', 'select_account');

  return NextResponse.redirect(authUrl);
}
