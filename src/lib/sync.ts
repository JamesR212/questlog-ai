import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Keys that should NOT be synced (device-specific UI state)
const EXCLUDE_KEYS = new Set([
  'activeSection', 'showLevelUp', 'levelUpMessage',
  'trainingTab', 'nutritionTab', 'googleFitTokens',
  'shareLocation',
  'userId', 'syncStatus', // runtime-only — set fresh on every login
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoreData = Record<string, any>;

// Recursively remove undefined values — Firestore rejects any field set to undefined.
// JSON round-trip is the simplest reliable way: undefined values are dropped by JSON.stringify.
function stripUndefined(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripUndefined);
  const out: StoreData = {};
  for (const [k, v] of Object.entries(value as StoreData)) {
    if (v !== undefined) out[k] = stripUndefined(v);
  }
  return out;
}

export function sanitise(data: StoreData): StoreData {
  const out: StoreData = {};
  for (const [k, v] of Object.entries(data)) {
    if (!EXCLUDE_KEYS.has(k) && typeof v !== 'function') out[k] = stripUndefined(v);
  }
  return out;
}

const LAST_PUSH_KEY   = 'questlog-last-push';
const BACKUP_KEY      = 'questlog-backup';      // survives resetGameStore

// ── Data richness score ────────────────────────────────────────────────────
// Higher = more user data. Used to guard against pushing empty state.
export function dataScore(state: StoreData): number {
  return (
    ((state.gymPlans        as unknown[])?.length ?? 0) * 10 +
    ((state.habitDefs       as unknown[])?.length ?? 0) * 10 +
    ((state.calendarEvents  as unknown[])?.length ?? 0) *  3 +
    ((state.gpsActivities   as unknown[])?.length ?? 0) *  3 +
    ((state.gymSessions     as unknown[])?.length ?? 0) *  2 +
    ((state.habitLog        as unknown[])?.length ?? 0) *  2 +
    ((state.mealLog         as unknown[])?.length ?? 0) *  1 +
    ((state.stepLog         as unknown[])?.length ?? 0) *  1 +
    ((state.sleepLog        as unknown[])?.length ?? 0) *  1 +
    ((state.waterLog        as unknown[])?.length ?? 0) *  1 +
    ((state.weightLog       as unknown[])?.length ?? 0) *  1 +
    ((state.performanceLog  as unknown[])?.length ?? 0) *  1 +
    ((state.vices           as unknown[])?.length ?? 0) *  1 +
    ((state.stats as StoreData)?.xp  as number  ?? 0) / 100  // XP as tiebreaker
  );
}

// ── Smart merge ────────────────────────────────────────────────────────────
// Instead of picking local OR cloud (all-or-nothing), merge them so that
// log entries from both devices are preserved. Arrays are unioned by `id`
// (or `date` for date-keyed entries). Scalar preferences prefer cloud.
// This is the correct behaviour for one user on multiple devices.
export function mergeStates(cloud: StoreData, local: StoreData): StoreData {
  // Helper: union two arrays deduplicating by a key field
  const unionBy = (a: StoreData[], b: StoreData[], key: string): StoreData[] => {
    const map = new Map<string, StoreData>();
    // cloud entries first, then local overrides (local is more recent on this device)
    [...(a ?? []), ...(b ?? [])].forEach(item => {
      const k = item?.[key] as string;
      if (k) map.set(k, item);
    });
    return Array.from(map.values());
  };

  // Arrays that are log entries — union both sides so nothing is lost
  const LOG_ARRAYS_BY_ID: string[] = [
    'gymSessions', 'habitLog', 'mealLog', 'sleepLog', 'vices',
    'calendarEvents', 'gpsActivities', 'performanceLog',
    'bodyCompositionLog', 'wakeQuest',
  ];
  const LOG_ARRAYS_BY_DATE: string[] = ['stepLog', 'waterLog', 'weightLog'];

  // Definition arrays — union so neither device loses a plan/habit
  const DEF_ARRAYS_BY_ID: string[] = [
    'gymPlans', 'habitDefs', 'performanceStats',
    'subscriptions', 'budgetItems', 'spendingLog', 'paycheckLog',
    'viceDefs', 'savedMeals',
  ];

  // ── Tombstones: union deleted IDs from both sides ──────────────────────────
  // Any ID that was intentionally deleted on EITHER device must stay deleted.
  const cloudDeleted = new Set<string>((cloud.deletedIds as string[] | undefined) ?? []);
  const localDeleted = new Set<string>((local.deletedIds as string[] | undefined) ?? []);
  const allDeleted   = new Set<string>([...cloudDeleted, ...localDeleted]);

  const merged: StoreData = { ...cloud }; // start with cloud as base
  merged.deletedIds = Array.from(allDeleted); // union tombstones

  LOG_ARRAYS_BY_ID.forEach(key => {
    const c = cloud[key] as StoreData[] | undefined;
    const l = local[key] as StoreData[] | undefined;
    if (Array.isArray(c) || Array.isArray(l)) {
      merged[key] = unionBy(c ?? [], l ?? [], 'id').filter(item => !allDeleted.has(item?.id as string));
    }
  });

  LOG_ARRAYS_BY_DATE.forEach(key => {
    const c = cloud[key] as StoreData[] | undefined;
    const l = local[key] as StoreData[] | undefined;
    if (Array.isArray(c) || Array.isArray(l)) {
      merged[key] = unionBy(c ?? [], l ?? [], 'date').filter(item => !allDeleted.has(item?.id as string));
    }
  });

  DEF_ARRAYS_BY_ID.forEach(key => {
    const c = cloud[key] as StoreData[] | undefined;
    const l = local[key] as StoreData[] | undefined;
    if (Array.isArray(c) || Array.isArray(l)) {
      merged[key] = unionBy(c ?? [], l ?? [], 'id').filter(item => !allDeleted.has(item?.id as string));
    }
  });

  // ── Study-plan ghost dedup ─────────────────────────────────────────────────
  // After the ID-union, study plans from a stale device can survive as duplicates
  // even after tombstoning (if they were deleted before the deletedIds system existed).
  // Secondary pass: for study/revision plans that share the same split+name, keep only
  // the most recently created one. Gym/sport plans are left untouched.
  if (Array.isArray(merged.gymPlans)) {
    const studySplits = new Set(['study', 'revision', 'academic', 'exam']);
    const isStudyPlan = (p: StoreData) =>
      studySplits.has(String(p.split ?? '').toLowerCase()) ||
      /study|revision|revise|exam/i.test(String(p.name ?? ''));

    const seen = new Map<string, StoreData>();
    const nonStudy: StoreData[] = [];
    for (const plan of merged.gymPlans as StoreData[]) {
      if (!isStudyPlan(plan)) { nonStudy.push(plan); continue; }
      const key = `${String(plan.split ?? '').toLowerCase().trim()}|${String(plan.name ?? '').toLowerCase().trim()}`;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, plan);
      } else {
        // Keep whichever has the more recent createdAt
        const keepNew = new Date(String(plan.createdAt ?? 0)) > new Date(String(existing.createdAt ?? 0));
        if (keepNew) seen.set(key, plan);
      }
    }
    merged.gymPlans = [...nonStudy, ...Array.from(seen.values())];
  }

  // Stats: take the higher values — XP/level/stats only ever go up
  const cs = (cloud.stats ?? {}) as StoreData;
  const ls = (local.stats ?? {}) as StoreData;
  if (cs || ls) {
    merged.stats = {
      ...cs,
      xp:    Math.max(Number(cs.xp    ?? 0), Number(ls.xp    ?? 0)),
      level: Math.max(Number(cs.level ?? 1), Number(ls.level ?? 1)),
      str:   Math.max(Number(cs.str   ?? 0), Number(ls.str   ?? 0)),
      con:   Math.max(Number(cs.con   ?? 0), Number(ls.con   ?? 0)),
      dex:   Math.max(Number(cs.dex   ?? 0), Number(ls.dex   ?? 0)),
      gold:  Math.max(Number(cs.gold  ?? 0), Number(ls.gold  ?? 0)),
    };
  }

  return merged;
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

// Force push — bypasses the data-score safety guard.
// Only used for the manual "I am the truth" button. Never call from auto-sync.
export async function forcePushToCloud(userId: string, storeState: StoreData) {
  try {
    const payload = sanitise(storeState);
    const ts = new Date().toISOString();
    await setDoc(doc(db, 'users', userId, 'data', 'store'), {
      ...payload,
      _updatedAt: ts,
    });
    localStorage.setItem(LAST_PUSH_KEY, ts);
    saveBackup(payload);
    console.log('[sync] force push success');
  } catch (e) {
    console.error('[sync] force push error:', e);
    throw e;
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
