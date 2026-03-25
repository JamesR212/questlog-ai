import { collection, doc, setDoc, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from './firebase';

export type LeaderboardCategory =
  | 'bench_press'
  | 'deadlift'
  | 'squat'
  | 'curl'
  | 'lat_pulldown'
  | 'cable_row'
  | 'steps_day'
  | 'longest_run'
  | 'floors';

export interface LeaderboardEntry {
  id: string;
  userId: string;
  displayName: string;
  category: LeaderboardCategory;
  value: number;
  unit: string;
  verificationStatus: 'ai_verified' | 'gps' | 'synced';
  verificationNote: string;
  lat: number;
  lng: number;
  locationFuzzed: boolean;
  date: string;
  createdAt: string;
}

/** Apply ±~1 km random offset to protect exact location */
export function fuzzLocation(lat: number, lng: number): { lat: number; lng: number } {
  const offset = () => (Math.random() - 0.5) * 0.054; // ±0.027° ≈ ±3 km
  return { lat: lat + offset(), lng: lng + offset() };
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchLeaderboard(
  category: LeaderboardCategory,
  userLat: number | null,
  userLng: number | null,
  radiusKm: number | null, // null = global
): Promise<LeaderboardEntry[]> {
  try {
    const q = query(
      collection(db, 'leaderboard'),
      where('category', '==', category),
      limit(500),
    );
    const snap = await getDocs(q);
    let entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaderboardEntry));

    // Filter by radius
    if (radiusKm !== null && userLat !== null && userLng !== null) {
      entries = entries.filter(
        e => e.lat != null && e.lng != null &&
          haversineKm(userLat, userLng, e.lat, e.lng) <= radiusKm,
      );
    }

    // Keep best entry per user
    const best = new Map<string, LeaderboardEntry>();
    for (const e of entries) {
      const existing = best.get(e.userId);
      if (!existing || e.value > existing.value) best.set(e.userId, e);
    }

    return [...best.values()].sort((a, b) => b.value - a.value);
  } catch (e) {
    console.error('[leaderboard] fetch error:', e);
    return [];
  }
}

export async function submitEntry(
  entry: Omit<LeaderboardEntry, 'id' | 'createdAt'>,
): Promise<void> {
  const id = `${entry.userId}_${entry.category}`;
  await setDoc(doc(db, 'leaderboard', id), {
    ...entry,
    createdAt: new Date().toISOString(),
  });
}
