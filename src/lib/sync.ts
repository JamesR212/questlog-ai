import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Keys that should NOT be synced (device-specific)
const EXCLUDE_KEYS = new Set([
  'activeSection', 'showLevelUp', 'levelUpMessage',
  'trainingTab', 'googleFitTokens',
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoreData = Record<string, any>;

function sanitise(data: StoreData): StoreData {
  const out: StoreData = {};
  for (const [k, v] of Object.entries(data)) {
    if (!EXCLUDE_KEYS.has(k) && typeof v !== 'function') out[k] = v;
  }
  return out;
}

export async function pushToCloud(userId: string, storeState: StoreData) {
  try {
    const payload = sanitise(storeState);
    await setDoc(doc(db, 'users', userId, 'data', 'store'), {
      ...payload,
      _updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[sync] push error:', e);
  }
}

export async function pullFromCloud(userId: string): Promise<StoreData | null> {
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'data', 'store'));
    if (!snap.exists()) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _updatedAt, ...data } = snap.data();
    return data;
  } catch (e) {
    console.error('[sync] pull error:', e);
    return null;
  }
}

export async function upsertProfile(userId: string, fields: { username?: string; display_name?: string }) {
  try {
    await setDoc(doc(db, 'profiles', userId), {
      ...fields,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.error('[sync] profile error:', e);
  }
}
