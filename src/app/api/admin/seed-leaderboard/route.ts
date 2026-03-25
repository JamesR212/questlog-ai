import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

const FAKE_ENTRIES = [
  { userId: 'seed_steps_1', displayName: 'Alex Turner',   value: 41252 },
  { userId: 'seed_steps_2', displayName: 'Sophie Clarke', value: 28940 },
  { userId: 'seed_steps_3', displayName: 'Jamie Walsh',   value: 22105 },
  { userId: 'seed_steps_4', displayName: 'Priya Sharma',  value: 18430 },
  { userId: 'seed_steps_5', displayName: 'Callum Ross',   value: 14720 },
];

function fuzz(coord: number) {
  return coord + (Math.random() - 0.5) * 0.1; // ±~5 km
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // Use provided coords or fall back to London so entries are always placed somewhere
    const baseLat: number = typeof body.lat === 'number' ? body.lat : 51.5074;
    const baseLng: number = typeof body.lng === 'number' ? body.lng : -0.1278;

    const db    = getAdminDb();
    const today = new Date().toISOString().split('T')[0];
    const now   = new Date().toISOString();

    for (const e of FAKE_ENTRIES) {
      await db.collection('leaderboard').doc(`${e.userId}_steps_day`).set({
        userId:             e.userId,
        displayName:        e.displayName,
        category:           'steps_day',
        value:              e.value,
        unit:               'steps',
        verificationStatus: 'synced',
        verificationNote:   'Synced from fitness tracker',
        lat:                fuzz(baseLat),
        lng:                fuzz(baseLng),
        locationFuzzed:     true,
        date:               today,
        createdAt:          now,
      });
    }

    return NextResponse.json({ ok: true, seeded: FAKE_ENTRIES.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
