import { NextRequest, NextResponse } from 'next/server';

interface TokenSet {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    number;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenSet | null> {
  const clientId     = process.env.FITBIT_CLIENT_ID!;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET!;
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    Date.now() + data.expires_in * 1000,
  };
}

export async function POST(req: NextRequest) {
  const { accessToken, refreshToken, expiresAt, startDate, endDate } = await req.json() as {
    accessToken:  string;
    refreshToken: string;
    expiresAt:    number;
    startDate:    string; // YYYY-MM-DD
    endDate:      string; // YYYY-MM-DD
  };

  let tokens: TokenSet = { accessToken, refreshToken, expiresAt };

  if (Date.now() > tokens.expiresAt - 60_000) {
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    if (!refreshed) {
      return NextResponse.json({ error: 'token_expired' }, { status: 401 });
    }
    tokens = refreshed;
  }

  const res = await fetch(
    `https://api.fitbit.com/1/user/-/activities/steps/date/${startDate}/${endDate}.json`,
    { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: `Fitbit error: ${res.status}` }, { status: 500 });
  }

  const data = await res.json() as { 'activities-steps': { dateTime: string; value: string }[] };
  const results = data['activities-steps'].map(e => ({
    date:  e.dateTime,
    steps: parseInt(e.value, 10) || 0,
  }));

  return NextResponse.json({
    results,
    newAccessToken: tokens.accessToken !== accessToken ? tokens.accessToken : undefined,
    newRefreshToken: tokens.refreshToken !== refreshToken ? tokens.refreshToken : undefined,
    newExpiresAt:   tokens.accessToken !== accessToken ? tokens.expiresAt   : undefined,
  });
}
