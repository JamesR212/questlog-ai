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
  { userId: 'seed_steps_1', displayName: 'Alex Turner',   value: 41252, lat: 53.4808, lng: -2.2426 },
  { userId: 'seed_steps_2', displayName: 'Sophie Clarke', value: 28940, lat: 51.5074, lng: -0.1278 },
  { userId: 'seed_steps_3', displayName: 'Jamie Walsh',   value: 22105, lat: 52.4862, lng: -1.8904 },
  { userId: 'seed_steps_4', displayName: 'Priya Sharma',  value: 18430, lat: 53.8008, lng: -1.5491 },
  { userId: 'seed_steps_5', displayName: 'Callum Ross',   value: 14720, lat: 55.8642, lng: -4.2518 },
];

function fuzz(coord: number) {
  return coord + (Math.random() - 0.5) * 0.054;
}

export async function POST() {
  try {
    const db  = getAdminDb();
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
        lat:                fuzz(e.lat),
        lng:                fuzz(e.lng),
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
