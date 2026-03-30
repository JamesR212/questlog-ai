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
    console.log('[sync] pushing to cloud for user:', userId, 'keys:', Object.keys(payload).length);
    await setDoc(doc(db, 'users', userId, 'data', 'store'), {
      ...payload,
      _updatedAt: new Date().toISOString(),
    });
    console.log('[sync] push success');
  } catch (e) {
    console.error('[sync] push error:', e);
  }
}

// Discriminated result: ok=false means a real error — caller must NOT push to cloud
export type PullResult =
  | { ok: true;  data: StoreData | null } // data=null means new user (no doc yet)
  | { ok: false; data: null };             // network/firestore error — do NOT push

async function attemptPull(userId: string): Promise<PullResult> {
  const snap = await getDoc(doc(db, 'users', userId, 'data', 'store'));
  if (!snap.exists()) return { ok: true, data: null };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _updatedAt, ...data } = snap.data();
  return { ok: true, data };
}

// Retries up to 3 times (1s apart) before returning ok:false
export async function pullFromCloud(userId: string): Promise<PullResult> {
  console.log('[sync] pulling from cloud for user:', userId);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await attemptPull(userId);
      console.log('[sync] pull ok on attempt', attempt, '— doc exists:', result.data !== null);
      return result;
    } catch (e) {
      console.warn(`[sync] pull attempt ${attempt}/3 failed:`, e);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.error('[sync] all pull attempts failed — blocking push to protect cloud data');
  return { ok: false, data: null };
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
