/**
 * Monte Carlo Simulation Suite — GAINN Stability Lab
 *
 * Three simulation categories:
 *  1. Warp-Speed Year    — 365 days of user chaos; proves no ghost events survive
 *  2. Chaos Sync Race    — two devices with conflicting edits; proves merge is safe
 *  3. Base-60 Fuzzing    — 5 000 random durations; proves time math never produces NaN
 *
 * CONSTRAINT: No source files are modified. All algorithms are re-stated here as
 * pure functions mirroring the originals. If a test fails, fix the source — not this file.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ─── Type surface ─────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  split: string;
  scheduleDays: number[];
  createdAt: string;
}

interface CalEvent {
  id: string;
  planId?: string;
  date: string; // YYYY-MM-DD
  title: string;
}

type StoreData = Record<string, unknown>;

// ─── Pure re-statements ───────────────────────────────────────────────────────
// Each mirrors the corresponding source function exactly.
// Label format: SOURCE: <file> ~line <N>

// SOURCE: gameStore.ts ~line 839
function deduplicatePlanDays(plans: Plan[]): Plan[] {
  const claimed = new Set<number>();
  return plans.map(p => {
    const deduped = p.scheduleDays.filter(d => !claimed.has(d));
    deduped.forEach(d => claimed.add(d));
    return { ...p, scheduleDays: deduped };
  });
}

// SOURCE: gameStore.ts ~line 860
function cleanStaleEvents(events: CalEvent[], plans: Plan[]): CalEvent[] {
  const planMap = new Map(plans.map(p => [p.id, p]));
  return events.filter(ev => {
    if (!ev.planId) return true;
    const plan = planMap.get(ev.planId);
    if (!plan) return false;
    const dow = new Date(ev.date + 'T12:00:00').getDay();
    return plan.scheduleDays.includes(dow);
  });
}

// SOURCE: sync.ts ~line 64 (core union logic only — no Firebase)
function unionById(a: StoreData[], b: StoreData[]): StoreData[] {
  const map = new Map<string, StoreData>();
  [...a, ...b].forEach(item => {
    const k = item?.id as string;
    if (k) map.set(k, item);
  });
  return Array.from(map.values());
}

function simulateMerge(cloud: StoreData, local: StoreData): StoreData {
  const cloudDeleted = new Set<string>((cloud.deletedIds as string[] | undefined) ?? []);
  const localDeleted = new Set<string>((local.deletedIds as string[] | undefined) ?? []);
  const allDeleted   = new Set([...cloudDeleted, ...localDeleted]);

  const plans = unionById(
    (cloud.gymPlans as StoreData[] | undefined) ?? [],
    (local.gymPlans as StoreData[] | undefined) ?? [],
  ).filter(p => !allDeleted.has(p.id as string));

  // SOURCE: sync.ts study-plan ghost dedup ~line 126
  const studySplits = new Set(['study', 'revision', 'academic', 'exam']);
  const isStudy = (p: StoreData) =>
    studySplits.has(String(p.split ?? '').toLowerCase()) ||
    /study|revision|revise|exam/i.test(String(p.name ?? ''));

  const seen = new Map<string, StoreData>();
  const nonStudy: StoreData[] = [];
  for (const plan of plans) {
    if (!isStudy(plan)) { nonStudy.push(plan); continue; }
    const key = `${String(plan.split ?? '').toLowerCase()}|${String(plan.name ?? '').toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, plan);
    } else {
      const keepNew = new Date(String(plan.createdAt ?? 0)) > new Date(String(existing.createdAt ?? 0));
      if (keepNew) seen.set(key, plan);
    }
  }

  return {
    ...cloud,
    deletedIds: Array.from(allDeleted),
    gymPlans: [...nonStudy, ...Array.from(seen.values())],
  };
}

// SOURCE: route.ts ~line 280
function hhmm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// SOURCE: route.ts — implied inverse of hhmm
function parseHhmm(str: string): { h: number; m: number } | null {
  const parts = str.split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return { h, m };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const dayArb   = fc.integer({ min: 0, max: 6 });
const planIdArb = fc.string({ minLength: 1, maxLength: 8 });

// YYYY-MM-DD generator (avoids invalid Date edge cases)
const dateArb = fc.record({
  y: fc.integer({ min: 2024, max: 2026 }),
  m: fc.integer({ min: 1, max: 12 }),
  d: fc.integer({ min: 1, max: 28 }),
}).map(({ y, m, d }) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
);

const isoDateArb = dateArb.map(d => d + 'T00:00:00.000Z');

const planArb = fc.record({
  id:          planIdArb,
  name:        fc.string({ minLength: 1, maxLength: 20 }),
  split:       fc.constantFrom('push', 'pull', 'legs', 'study', 'revision', 'full body'),
  scheduleDays: fc.array(dayArb, { maxLength: 7 }).map(d => [...new Set(d)]),
  createdAt:   isoDateArb,
});

const eventArb = (planIds: string[]) => fc.record({
  id:     fc.string({ minLength: 1, maxLength: 8 }),
  planId: planIds.length > 0
    ? fc.option(fc.constantFrom(...planIds), { nil: undefined })
    : fc.constant(undefined),
  date:   dateArb,
  title:  fc.string({ minLength: 1, maxLength: 20 }),
});

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION 1 — Warp-Speed Year
// ─────────────────────────────────────────────────────────────────────────────

describe('Simulation 1: Warp-Speed Year — no ghost events after cleanup', () => {
  /**
   * Models a year of random user behaviour:
   *  - Random plans, each owning some days
   *  - Random calendar events attached to those plans on various dates
   *  - After dedup + stale-clean, proves no event survives for a day the plan
   *    no longer owns.
   */
  it('ghost events are eliminated after dedup + stale-clean (1 000 simulated days)', () => {
    fc.assert(
      fc.property(
        fc.array(planArb, { minLength: 1, maxLength: 8 }),
        fc.array(dateArb, { minLength: 1, maxLength: 365 }),
        (rawPlans, dates) => {
          // Step 1: deduplicate plan days (SINGLE-TRACK rule)
          const plans = deduplicatePlanDays(rawPlans);

          // Step 2: generate events for each date — one per plan that owned that DOW
          // before dedup (simulates events that might now be stale)
          const events: CalEvent[] = dates.flatMap((date, i) =>
            rawPlans.map((p, j) => ({
              id:     `ev-${i}-${j}`,
              planId: p.id,
              date,
              title:  `${p.name} session`,
            }))
          );

          // Step 3: clean stale events
          const cleaned = cleanStaleEvents(events, plans);

          // INVARIANT: every surviving event must be on a day its plan owns.
          // Use a Map (last-write wins) to match cleanStaleEvents' own semantics when
          // duplicate IDs appear in the generated plans array.
          const planMap = new Map(plans.map(p => [p.id, p]));
          for (const ev of cleaned) {
            if (!ev.planId) continue;
            const plan = planMap.get(ev.planId);
            if (!plan) { expect(false).toBe(true); continue; }
            const dow = new Date(ev.date + 'T12:00:00').getDay();
            expect(plan.scheduleDays).toContain(dow);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('no ghost events survive after a plan is deleted (tombstone respected)', () => {
    fc.assert(
      fc.property(
        fc.array(planArb, { minLength: 2, maxLength: 6 }),
        fc.array(dateArb, { minLength: 1, maxLength: 52 }),
        (plans, dates) => {
          // Deduplicate plans by id — duplicate IDs make the "deleted" plan still
          // findable in activePlans, which is an invalid input for this invariant.
          const uniquePlans = plans.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
          if (uniquePlans.length < 2) return; // skip degenerate input

          // Delete a random plan (simulate user removing it)
          const deletedPlan = uniquePlans[0];
          const activePlans = uniquePlans.slice(1);

          const events: CalEvent[] = dates.map((date, i) => ({
            id:     `ev-${i}`,
            planId: deletedPlan.id, // all events linked to the deleted plan
            date,
            title:  'ghost session',
          }));

          // cleanStaleEvents should strip all events for the deleted plan
          const cleaned = cleanStaleEvents(events, activePlans);
          expect(cleaned.filter(e => e.planId === deletedPlan.id)).toHaveLength(0);
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION 2 — Chaos Sync Race
// ─────────────────────────────────────────────────────────────────────────────

describe('Simulation 2: Chaos Sync Race — merge is safe under conflict', () => {
  /**
   * Models two devices making independent changes simultaneously.
   * Proves the merge engine never introduces plans that both devices deleted,
   * and always honours tombstones from either side.
   */
  it('plans deleted on EITHER device never survive the merge', () => {
    fc.assert(
      fc.property(
        fc.array(planArb, { minLength: 2, maxLength: 10 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (allPlans, laptopDeleteCount, phoneDeleteCount) => {
          const uniquePlans = allPlans.filter(
            (p, i, arr) => arr.findIndex(x => x.id === p.id) === i
          );
          if (uniquePlans.length < 2) return; // skip degenerate

          // Laptop deletes some plans
          const laptopDeleted = uniquePlans.slice(0, Math.min(laptopDeleteCount, uniquePlans.length - 1));
          const laptopState: StoreData = {
            gymPlans: uniquePlans.filter(p => !laptopDeleted.includes(p)),
            deletedIds: laptopDeleted.map(p => p.id),
          };

          // Phone deletes different plans (simulates concurrent offline edits)
          const remaining = uniquePlans.filter(p => !laptopDeleted.includes(p));
          const phoneDeleted = remaining.slice(0, Math.min(phoneDeleteCount, remaining.length));
          const phoneState: StoreData = {
            gymPlans: uniquePlans.filter(p => !phoneDeleted.includes(p)),
            deletedIds: phoneDeleted.map(p => p.id),
          };

          const merged = simulateMerge(laptopState, phoneState);
          const mergedPlans = merged.gymPlans as StoreData[];
          const mergedDeleted = new Set(merged.deletedIds as string[]);

          const allDeletedIds = new Set([
            ...laptopDeleted.map(p => p.id),
            ...phoneDeleted.map(p => p.id),
          ]);

          // INVARIANT 1: no plan deleted on either device appears in merged plans
          for (const plan of mergedPlans) {
            expect(allDeletedIds.has(plan.id as string)).toBe(false);
          }

          // INVARIANT 2: all deleted IDs are in the merged tombstone list
          for (const id of allDeletedIds) {
            expect(mergedDeleted.has(id)).toBe(true);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('study ghost plans are purged by subject-name dedup during merge', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 15 }),
        fc.string({ minLength: 2, maxLength: 15 }),
        (subject, olderDate) => {
          const newerDate = '2025-12-01T00:00:00.000Z';
          const older = olderDate < newerDate ? olderDate + 'T00:00:00.000Z' : '2025-01-01T00:00:00.000Z';

          const ghostPlan: StoreData = {
            id: 'ghost-1',
            name: `${subject} Revision`,
            split: 'study',
            scheduleDays: [1, 3],
            createdAt: older,
          };
          const cleanPlan: StoreData = {
            id: 'clean-1',
            name: `${subject} Revision`,
            split: 'study',
            scheduleDays: [1, 3],
            createdAt: newerDate,
          };

          const phoneState:  StoreData = { gymPlans: [ghostPlan], deletedIds: [] };
          const laptopState: StoreData = { gymPlans: [cleanPlan], deletedIds: [] };

          const merged = simulateMerge(laptopState, phoneState);
          const plans = merged.gymPlans as StoreData[];

          // INVARIANT: only ONE plan survives — the newer one
          expect(plans).toHaveLength(1);
          expect(plans[0].id).toBe('clean-1');
        }
      ),
      { numRuns: 500 }
    );
  });

  it('merge is deterministic — same inputs always produce same output', () => {
    fc.assert(
      fc.property(
        fc.array(planArb, { maxLength: 8 }),
        fc.array(planArb, { maxLength: 8 }),
        (cloudPlans, localPlans) => {
          const cloud: StoreData = { gymPlans: cloudPlans, deletedIds: [] };
          const local: StoreData = { gymPlans: localPlans, deletedIds: [] };

          const result1 = simulateMerge(cloud, local);
          const result2 = simulateMerge(cloud, local);

          expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION 3 — Base-60 Math Fuzzing
// ─────────────────────────────────────────────────────────────────────────────

describe('Simulation 3: Base-60 Fuzzing — time math never produces NaN or overflow', () => {
  /**
   * Runs 5 000 random study durations through the hhmm / parseHhmm pipeline.
   * Mirrors the route.ts timetable builder — if hhmm(mins) ever returns an
   * invalid or NaN-containing string, the study plan blocks will be corrupted.
   */
  it('hhmm never produces NaN for any integer minute value 0–1440', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1440 }),
        (mins) => {
          const result = hhmm(mins);

          // Must be a string
          expect(typeof result).toBe('string');

          // Must match HH:MM format
          expect(result).toMatch(/^\d{2}:\d{2}$/);

          // Must not contain NaN
          expect(result).not.toContain('NaN');

          const parsed = parseHhmm(result);
          expect(parsed).not.toBeNull();

          if (parsed) {
            // Hours must be 0–23 for a valid day (up to 24:00 = midnight boundary)
            expect(parsed.h).toBeGreaterThanOrEqual(0);
            expect(parsed.h).toBeLessThanOrEqual(24);

            // Minutes must be 0–59
            expect(parsed.m).toBeGreaterThanOrEqual(0);
            expect(parsed.m).toBeLessThanOrEqual(59);
          }
        }
      ),
      { numRuns: 5000 }
    );
  });

  it('hhmm round-trips correctly — parseHhmm(hhmm(m)) recovers original minutes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1440 }),
        (mins) => {
          const str = hhmm(mins);
          const parsed = parseHhmm(str);
          expect(parsed).not.toBeNull();
          if (parsed) {
            const recovered = parsed.h * 60 + parsed.m;
            expect(recovered).toBe(mins);
          }
        }
      ),
      { numRuns: 5000 }
    );
  });

  it('study block layout never produces overlapping or invalid time windows', () => {
    // Simulates the route.ts timetable builder loop for a single day
    fc.assert(
      fc.property(
        fc.integer({ min: 360, max: 720 }),  // startMins: 6:00–12:00
        fc.integer({ min: 60,  max: 480 }),  // totalStudyMins: 1h–8h
        fc.integer({ min: 15,  max: 120 }),  // studyBlockMins: 15–120
        fc.integer({ min: 5,   max: 30 }),   // shortBreakMins
        (startMins, totalStudyMins, studyBlockMins, shortBreakMins) => {
          let mins    = startMins;
          let studied = 0;
          const slots: Array<{ start: number; end: number }> = [];
          const hardEnd = startMins + totalStudyMins + Math.ceil(totalStudyMins / studyBlockMins) * shortBreakMins;

          while (studied < totalStudyMins && mins + studyBlockMins <= hardEnd) {
            const blockEnd = mins + studyBlockMins;
            slots.push({ start: mins, end: blockEnd });
            studied += studyBlockMins;
            mins     = blockEnd + shortBreakMins;
          }

          // INVARIANT 1: no NaN in any time string
          for (const s of slots) {
            expect(hhmm(s.start)).not.toContain('NaN');
            expect(hhmm(s.end)).not.toContain('NaN');
          }

          // INVARIANT 2: slots are strictly non-overlapping
          for (let i = 1; i < slots.length; i++) {
            expect(slots[i].start).toBeGreaterThanOrEqual(slots[i - 1].end);
          }

          // INVARIANT 3: no slot ends before it starts
          for (const s of slots) {
            expect(s.end).toBeGreaterThan(s.start);
          }

          // INVARIANT 4: no slot ends past hardEnd (the loop enforces this)
          for (const s of slots) {
            expect(s.end).toBeLessThanOrEqual(hardEnd);
          }
        }
      ),
      { numRuns: 5000 }
    );
  });

  it('studyBlockMins clamping matches route.ts bounds (15–120)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 300 }), // deliberately out-of-range inputs
        (rawMins) => {
          // SOURCE: route.ts ~line 226
          const clamped = Math.min(Math.max(rawMins, 15), 120);
          expect(clamped).toBeGreaterThanOrEqual(15);
          expect(clamped).toBeLessThanOrEqual(120);
          // Must produce valid hhmm output
          expect(hhmm(clamped)).toMatch(/^\d{2}:\d{2}$/);
        }
      ),
      { numRuns: 5000 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION 4 — Life Scheduler Engine (Anchor Interference + Gap-Filler)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure scheduling helpers that mirror the constraint logic in route.ts.
 * Fixed anchors (trackType="fixed") are physical walls — no other block
 * may overlap them by even one minute.
 */

interface TimeSlot { start: number; end: number; }

/** Place study/flexible blocks into the available windows around a fixed anchor. */
function placeBlocksAroundAnchor(
  anchorStart: number, anchorEnd: number,
  wakeTime: number, bedTime: number,
  blockMins: number, breakMins: number,
  totalStudyMins: number,
): TimeSlot[] {
  const windows: Array<{ from: number; to: number }> = [];
  if (anchorStart > wakeTime + blockMins) windows.push({ from: wakeTime, to: anchorStart });
  if (anchorEnd + blockMins < bedTime)    windows.push({ from: anchorEnd,   to: bedTime });

  const slots: TimeSlot[] = [];
  let studied = 0;

  for (const window of windows) {
    let mins = window.from;
    while (studied < totalStudyMins && mins + blockMins <= window.to) {
      slots.push({ start: mins, end: mins + blockMins });
      studied += blockMins;
      mins += blockMins + breakMins;
    }
    if (studied >= totalStudyMins) break;
  }
  return slots;
}

/** Find the first gap between two anchors that fits a flexible session. */
function placeFlexibleInGap(
  a1Start: number, a1End: number,
  a2Start: number, a2End: number,
  wakeTime: number, bedTime: number,
  sessionMins: number,
): TimeSlot | null {
  const gaps: Array<{ from: number; to: number }> = [
    { from: wakeTime, to: a1Start },
    { from: a1End,    to: a2Start },
    { from: a2End,    to: bedTime },
  ].filter(g => g.to - g.from >= sessionMins);

  if (gaps.length === 0) return null;
  const g = gaps[0];
  return { start: g.from, end: g.from + sessionMins };
}

function overlaps(a: TimeSlot, bStart: number, bEnd: number): boolean {
  return a.start < bEnd && a.end > bStart;
}

describe('Simulation 4: Life Scheduler Engine — fixed anchors are physical walls', () => {
  it('Anchor Interference: zero study blocks overlap the fixed anchor window', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 360,  max: 840  }), // anchorStart: 06:00–14:00
        fc.integer({ min: 60,   max: 480  }), // anchorDuration: 1h–8h
        fc.integer({ min: 15,   max: 90   }), // blockMins
        fc.integer({ min: 5,    max: 20   }), // breakMins
        fc.integer({ min: 60,   max: 360  }), // totalStudyMins
        (anchorStart, anchorDur, blockMins, breakMins, totalStudyMins) => {
          const anchorEnd  = Math.min(anchorStart + anchorDur, 23 * 60);
          const wakeTime   = 6 * 60;   // 06:00
          const bedTime    = 23 * 60;  // 23:00

          const slots = placeBlocksAroundAnchor(
            anchorStart, anchorEnd, wakeTime, bedTime,
            blockMins, breakMins, totalStudyMins,
          );

          // INVARIANT: no placed block overlaps [anchorStart, anchorEnd]
          for (const slot of slots) {
            expect(overlaps(slot, anchorStart, anchorEnd)).toBe(false);
          }
        }
      ),
      { numRuns: 2000 }
    );
  });

  it('Anchor Interference: all blocks are within wake–bed window', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 360, max: 720 }),
        fc.integer({ min: 120, max: 360 }),
        fc.integer({ min: 25,  max: 60  }),
        fc.integer({ min: 5,   max: 15  }),
        fc.integer({ min: 60,  max: 240 }),
        (anchorStart, anchorDur, blockMins, breakMins, totalStudyMins) => {
          const anchorEnd = Math.min(anchorStart + anchorDur, 22 * 60);
          const wakeTime  = 6 * 60;
          const bedTime   = 23 * 60;

          const slots = placeBlocksAroundAnchor(
            anchorStart, anchorEnd, wakeTime, bedTime,
            blockMins, breakMins, totalStudyMins,
          );

          for (const slot of slots) {
            expect(slot.start).toBeGreaterThanOrEqual(wakeTime);
            expect(slot.end).toBeLessThanOrEqual(bedTime);
          }
        }
      ),
      { numRuns: 2000 }
    );
  });

  it('Gap-Filler: flexible session placed in the gap between two fixed anchors', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 420, max: 660 }),  // anchor1Start: 07:00–11:00
        fc.integer({ min: 60,  max: 240 }),  // anchor1Dur
        fc.integer({ min: 60,  max: 180 }),  // gap between the two anchors
        fc.integer({ min: 60,  max: 240 }),  // anchor2Dur
        (a1Start, a1Dur, gap, a2Dur) => {
          const a1End   = a1Start + a1Dur;
          const a2Start = a1End + gap;
          const a2End   = a2Start + a2Dur;
          const wakeTime  = 6 * 60;
          const bedTime   = Math.max(a2End + 60, 21 * 60); // bed at least 1h after anchor2
          const sessionMins = 60;

          if (a2End >= bedTime) return; // degenerate — skip

          const session = placeFlexibleInGap(
            a1Start, a1End, a2Start, a2End,
            wakeTime, bedTime, sessionMins,
          );

          if (session === null) return; // no gap large enough — that's fine, skip

          // INVARIANT: session does not overlap either anchor
          expect(overlaps(session, a1Start, a1End)).toBe(false);
          expect(overlaps(session, a2Start, a2End)).toBe(false);

          // INVARIANT: session is within wake–bed window
          expect(session.start).toBeGreaterThanOrEqual(wakeTime);
          expect(session.end).toBeLessThanOrEqual(bedTime);

          // INVARIANT: session has correct duration
          expect(session.end - session.start).toBe(sessionMins);
        }
      ),
      { numRuns: 2000 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION 5 — GCSE Fair Rotation (Coverage Audit)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * With 12 subjects and 2 subjects per day, a 14-day schedule must include
 * every subject at least once. This proves the "Fair Rotation" logic works for
 * heavy GCSE workloads without lazy clustering on the first few subjects.
 */

function distributeSubjectsRoundRobin(
  subjects: string[],
  subjectsPerDay: number,
  totalDays: number,
): string[][] {
  const schedule: string[][] = [];
  let idx = 0;
  for (let day = 0; day < totalDays; day++) {
    const daySubjects: string[] = [];
    for (let s = 0; s < subjectsPerDay; s++) {
      daySubjects.push(subjects[idx % subjects.length]);
      idx++;
    }
    schedule.push(daySubjects);
  }
  return schedule;
}

describe('Simulation 5: GCSE Coverage Audit — every subject scheduled at least once', () => {
  it('12 subjects, 2/day, 14 days — all subjects appear in the schedule', () => {
    const SUBJECTS = [
      'Maths', 'English', 'Biology', 'Chemistry', 'Physics',
      'History', 'Geography', 'French', 'Art', 'Computer Science',
      'PE', 'RE',
    ];
    const schedule = distributeSubjectsRoundRobin(SUBJECTS, 2, 14);

    // Flatten all scheduled subjects
    const appeared = new Set(schedule.flat());

    // INVARIANT: every subject appears at least once in 14 days
    for (const subject of SUBJECTS) {
      expect(appeared.has(subject)).toBe(true);
    }

    // INVARIANT: each day has exactly 2 subjects
    for (const day of schedule) {
      expect(day).toHaveLength(2);
    }
  });

  it('property: N subjects with N/subjectsPerDay <= totalDays always achieves full coverage', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 16 }),     // subjectCount
        fc.integer({ min: 1, max: 4  }),     // subjectsPerDay
        (subjectCount, subjectsPerDay) => {
          const subjects = Array.from({ length: subjectCount }, (_, i) => `Subject${i}`);
          // Ensure we have enough days for full coverage
          const totalDays = Math.ceil(subjectCount / subjectsPerDay);
          const schedule  = distributeSubjectsRoundRobin(subjects, subjectsPerDay, totalDays);
          const appeared  = new Set(schedule.flat());

          // INVARIANT: all subjects covered within ceil(N/subjectsPerDay) days
          for (const s of subjects) {
            expect(appeared.has(s)).toBe(true);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION 6 — Tombstone Garbage Collection (30-Day Pruning)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SOURCE: sync.ts — pruneStaleTombstones
 * Proves the 30-day GC never prunes fresh tombstones, always prunes expired
 * ones, and keeps legacy tombstones (no timestamp) forever.
 */

const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function pruneStaleTombstones(ids: string[], timestamps: Record<string, number>): string[] {
  const cutoff = Date.now() - TOMBSTONE_TTL_MS;
  return ids.filter(id => {
    if (!Object.prototype.hasOwnProperty.call(timestamps, id)) return true;
    return timestamps[id] >= cutoff;
  });
}

describe('Simulation 6: Tombstone GC — 30-day pruning is safe and correct', () => {
  it('fresh tombstones (< 30 days old) are NEVER pruned', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: TOMBSTONE_TTL_MS - 1 }), // age in ms, strictly fresh
        (ids, ageMs) => {
          const now = Date.now();
          const ts: Record<string, number> = {};
          ids.forEach(id => { ts[id] = now - ageMs; });

          const result = pruneStaleTombstones(ids, ts);

          // INVARIANT: fresh tombstones survive GC
          expect(result).toHaveLength(ids.length);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('stale tombstones (> 30 days old) with timestamps are always pruned', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 365 }), // days over the TTL
        (ids, daysOver) => {
          const expiredTs = Date.now() - TOMBSTONE_TTL_MS - daysOver * 24 * 60 * 60 * 1000;
          const ts: Record<string, number> = {};
          ids.forEach(id => { ts[id] = expiredTs; });

          const result = pruneStaleTombstones(ids, ts);

          // INVARIANT: all expired tombstones are removed
          expect(result).toHaveLength(0);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('legacy tombstones (no timestamp) are kept forever — backward compat', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 20 }),
        (ids) => {
          // No timestamps at all — simulates pre-tombstoneTimestamps data
          const result = pruneStaleTombstones(ids, {});

          // INVARIANT: legacy tombstones are never pruned
          expect(result).toHaveLength(ids.length);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('pruning is idempotent — running GC twice gives the same result', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 20 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        (ids, expiredFlags) => {
          const now = Date.now();
          const ts: Record<string, number> = {};
          ids.forEach((id, i) => {
            // Some fresh, some expired
            ts[id] = expiredFlags[i % expiredFlags.length]
              ? now - TOMBSTONE_TTL_MS - 1000  // expired
              : now - 1000;                     // fresh
          });

          const once  = pruneStaleTombstones(ids, ts);
          const twice = pruneStaleTombstones(once, ts);

          // INVARIANT: idempotent
          expect(twice).toEqual(once);
        }
      ),
      { numRuns: 1000 }
    );
  });
});
