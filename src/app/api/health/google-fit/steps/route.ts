import { NextRequest, NextResponse } from 'next/server';

interface TokenSet {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    number;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenSet | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; expires_in: number };
  return {
    accessToken:  data.access_token,
    refreshToken, // refresh token doesn't change on refresh
    expiresAt:    Date.now() + data.expires_in * 1000,
  };
}

async function fetchStepsForDay(accessToken: string, dateStr: string): Promise<number> {
  // Build millisecond timestamps for start and end of day (UTC)
  const [y, m, d] = dateStr.split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d, 0, 0, 0);
  const endMs   = Date.UTC(y, m - 1, d, 23, 59, 59, 999);

  const res = await fetch(
    'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
    {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startMs,
        endTimeMillis:   endMs,
      }),
    }
  );

  if (!res.ok) throw new Error(`Google Fit error: ${res.status}`);
  const data = await res.json();
  let total = 0;
  for (const bucket of data.bucket ?? []) {
    for (const dataset of bucket.dataset ?? []) {
      for (const point of dataset.point ?? []) {
        for (const val of point.value ?? []) {
          total += val.intVal ?? 0;
        }
      }
    }
  }
  return total;
}

export async function POST(req: NextRequest) {
  const { accessToken, refreshToken, expiresAt, dates } = await req.json() as {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    dates: string[]; // YYYY-MM-DD[]
  };

  let tokens: TokenSet = { accessToken, refreshToken, expiresAt };

  // Refresh if expired (with 60s buffer)
  if (Date.now() > tokens.expiresAt - 60_000) {
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    if (!refreshed) {
      return NextResponse.json({ error: 'token_expired' }, { status: 401 });
    }
    tokens = refreshed;
  }

  try {
    const results: { date: string; steps: number }[] = [];
    for (const date of dates) {
      const steps = await fetchStepsForDay(tokens.accessToken, date);
      results.push({ date, steps });
    }

    return NextResponse.json({
      results,
      // Return updated tokens so client can persist them
      newAccessToken: tokens.accessToken !== accessToken ? tokens.accessToken : undefined,
      newExpiresAt:   tokens.accessToken !== accessToken ? tokens.expiresAt   : undefined,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
