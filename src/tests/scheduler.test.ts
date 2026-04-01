/**
 * Property-based tests for the GAINN scheduling engine.
 *
 * CRITICAL: These tests mirror the algorithms in gameStore.ts WITHOUT modifying
 * them. The functions under test are treated as "Physical Laws" — the tests
 * only prove their invariants using mathematical properties via fast-check.
 *
 * If a test here fails it means the store algorithm was changed in a way that
 * breaks the SINGLE-TRACK guarantee. Fix the store, not this file.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ─── Minimal type surface ─────────────────────────────────────────────────────

interface MinimalPlan {
  id: string;
  scheduleDays: number[];
}

interface MinimalEvent {
  id: string;
  planId?: string;
  date: string; // YYYY-MM-DD
  title: string;
}

// ─── Pure re-statement of deduplicatePlanDays logic ──────────────────────────
// Mirrors src/store/gameStore.ts — deduplicatePlanDays (lines ~839-858).
// Must stay in sync: if the store algorithm changes, update this mirror too.

function applyDedup(plans: MinimalPlan[]): MinimalPlan[] {
  const claimedDays = new Set<number>();
  return plans.map(plan => {
    if (!Array.isArray(plan.scheduleDays)) return plan;
    const deduped = plan.scheduleDays.filter(d => !claimedDays.has(d));
    deduped.forEach(d => claimedDays.add(d));
    return { ...plan, scheduleDays: deduped };
  });
}

// ─── Pure re-statement of cleanStaleScheduleEvents (day-check path only) ─────
// Mirrors store lines ~860-900 (orphan + DOW check). Title-match check excluded
// here as it depends on runtime string formatting tested via E2E.

function applyStaleClean(
  events: MinimalEvent[],
  plans: MinimalPlan[],
): MinimalEvent[] {
  const planMap = new Map(plans.map(p => [p.id, p]));
  return events.filter(ev => {
    if (!ev.planId) return true; // keep non-plan events
    const plan = planMap.get(ev.planId);
    if (!plan) return false; // orphan — strip it

    // Day check — always parse at T12:00:00 (timezone safety)
    const dow = new Date(ev.date + 'T12:00:00').getDay();
    return plan.scheduleDays.includes(dow);
  });
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const dayArb = fc.integer({ min: 0, max: 6 });
const planIdArb = fc.string({ minLength: 1, maxLength: 8 });

// Generate valid YYYY-MM-DD strings (avoids fc.date() invalid-Date edge cases)
const dateArb = fc.record({
  y: fc.integer({ min: 2025, max: 2027 }),
  m: fc.integer({ min: 1, max: 12 }),
  d: fc.integer({ min: 1, max: 28 }), // cap at 28 — all months have ≥ 28 days
}).map(({ y, m, d }) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
);

const planArb = fc.record({
  id: planIdArb,
  // Unique days per plan (intra-plan dedup is the caller's responsibility)
  scheduleDays: fc.array(dayArb, { maxLength: 7 }).map(days => [...new Set(days)]),
});

const planArrayArb = fc.array(planArb, { maxLength: 10 });

// ─── SINGLE-TRACK invariant tests ────────────────────────────────────────────

describe('deduplicatePlanDays — SINGLE-TRACK invariant', () => {
  /**
   * Core invariant: after dedup, no day-of-week is owned by more than one plan.
   * This is checked ACROSS plans — intra-plan uniqueness is enforced by planArb.
   */
  it('no day-of-week is shared across plans after dedup', () => {
    fc.assert(
      fc.property(planArrayArb, (plans) => {
        const result = applyDedup(plans);
        const dayToPlanCount = new Map<number, number>();

        for (const plan of result) {
          for (const day of plan.scheduleDays) {
            dayToPlanCount.set(day, (dayToPlanCount.get(day) ?? 0) + 1);
          }
        }

        // INVARIANT: every day appears in AT MOST one plan
        for (const [, count] of dayToPlanCount) {
          expect(count).toBe(1);
        }
      }),
      { numRuns: 2000 }
    );
  });

  it('dedup is idempotent — f(f(x)) === f(x)', () => {
    fc.assert(
      fc.property(planArrayArb, (plans) => {
        const once = applyDedup(plans);
        const twice = applyDedup(once);
        expect(twice).toEqual(once);
      }),
      { numRuns: 2000 }
    );
  });

  it('first-come wins — first plan never loses any of its days', () => {
    fc.assert(
      fc.property(
        fc.array(dayArb, { minLength: 1, maxLength: 7 }).map(d => [...new Set(d)]),
        planIdArb,
        (uniqueDays, id) => {
          const plans = [
            { id, scheduleDays: uniqueDays },
            { id: id + '_2', scheduleDays: uniqueDays }, // same days — all should be stripped from plan 2
          ];
          const result = applyDedup(plans);

          expect(result[0].scheduleDays).toEqual(uniqueDays);
          expect(result[1].scheduleDays).toHaveLength(0);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('total day-slots after dedup ≤ total before (monotonic shrink)', () => {
    fc.assert(
      fc.property(planArrayArb, (plans) => {
        const totalBefore = plans.reduce((s, p) => s + p.scheduleDays.length, 0);
        const result = applyDedup(plans);
        const totalAfter = result.reduce((s, p) => s + p.scheduleDays.length, 0);
        expect(totalAfter).toBeLessThanOrEqual(totalBefore);
      }),
      { numRuns: 2000 }
    );
  });

  it('plans with already-disjoint days are left completely unchanged', () => {
    fc.assert(
      fc.property(planArrayArb, (rawPlans) => {
        // Pre-assign each plan a disjoint set of days so no dedup is needed
        const usedDays = new Set<number>();
        const cleanPlans = rawPlans.map(p => {
          const fresh = p.scheduleDays.filter(d => !usedDays.has(d));
          fresh.forEach(d => usedDays.add(d));
          return { ...p, scheduleDays: fresh };
        });

        const result = applyDedup(cleanPlans);
        expect(result).toEqual(cleanPlans);
      }),
      { numRuns: 1000 }
    );
  });
});

// ─── cleanStaleScheduleEvents — invariant tests ───────────────────────────────

const eventArb = (planIds: string[]) =>
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 8 }),
    planId: planIds.length > 0
      ? fc.option(fc.constantFrom(...planIds), { nil: undefined })
      : fc.constant(undefined),
    date: dateArb,
    title: fc.string({ minLength: 1, maxLength: 20 }),
  });

