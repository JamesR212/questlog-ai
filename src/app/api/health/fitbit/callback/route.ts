import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  const appBase     = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const redirectUri = `${appBase}/api/health/fitbit/callback`;

  if (error || !code) {
    return NextResponse.redirect(`${appBase}/?fitbit_error=${encodeURIComponent(error ?? 'no_code')}`);
  }

  const clientId     = process.env.FITBIT_CLIENT_ID!;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET!;
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const tokenRes = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      code,
      redirect_uri: redirectUri,
      grant_type:   'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return NextResponse.redirect(`${appBase}/?fitbit_error=${encodeURIComponent(err)}`);
  }

  const tokens = await tokenRes.json() as {
    access_token:  string;
    refresh_token: string;
    expires_in:    number;
  };

  const expiresAt = Date.now() + tokens.expires_in * 1000;

  const dest = new URL('/', appBase);
  dest.searchParams.set('fitbit_access',  tokens.access_token);
  dest.searchParams.set('fitbit_refresh', tokens.refresh_token);
  dest.searchParams.set('fitbit_expiry',  String(expiresAt));

  return NextResponse.redirect(dest.toString());
}
