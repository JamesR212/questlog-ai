import { NextResponse } from 'next/server';

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
].join(' ');

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID not configured' }, { status: 503 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/health/google-fit/callback`;

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');

  return NextResponse.json({ url: url.toString() });
}
