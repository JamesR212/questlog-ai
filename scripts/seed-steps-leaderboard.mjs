// Seed 5 fake steps_day leaderboard entries for visual testing
// Run: node scripts/seed-steps-leaderboard.mjs

const PROJECT_ID = 'life360-f4bf2';
const API_KEY    = 'AIzaSyCbfIFy1taDVfYgfP2GQI6apXxJ6RcfmO4';
const BASE_URL   = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const today = new Date().toISOString().split('T')[0];
const now   = new Date().toISOString();

const ENTRIES = [
  { userId: 'seed_steps_1', displayName: 'Alex Turner',   value: 41252, lat: 53.4808, lng: -2.2426 }, // Manchester
  { userId: 'seed_steps_2', displayName: 'Sophie Clarke', value: 28940, lat: 51.5074, lng: -0.1278 }, // London
  { userId: 'seed_steps_3', displayName: 'Jamie Walsh',   value: 22105, lat: 52.4862, lng: -1.8904 }, // Birmingham
  { userId: 'seed_steps_4', displayName: 'Priya Sharma',  value: 18430, lat: 53.8008, lng: -1.5491 }, // Leeds
  { userId: 'seed_steps_5', displayName: 'Callum Ross',   value: 14720, lat: 55.8642, lng: -4.2518 }, // Glasgow
];

function fuzz(coord) {
  return coord + (Math.random() - 0.5) * 0.054;
}

function toFirestoreDoc(entry) {
  return {
    fields: {
      userId:             { stringValue: entry.userId },
      displayName:        { stringValue: entry.displayName },
      category:           { stringValue: 'steps_day' },
      value:              { integerValue: String(entry.value) },
      unit:               { stringValue: 'steps' },
      verificationStatus: { stringValue: 'synced' },
      verificationNote:   { stringValue: 'Synced from fitness tracker' },
      lat:                { doubleValue: fuzz(entry.lat) },
      lng:                { doubleValue: fuzz(entry.lng) },
      locationFuzzed:     { booleanValue: true },
      date:               { stringValue: today },
      createdAt:          { stringValue: now },
    }
  };
}

for (const entry of ENTRIES) {
  const docId  = `${entry.userId}_steps_day`;
  const url    = `${BASE_URL}/leaderboard/${docId}?key=${API_KEY}`;
  const res    = await fetch(url, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(toFirestoreDoc(entry)),
  });
  const json = await res.json();
  if (res.ok) {
    console.log(`✅ ${entry.displayName} — ${entry.value.toLocaleString()} steps`);
  } else {
    console.error(`❌ ${entry.displayName}:`, json.error?.message);
  }
}

console.log('\nDone! Check the Steps leaderboard in the app.');