describe('cleanStaleScheduleEvents — invariants', () => {
  it('orphaned events (planId not in plans) are always removed', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 6 }),
          { minLength: 1, maxLength: 4 }
        ).chain(planIds => {
          const ghostId = '__ghost__';
          const plans = planIds.map(id => ({ id, scheduleDays: [0, 1, 2, 3, 4, 5, 6] }));
          return fc.array(eventArb([...planIds, ghostId]), { minLength: 1, maxLength: 15 })
            .map(events => ({ events, plans, ghostId }));
        }),
        ({ events, plans, ghostId }) => {
          const result = applyStaleClean(events, plans);
          expect(result.every(e => e.planId !== ghostId)).toBe(true);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('event on a day the plan does not own is removed; on an owned day it is kept', () => {
    fc.assert(
      fc.property(dayArb, dateArb, (dayOwned, date) => {
        const plan: MinimalPlan = { id: 'p1', scheduleDays: [dayOwned] };
        const ev: MinimalEvent = { id: 'e1', planId: 'p1', date, title: 'session' };
        const eventDow = new Date(date + 'T12:00:00').getDay();

        const result = applyStaleClean([ev], [plan]);

        if (eventDow === dayOwned) {
          expect(result).toHaveLength(1);
        } else {
          expect(result).toHaveLength(0);
        }
      }),
      { numRuns: 1000 }
    );
  });

  it('stale clean is idempotent — f(f(x)) === f(x)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 6 }),
          { minLength: 1, maxLength: 4 }
        ).chain(planIds => {
          const plans = planIds.map((id, i) => ({
            id,
            scheduleDays: [i % 7], // simple deterministic day assignment
          }));
          return fc.array(eventArb(planIds), { maxLength: 15 })
            .map(events => ({ events, plans }));
        }),
        ({ events, plans }) => {
          const once = applyStaleClean(events, plans);
          const twice = applyStaleClean(once, plans);
          expect(twice).toEqual(once);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('non-plan events (no planId) are never removed', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 8 }),
            date: dateArb,
            title: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          { maxLength: 20 }
        ),
        (rawEvents) => {
          const events = rawEvents.map(e => ({ ...e, planId: undefined }));
          const result = applyStaleClean(events, []);
          expect(result).toHaveLength(events.length);
        }
      ),
      { numRuns: 1000 }
    );
  });
});
