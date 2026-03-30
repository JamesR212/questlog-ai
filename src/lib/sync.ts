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

const LAST_PUSH_KEY   = 'questlog-last-push';
const BACKUP_KEY      = 'questlog-backup';      // survives resetGameStore

// ── Data richness score ────────────────────────────────────────────────────
// Higher = more user data. Used to choose between local and cloud when
// timestamps alone are ambiguous, and to guard against pushing empty state.
export function dataScore(state: StoreData): number {
  return (
    ((state.gymPlans       as unknown[])?.length ?? 0) * 10 +
    ((state.habitDefs      as unknown[])?.length ?? 0) * 10 +
    ((state.calendarEvents as unknown[])?.length ?? 0) *  3 +
    ((state.gpsActivities  as unknown[])?.length ?? 0) *  3 +
    ((state.gymSessions    as unknown[])?.length ?? 0) *  2 +
    ((state.mealLog        as unknown[])?.length ?? 0) *  1 +
    ((state.performanceLog as unknown[])?.length ?? 0) *  1 +
    ((state.vices          as unknown[])?.length ?? 0) *  1
  );
}

// ── Backup helpers ─────────────────────────────────────────────────────────
// questlog-backup is written after every successful push and is never wiped
// by resetGameStore (which only touches questlog-storage via Zustand persist).
export function saveBackup(state: StoreData): void {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(sanitise(state)));
  } catch { /* storage full — ignore */ }
}

export function loadBackup(): StoreData | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Push ───────────────────────────────────────────────────────────────────
export async function pushToCloud(userId: string, storeState: StoreData) {
  try {
    const payload = sanitise(storeState);

    // Safety guard: never push a suspiciously empty state that could overwrite
    // good cloud data. If we have a backup with real data and the payload has
    // significantly less, something has gone wrong — skip this push.
    const backup = loadBackup();
    if (backup && dataScore(payload) < dataScore(backup) * 0.3 && dataScore(backup) > 20) {
      console.warn('[sync] push blocked — payload has far less data than backup (score:', dataScore(payload), 'vs backup:', dataScore(backup), '). Possible empty-state bug.');
      return;
    }

    const ts = new Date().toISOString();
    console.log('[sync] pushing to cloud for user:', userId, 'keys:', Object.keys(payload).length, 'score:', dataScore(payload));
    await setDoc(doc(db, 'users', userId, 'data', 'store'), {
      ...payload,
      _updatedAt: ts,
    });
    // Record successful push time and save full backup
    localStorage.setItem(LAST_PUSH_KEY, ts);
    saveBackup(payload);
    console.log('[sync] push success');
  } catch (e) {
    console.error('[sync] push error:', e);
  }
}

// Discriminated result: ok=false means a real error — caller must NOT push to cloud
export type PullResult =
  | { ok: true;  data: StoreData | null; cloudUpdatedAt: string | null } // data=null means new user
  | { ok: false; data: null; cloudUpdatedAt: null };                      // network error — do NOT push

async function attemptPull(userId: string): Promise<PullResult> {
  const snap = await getDoc(doc(db, 'users', userId, 'data', 'store'));
  if (!snap.exists()) return { ok: true, data: null, cloudUpdatedAt: null };
  const { _updatedAt, ...data } = snap.data();
  return { ok: true, data, cloudUpdatedAt: (_updatedAt as string) ?? null };
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
  return { ok: false, data: null, cloudUpdatedAt: null };
}

/** Returns true if local data is more recent than cloud and should be preferred. */
export function localIsNewer(cloudUpdatedAt: string | null): boolean {
  const lastPush = localStorage.getItem(LAST_PUSH_KEY);
  if (!lastPush) return false;          // never pushed — cloud is authoritative
  if (!cloudUpdatedAt) return false;    // new user, no cloud doc
  // Local is newer if the last successful push is more recent than the cloud timestamp.
  // A small grace window (2s) handles clock skew.
  return new Date(lastPush) > new Date(new Date(cloudUpdatedAt).getTime() - 2000);
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
