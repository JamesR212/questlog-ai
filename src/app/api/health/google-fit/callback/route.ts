import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  const appBase    = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const redirectUri = `${appBase}/api/health/google-fit/callback`;

  if (error || !code) {
    return NextResponse.redirect(`${appBase}/?gfit_error=${encodeURIComponent(error ?? 'no_code')}`);
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  // Exchange auth code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return NextResponse.redirect(`${appBase}/?gfit_error=${encodeURIComponent(err)}`);
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiresAt = Date.now() + tokens.expires_in * 1000;

  // Pass tokens back to the client via query params (personal app — acceptable)
  const dest = new URL('/', appBase);
  dest.searchParams.set('gfit_access',  tokens.access_token);
  dest.searchParams.set('gfit_refresh', tokens.refresh_token ?? '');
  dest.searchParams.set('gfit_expiry',  String(expiresAt));

  return NextResponse.redirect(dest.toString());
}
