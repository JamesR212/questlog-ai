import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.FITBIT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'FITBIT_CLIENT_ID not configured' }, { status: 503 });
  }

  const appBase = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const redirectUri = `${appBase}/api/health/fitbit/callback`;

  const url = new URL('https://www.fitbit.com/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'activity');
  url.searchParams.set('expires_in', '604800'); // 1 week

  return NextResponse.json({ url: url.toString() });
}
