'use client';

import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import AIAdvisor from '../shared/AIAdvisor';
import type { HabitDef } from '@/types';
import HabitEmoji from '../shared/HabitEmoji';
import CalendarPage from '../calendar/CalendarPage';

function computeStreak(
  gymLog: { date: string }[],
  checkIns: { date: string }[],
  vices: { date: string }[]
): number {
  const activeDays = new Set<string>();
  [...gymLog, ...checkIns, ...vices].forEach((e) =>
    activeDays.add(new Date(e.date).toDateString())
  );

  let streak = 0;
  const d = new Date();
  if (!activeDays.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (activeDays.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekDates(): string[] {
  const today = new Date();
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return dateStr(d);
  });
}

function isWeekA(ds: string, createdAt: string): boolean {
  const getMonday = (d: Date) => { const dd = new Date(d); dd.setDate(dd.getDate() - (dd.getDay() === 0 ? 6 : dd.getDay() - 1)); dd.setHours(0,0,0,0); return dd; };
  const weeks = Math.round((getMonday(new Date(ds + 'T00:00:00')).getTime() - getMonday(new Date(createdAt)).getTime()) / (7*24*60*60*1000));
  return weeks % 2 === 0;
}

function isDueOn(habit: HabitDef, ds: string): boolean {
  const dow = new Date(ds + 'T00:00:00').getDay();
  if (habit.scheduleType === 'fortnightly') {
    return isWeekA(ds, habit.createdAt) ? habit.scheduleDays.includes(dow) : (habit.scheduleWeekBDays ?? []).includes(dow);
  }
  return (habit.scheduleDays ?? []).includes(dow);
}

// ─── Weekly Snapshot Grid ─────────────────────────────────────────────────────
function WeeklySnapshotGrid() {
  const {
    habitDefs, habitLog, wakeQuest, stepLog, stepGoal, mealLog, nutritionGoal,
    waterLog, waterGoal, gpsActivities,
    snapshotHiddenBuiltins, snapshotAddedOptional, accountCreatedDate,
    setSnapshotHiddenBuiltins, setSnapshotAddedOptional,
    logHabit, unlogHabit, logSteps, deleteMeal, logMeal, addWaterEntry, deleteWaterEntry,
    checkInWake, deleteWakeCheckIn,
    detailCellOverrides, setDetailCellOverride,
    disabledSections,
  } = useGameStore();

  const weekDates = getWeekDates();
  const today     = todayStr();
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  type RowId = string;
  const hiddenBuiltins = new Set(snapshotHiddenBuiltins);
  const addedOptional  = new Set(snapshotAddedOptional);
  const [showEdit, setShowEdit]           = useState(false);
  const [showYear, setShowYear]           = useState(false);
  const [viewYear,  setViewYear]  = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth()); // 0-based
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [containerW, setContainerW] = useState(0);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setContainerW(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [showYear]);

  type Row = { id: RowId; emoji: string; label: string; type: 'sleep' | 'wake' | 'habit' | 'steps' | 'nutrition' | 'hydration' | 'activity'; activityKey?: string };

  const builtinRows: Row[] = ([
    { id: '__sleep__',     emoji: '🌙', label: 'Sleep',     type: 'sleep'     as const, section: 'sleep'     },
    { id: '__steps__',     emoji: '👟', label: 'Steps',     type: 'steps'     as const, section: 'steps'     },
    { id: '__wake__',      emoji: '🌅', label: 'Wake Up',   type: 'wake'      as const, section: 'wake'      },
    { id: '__nutrition__', emoji: '🥗', label: 'Nutrition', type: 'nutrition' as const, section: 'food'      },
    { id: '__hydration__', emoji: '💧', label: 'Hydration', type: 'hydration' as const, section: 'hydration' },
  ] as (Row & { section: string })[]).filter(r => !disabledSections.includes(r.section));
  const optionalRows: Row[] = [
    ...habitDefs.map(h => ({ id: h.id, emoji: h.emoji, label: h.name, type: 'habit' as const })),
  ];

  // Activity rows — auto-generated from logged GPS activities (one row per unique activity type)
  const ACTIVITY_EMOJI: Record<string, string> = {
    run: '🏃', walk: '🚶', cycle: '🚴',
    yoga: '🧘', pilates: '🤸', hiit: '💪', swim: '🏊', swimming: '🏊',
    tennis: '🎾', football: '⚽', basketball: '🏀', rugby: '🏉', golf: '⛳',
  };
  const ACTIVITY_LABEL: Record<string, string> = {
    run: 'Running', walk: 'Walking', cycle: 'Cycling',
  };
  function getActivityKey(a: { type: string; activityName?: string }): string {
    if (a.type !== 'other') return a.type;
    return (a.activityName ?? 'activity').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  const activityRows: Row[] = (() => {
    const seen = new Map<string, { type: string; activityName?: string }>();
    for (const a of (gpsActivities ?? [])) {
      const k = getActivityKey(a);
      if (!seen.has(k)) seen.set(k, a);
    }
    return Array.from(seen.entries()).map(([k, a]) => {
      const name = a.activityName ?? '';
      const label = ACTIVITY_LABEL[k] ?? (name ? name.charAt(0).toUpperCase() + name.slice(1) : k.charAt(0).toUpperCase() + k.slice(1));
      return { id: `__activity_${k}__`, emoji: ACTIVITY_EMOJI[k] ?? '⚡', label, type: 'activity' as const, activityKey: k };
    });
  })();

  const allRows: Row[] = [
    ...builtinRows.filter(r => !hiddenBuiltins.has(r.id)),
    ...optionalRows.filter(r => addedOptional.has(r.id)),
    ...activityRows,
  ];
  // allRows including hidden builtins — used for year view
  const allRowsForYear: Row[] = [
    ...builtinRows,
    ...optionalRows.filter(r => addedOptional.has(r.id)),
    ...activityRows,
  ];

  type CellState = 'done' | 'late' | 'missed' | 'unscheduled' | 'future';

  function cellState(row: Row, ds: string): CellState {
    const isFuture = ds > today;

    if (row.type === 'steps') {
      if (isFuture) return 'future';
      const entry = stepLog.find(e => e.date === ds);
      if (!entry) return 'unscheduled';
      if (entry.steps >= stepGoal)       return 'done';
      if (entry.steps >= stepGoal * 0.5) return 'late';
      return 'missed';
    }

    if (row.type === 'wake') {
      const checkIn = wakeQuest.checkIns.find(c => c.date === ds);
      if (!checkIn) return isFuture ? 'future' : 'missed';
      return checkIn.onTime ? 'done' : 'late';
    }

    if (row.type === 'sleep') {
      const d = new Date(ds + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      const nextDay = dateStr(d);
      if (nextDay > today) return 'future';
      const nextCheckIn = wakeQuest.checkIns.find(c => c.date === nextDay);
      if (!nextCheckIn) return 'missed';
      return nextCheckIn.onTime ? 'done' : 'late';
    }

    if (row.type === 'nutrition') {
      if (isFuture) return 'future';
      const dayMeals = mealLog.filter(m => m.date === ds);
      if (dayMeals.length === 0) return 'unscheduled';
      const totalCal = dayMeals.reduce((s, m) => s + m.calories, 0);
      if (totalCal >= nutritionGoal.calories * 0.8) return 'done';
      if (totalCal >= nutritionGoal.calories * 0.4) return 'late';
      return 'missed';
    }

    if (row.type === 'hydration') {
      if (isFuture) return 'future';
      const total = waterLog.filter(e => e.date === ds).reduce((s, e) => s + e.amount, 0);
      if (total === 0) return 'unscheduled';
      if (total >= waterGoal * 0.8) return 'done';
      if (total >= waterGoal * 0.4) return 'late';
      return 'missed';
    }

    if (row.type === 'activity') {
      if (isFuture) return 'future';
      const key = row.activityKey ?? '';
      const did = (gpsActivities ?? []).some(a => {
        const aDate = (a.startTime ?? '').slice(0, 10);
        return aDate === ds && getActivityKey(a) === key;
      });
      return did ? 'done' : 'unscheduled';
    }

    // habit
    const habit = habitDefs.find(h => h.id === row.id);
    if (!habit) return 'unscheduled';
    if (!isDueOn(habit, ds)) return 'unscheduled';
    if (isFuture) return 'future';
    return habitLog.some(e => e.habitId === row.id && e.date === ds) ? 'done' : 'missed';
  }

  function toggleCell(row: Row, ds: string) {
    const state = cellState(row, ds);
    if (state === 'future') return;
    if (row.type === 'activity') return; // read-only — logged via AI or GPS tracker
    if (row.type === 'wake' || row.type === 'sleep') {
      const checkIn = wakeQuest.checkIns.find(c => c.date === ds);
      if (checkIn) deleteWakeCheckIn(checkIn.id);
      else checkInWake(wakeQuest.targetTime, ds);
    } else if (row.type === 'steps') {
      const entry = stepLog.find(e => e.date === ds);
      if (entry) logSteps(ds, 0, 'manual');
      else logSteps(ds, stepGoal, 'manual');
    } else if (row.type === 'nutrition') {
      const entries = mealLog.filter(m => m.date === ds);
      if (entries.length > 0) entries.forEach(m => deleteMeal(m.id));
      else logMeal({ name: 'Logged', calories: nutritionGoal.calories, protein: 0, carbs: 0, fat: 0, sugar: 0 }, ds);
    } else if (row.type === 'hydration') {
      const entries = waterLog.filter(e => e.date === ds);
      if (entries.length > 0) entries.forEach(e => deleteWaterEntry(e.id));
      else addWaterEntry(ds, waterGoal);
    } else if (row.type === 'habit') {
      const done = habitLog.some(e => e.habitId === row.id && e.date === ds);
      if (done) unlogHabit(row.id, ds);
      else logHabit(row.id, ds);
    }
  }

  function cycleDetailCell(row: Row, ds: string) {
    const key = `${row.id}_${ds}`;
    const cur = detailCellOverrides[key];
    if (cur === undefined) setDetailCellOverride(key, 'done');
    else if (cur === 'done') setDetailCellOverride(key, 'late');
    else if (cur === 'late') setDetailCellOverride(key, 'missed');
    else if (cur === 'missed') setDetailCellOverride(key, 'unscheduled');
    else setDetailCellOverride(key, null);
  }

  const stateStyle: Record<CellState, string> = {
    done:        'bg-emerald-500',
    late:        'bg-amber-400',
    missed:      'bg-red-500/70',
    unscheduled: 'bg-ql-surface3/40',
    future:      'bg-ql-surface3/20',
  };

  // ── Weekly accuracy (green=100, amber=50, red/missed=0) ───────────────────
  const weeklyAccuracy = (() => {
    let pts = 0, n = 0;
    for (const row of allRows) {
      for (const ds of weekDates) {
        if (ds > today) continue;
        const s = cellState(row, ds);
        if (s === 'unscheduled' || s === 'future') continue;
        n++;
        if (s === 'done')      pts += 100;
        else if (s === 'late') pts += 50;
        // missed / red = 0
      }
    }
    return n > 0 ? Math.round(pts / n) : null;
  })();
  const accColor = weeklyAccuracy === null ? '#888'
    : weeklyAccuracy >= 75 ? '#22c55e'
    : weeklyAccuracy >= 40 ? '#fbbf24'
    : '#ef4444';

  const toggleBuiltin = (id: RowId) => {
    const next = new Set(snapshotHiddenBuiltins);
    next.has(id) ? next.delete(id) : next.add(id);
    setSnapshotHiddenBuiltins([...next]);
  };
  const toggleOptional = (id: RowId) => {
    const next = new Set(snapshotAddedOptional);
    next.has(id) ? next.delete(id) : next.add(id);
    setSnapshotAddedOptional([...next]);
  };

  // ── Yearly snapshot data ──────────────────────────────────────────────────

  // Build a 52/53-week grid for the current year
  const yearGrid = (() => {
    const year = new Date().getFullYear();
    const jan1 = new Date(year, 0, 1);
    // Start on the Monday of the week containing Jan 1
    const startOffset = (jan1.getDay() + 6) % 7; // Mon=0
    const gridStart = new Date(jan1);
    gridStart.setDate(jan1.getDate() - startOffset);

    const weeks: (string | null)[][] = []; // weeks[weekIdx][dayIdx 0=Mon..6=Sun]
    const monthLabels: { weekIdx: number; label: string }[] = [];

    let cur = new Date(gridStart);
    let seenMonths = new Set<number>();
    while (cur.getFullYear() <= year) {
      const week: (string | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const ds = dateStr(cur);
        const inYear = cur.getFullYear() === year;
        week.push(inYear ? ds : null);
        // Mark month label on first week that has a day in this month
        const m = cur.getMonth();
        if (inYear && !seenMonths.has(m) && d === 0) {
          seenMonths.add(m);
          monthLabels.push({ weekIdx: weeks.length, label: cur.toLocaleDateString('en-GB', { month: 'short' }) });
        }
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
      if (cur.getFullYear() > year) break;
    }
    return { weeks, monthLabels };
  })();

  // Aggregate day completion for yearly view
  function dayCompletion(ds: string): 'none' | 'low' | 'mid' | 'high' | 'full' | 'future' | 'empty' {
    if (ds > today) return 'future';
    let scheduled = 0; let done = 0; let late = 0;
    allRowsForYear.forEach(row => {
      const s = cellState(row, ds);
      if (s === 'unscheduled' || s === 'future') return;
      scheduled++;
      if (s === 'done') done++;
      else if (s === 'late') late++;
    });
    if (scheduled === 0) return 'empty';
    const ratio = (done + late * 0.5) / scheduled;
    if (ratio === 0)   return 'none';
    if (ratio < 0.35)  return 'low';
    if (ratio < 0.65)  return 'mid';
    if (ratio < 0.95)  return 'high';
    return 'full';
  }

  const yearCellStyle: Record<string, string> = {
    full:   'bg-emerald-400',
    high:   'bg-emerald-600',
    mid:    'bg-amber-400',
    low:    'bg-red-500/60',
    none:   'bg-red-700/50',
    future: 'bg-ql-surface3/15',
    empty:  'bg-ql-surface3/15',
  };

  return (
    <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* Accuracy ring */}
          {!disabledSections.includes('stats') && weeklyAccuracy !== null && (() => {
            const R = 17.5, C = 22.5, circ = 2 * Math.PI * R;
            return (
              <svg width="45" height="45" viewBox="0 0 45 45" style={{ display: 'block', flexShrink: 0 }}>
                <circle cx={C} cy={C} r={R} fill="none" stroke="var(--ql-surface-3)" strokeWidth="5.5" />
                <circle cx={C} cy={C} r={R} fill="none" stroke={accColor} strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeDasharray={`${circ}`}
                  strokeDashoffset={`${circ * (1 - weeklyAccuracy / 100)}`}
                  transform={`rotate(-90 ${C} ${C})`}
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
                <text x={C} y={C + 4} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={accColor}>
                  {weeklyAccuracy}
                </text>
              </svg>
            );
          })()}
          <div>
            <p className="text-ql text-sm font-semibold">Weekly Snapshot</p>
            {!disabledSections.includes('stats') && weeklyAccuracy !== null && (
              <p className="text-[10px] font-semibold" style={{ color: accColor }}>
                {weeklyAccuracy}% goals achieved this week
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowYear(true)}
            className="text-ql-3 text-xs border border-ql rounded-xl px-3 py-1"
          >
            Detailed
          </button>
          <button
            onClick={() => setShowEdit(true)}
            className="text-ql-3 text-xs border border-ql rounded-xl px-3 py-1"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-1.5">
        {/* Day-column headers */}
        <div className="flex items-center gap-1">
          <div className="w-24 shrink-0" />
          {weekDates.map((ds, i) => {
            const isToday = ds === today;
            return (
              <div key={ds} className="flex-1 text-center">
                <span className={`text-[10px] font-semibold ${isToday ? 'text-ql-accent' : 'text-ql-3'}`}>
                  {DAY_LABELS[i]}
                </span>
              </div>
            );
          })}
        </div>

        {/* One row per visible row */}
        {allRows.map(row => (
          <div key={row.id} className="flex items-center gap-1">
            {/* Row label */}
            <div
              className="w-24 shrink-0 flex items-center gap-1.5 min-w-0 pr-1"
            >
              <HabitEmoji emoji={row.emoji} className="text-sm shrink-0" />
              <span className="text-[10px] font-medium truncate text-ql-3">{row.label}</span>
            </div>
            {/* Day cells */}
            {weekDates.map(ds => {
              const state = cellState(row, ds);
              if (row.type === 'steps') {
                const n = stepLog.find(e => e.date === ds)?.steps;
                return (
                  <div key={ds} className="flex-1">
                    <div className={`h-7 w-full rounded-lg flex items-center justify-center ${stateStyle[state]}`}>
                      {n !== undefined && n > 0 && (
                        <span className="text-white text-[8px] font-bold leading-none drop-shadow">
                          {n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
              if (row.type === 'nutrition') {
                const cal = mealLog.filter(m => m.date === ds).reduce((s, m) => s + m.calories, 0);
                return (
                  <div key={ds} className="flex-1">
                    <div className={`h-7 w-full rounded-lg flex items-center justify-center ${stateStyle[state]}`}>
                      {cal > 0 && (
                        <span className="text-white text-[8px] font-bold leading-none drop-shadow">
                          {cal >= 1000 ? `${(cal / 1000).toFixed(1)}k` : cal}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
              return (
                <div key={ds} className="flex-1">
                  <div className={`h-7 w-full rounded-lg ${stateStyle[state]}`} />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-ql">
        {[
          { cls: 'bg-emerald-500',  label: 'Done' },
          { cls: 'bg-amber-400',    label: 'Late' },
          { cls: 'bg-red-500/70',   label: 'Missed' },
          { cls: 'bg-ql-surface3/40', label: 'N/A' },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${cls}`} />
            <span className="text-ql-3 text-[9px]">{label}</span>
          </div>
        ))}
      </div>

      {/* Monthly habit tracker sheet */}
      {showYear && (() => {
        const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const DOW_SHORT   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

        // Build array of day objects for this month
        const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
          const d   = new Date(viewYear, viewMonth, i + 1);
          const ds  = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;
          return { day: i + 1, ds, dow: d.getDay() }; // dow 0=Sun
        });

        // Group into weeks (each week starts Sunday)
        const weeks: (typeof monthDays[0] | null)[][] = [];
        let week: (typeof monthDays[0] | null)[] = Array(monthDays[0].dow).fill(null);
        for (const d of monthDays) {
          week.push(d);
          if (week.length === 7) { weeks.push(week); week = []; }
        }
        if (week.length > 0) {
          while (week.length < 7) week.push(null);
          weeks.push(week);
        }

        // Stats
        const rows = allRowsForYear;
        const effState = (row: Row, ds: string): CellState => (detailCellOverrides[`${row.id}_${ds}`] as CellState | undefined) ?? cellState(row, ds);

        let totalScheduled = 0, totalDone = 0, totalLate = 0;
        for (const { ds } of monthDays) {
          if (ds > today) continue;
          for (const row of rows) {
            const s = effState(row, ds);
            if (s !== 'unscheduled' && s !== 'future') {
              totalScheduled++;
              if (s === 'done') totalDone++;
              else if (s === 'late') totalLate++;
            }
          }
        }
        const progressPct = totalScheduled > 0 ? Math.round((totalDone / totalScheduled) * 100) : 0;
        const monthAcc = totalScheduled > 0 ? Math.round((totalDone * 100 + totalLate * 50) / totalScheduled) : null;
        const mAccColor = monthAcc === null ? '#888' : monthAcc >= 75 ? '#22c55e' : monthAcc >= 40 ? '#fbbf24' : '#ef4444';

        // Per-day completion % for sparkline
        const dayPcts = monthDays.map(({ ds }) => {
          if (ds > today) return null;
          let sched = 0, done = 0;
          for (const row of rows) {
            const s = effState(row, ds);
            if (s !== 'unscheduled' && s !== 'future') { sched++; if (s === 'done') done++; }
          }
          return sched > 0 ? done / sched : null;
        });

        // Analysis: per-row stats
        const rowStats = rows.map(row => {
          let sched = 0, done = 0;
          for (const { ds } of monthDays) {
            if (ds > today) continue;
            const s = effState(row, ds);
            if (s !== 'unscheduled' && s !== 'future') { sched++; if (s === 'done') done++; }
          }
          return { row, sched, done, pct: sched > 0 ? Math.round((done / sched) * 100) : 0 };
        }).filter(r => r.sched > 0);

        const prevMonth = () => {
          setShowDatePicker(false);
          if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
          else setViewMonth(m => m - 1);
        };
        const nextMonth = () => {
          setShowDatePicker(false);
          if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
          else setViewMonth(m => m + 1);
        };

        const cellBg: Record<string, string> = {
          done:        'bg-emerald-500',
          late:        'bg-amber-400',
          missed:      'bg-red-500/80',
          unscheduled: 'bg-ql-surface3/30',
          future:      'bg-ql-surface3/15',
        };

        const LABEL_W = 68; // px for habit label column
        const COL_W = containerW > 0
          ? Math.max(18, Math.floor((containerW - LABEL_W) / daysInMonth))
          : 26;

        return (
          <div className="fixed inset-0 z-50 flex flex-col bg-ql-bg">
            {/* ── Header ── */}
            <div className="relative flex items-center justify-center px-4 pt-4 pb-3 border-b border-ql shrink-0 bg-ql-bg">
              <button onClick={() => setShowYear(false)} className="absolute left-4 text-ql text-xs border border-ql rounded-xl px-3 py-1.5">Close</button>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center text-ql hover:text-ql-accent text-xl font-light">‹</button>
                <button onClick={() => setShowDatePicker(p => !p)}
                  className="text-ql font-bold text-base px-2 flex items-center gap-1 hover:text-ql-accent transition-colors">
                  {MONTHS_LONG[viewMonth]} {viewYear}
                  <span className="text-ql-3 text-[10px] mt-0.5">{showDatePicker ? '▲' : '▼'}</span>
                </button>
                <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center text-ql hover:text-ql-accent text-xl font-light">›</button>
              </div>
              {/* Date picker dropdown */}
              {showDatePicker && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-ql-surface2 border border-ql rounded-2xl shadow-ql z-50 p-4 w-72">
                  {/* Year selector */}
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setViewYear(y => y - 1)} className="w-8 h-8 flex items-center justify-center text-ql hover:text-ql-accent text-lg">‹</button>
                    <span className="text-ql font-bold text-sm">{viewYear}</span>
                    <button onClick={() => setViewYear(y => y + 1)} className="w-8 h-8 flex items-center justify-center text-ql hover:text-ql-accent text-lg">›</button>
                  </div>
                  {/* Month grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {MONTHS_LONG.map((m, mi) => (
                      <button key={mi}
                        onClick={() => { setViewMonth(mi); setShowDatePicker(false); }}
                        className={`py-1.5 rounded-xl text-[11px] font-medium transition-colors ${mi === viewMonth ? 'bg-ql-accent text-white' : 'bg-ql-surface3 text-ql-3 hover:text-ql'}`}>
                        {m.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Stats row ── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-ql shrink-0">
              {/* Big accuracy circle */}
              {(() => {
                const R = 46, C = 55, circ = 2 * Math.PI * R;
                const pct = monthAcc ?? 0;
                return (
                  <div className="flex flex-col items-center shrink-0">
                    <svg width="110" height="110" viewBox="0 0 110 110" style={{ display: 'block' }}>
                      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--ql-surface-3)" strokeWidth="10" />
                      <circle cx={C} cy={C} r={R} fill="none" stroke={mAccColor} strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${circ}`}
                        strokeDashoffset={`${circ * (1 - pct / 100)}`}
                        transform={`rotate(-90 ${C} ${C})`}
                        style={{ transition: 'stroke-dashoffset 0.9s ease' }}
                      />
                      <text x={C} y={C + 3} textAnchor="middle" fontSize="23" fontWeight="800" fill={mAccColor} fontFamily="inherit">
                        {monthAcc ?? '–'}
                      </text>
                      {monthAcc !== null && (
                        <text x={C} y={C + 17} textAnchor="middle" fontSize="10" fontWeight="600" fill={mAccColor} fontFamily="inherit">%</text>
                      )}
                    </svg>
                    <p className="text-ql-3 text-[10px] font-medium -mt-0.5">goals achieved</p>
                  </div>
                );
              })()}

              {/* Right-side small stats */}
              <div className="flex flex-1 flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-ql-surface2 rounded-xl p-2.5 text-center border border-ql">
                    <p className="text-ql text-sm font-bold">{rows.length}</p>
                    <p className="text-ql-3 text-[10px]">Tracked</p>
                  </div>
                  <div className="bg-ql-surface2 rounded-xl p-2.5 text-center border border-ql">
                    <p className="text-ql text-sm font-bold">{totalDone}</p>
                    <p className="text-ql-3 text-[10px]">Completed</p>
                  </div>
                </div>
                <div className="bg-ql-surface2 rounded-xl p-2.5 border border-ql">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-ql-3 text-[10px]">Done only</p>
                    <p className="text-ql text-[10px] font-bold">{progressPct}%</p>
                  </div>
                  <div className="h-1.5 bg-ql-surface3 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Scrollable grid ── */}
            <div className="flex-1 overflow-y-auto">
              <div className="overflow-x-auto" ref={gridContainerRef}>
                <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: `${LABEL_W + COL_W * daysInMonth}px` }}>
                  <colgroup>
                    <col style={{ width: `${LABEL_W}px` }} />
                    {monthDays.map(({ ds }) => <col key={ds} style={{ width: `${COL_W}px` }} />)}
                  </colgroup>
                  <thead>
                    {/* Week group row */}
                    <tr>
                      <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--ql-bg)', borderBottom: '1px solid var(--ql-border)' }} />
                      {weeks.map((wk, wi) => {
                        const firstReal = wk.find(d => d !== null);
                        const lastReal  = [...wk].reverse().find(d => d !== null);
                        const label = firstReal ? `Week ${wi + 1}` : '';
                        const colSpan = wk.filter(d => d !== null).length;
                        return (
                          <th key={wi} colSpan={colSpan} className="text-center"
                            style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--ql-bg)', borderBottom: '1px solid var(--ql-border)', borderRight: wi < weeks.length - 1 ? 'rgba(255,255,255,0.12) solid 1px' : undefined }}>
                            <span className="text-ql-3 text-[9px] font-semibold">{label}</span>
                          </th>
                        );
                      })}
                    </tr>
                    {/* Day header row */}
                    <tr>
                      <th className="px-2 py-1 text-left text-ql-3 text-[9px] font-semibold uppercase"
                        style={{ position: 'sticky', top: 25, zIndex: 10, background: 'var(--ql-bg)', borderBottom: '1px solid var(--ql-border)' }}>Habit</th>
                      {monthDays.map(({ day, ds, dow }) => {
                        const isToday = ds === today;
                        return (
                          <th key={ds} className="py-1"
                            style={{ position: 'sticky', top: 25, zIndex: 10, background: 'var(--ql-bg)', borderBottom: '1px solid var(--ql-border)', borderLeft: '1px solid rgba(255,255,255,0.12)' }}>
                            <div className="flex flex-col items-center">
                              <span className={`text-[8px] font-medium ${isToday ? 'text-ql-accent' : 'text-ql-3'}`}>{DOW_SHORT[dow]}</span>
                              <span className={`text-[9px] font-bold tabular-nums ${isToday ? 'text-ql-accent' : 'text-ql'}`}>{day}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Habit rows */}
                    {rows.map((row, ri) => (
                      <tr key={row.id} className={ri % 2 === 0 ? '' : 'bg-ql-surface2/40'} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <HabitEmoji emoji={row.emoji} className="text-base leading-none shrink-0" />
                            <span className="text-ql text-[10px] font-medium truncate">{row.label}</span>
                          </div>
                        </td>
                        {monthDays.map(({ ds }) => {
                          const s = cellState(row, ds);
                          const override = detailCellOverrides[`${row.id}_${ds}`];
                          const effective = override ?? s;
                          const isToday = ds === today;
                          return (
                            <td key={ds} className={`py-1.5 ${isToday ? 'bg-ql-accent/5' : ''}`}
                              style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                              onClick={() => cycleDetailCell(row, ds)}>
                              <div className={`w-4 h-4 rounded-sm mx-auto ${cellBg[effective]}`} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Day % row */}
                    <tr className="bg-ql-surface2/60" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                      <td className="px-2 py-1.5 text-ql-3 text-[9px] font-semibold">Day %</td>
                      {monthDays.map(({ ds }, i) => {
                        const pct = dayPcts[i];
                        const color = pct === null ? 'text-ql-3/40' : pct >= 0.9 ? 'text-emerald-400' : pct >= 0.5 ? 'text-amber-400' : 'text-red-400';
                        return (
                          <td key={ds} className={`py-1.5 text-center ${color}`}
                            style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                            <span className="text-[8px] font-bold tabular-nums">
                              {pct === null ? '·' : `${Math.round(pct * 100)}%`}
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Chart row */}
                    <tr style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <td colSpan={daysInMonth + 1} className="p-0" style={{ background: 'var(--ql-surface2)' }}>
                        {(() => {
                          const svgW = LABEL_W + COL_W * daysInMonth;
                          const svgH = 70;
                          const chartH = 48;
                          const chartT = 12;
                          const xOf = (i: number) => LABEL_W + i * COL_W + COL_W / 2;
                          const yOf = (p: number) => chartT + (1 - p) * chartH;
                          const pts = dayPcts.map((p, i) => p !== null ? { x: xOf(i), y: yOf(p) } : null);
                          const visible = pts.filter(Boolean) as { x: number; y: number }[];
                          const linePath = (() => {
                            const segs: string[] = [];
                            let inSeg = false;
                            for (const p of pts) {
                              if (p) { segs.push(`${inSeg ? 'L' : 'M'} ${p.x} ${p.y}`); inSeg = true; }
                              else inSeg = false;
                            }
                            return segs.join(' ');
                          })();
                          const areaPath = visible.length >= 2
                            ? `${visible.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} L ${visible[visible.length-1].x} ${chartT + chartH} L ${visible[0].x} ${chartT + chartH} Z`
                            : '';
                          return (
                            <div className="relative" style={{ height: `${svgH}px` }}>
                              <span className="absolute left-0 top-0 bottom-0 flex items-center px-2 text-ql-3 text-[9px] font-semibold z-10"
                                style={{ width: `${LABEL_W}px` }}>Chart</span>
                              <svg width={svgW} height={svgH} style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}>
                                {[0.25, 0.5, 0.75, 1.0].map(v => (
                                  <line key={v} x1={LABEL_W} x2={svgW} y1={yOf(v)} y2={yOf(v)}
                                    stroke="var(--ql-border)" strokeWidth="1" strokeDasharray="3 3" />
                                ))}
                                {areaPath && <path d={areaPath} fill="rgba(52,199,89,0.2)" />}
                                {linePath && <path d={linePath} fill="none" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                                {pts.map((p, i) => p && (
                                  <circle key={i} cx={p.x} cy={p.y} r="3"
                                    fill={dayPcts[i]! >= 0.9 ? '#34c759' : dayPcts[i]! >= 0.5 ? '#fbbf24' : '#ef4444'}
                                    stroke="var(--ql-surface2)" strokeWidth="1" />
                                ))}
                              </svg>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Analysis ── */}
              <div className="px-4 pb-8">
                <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wider mb-2">Analysis</p>
                <div className="bg-ql-surface2 rounded-2xl border border-ql overflow-hidden">
                  <div className="flex items-center px-3 py-2 border-b border-ql bg-ql-surface3/30">
                    <span className="flex-1 text-ql-3 text-[10px] font-semibold">Habit</span>
                    <span className="w-12 text-right text-ql-3 text-[10px] font-semibold">Done</span>
                    <span className="w-10 text-right text-ql-3 text-[10px] font-semibold">%</span>
                    <span className="w-16 ml-2 text-ql-3 text-[10px] font-semibold">Progress</span>
                  </div>
                  {rowStats.map(({ row, done, sched, pct }) => (
                    <div key={row.id} className="flex items-center px-3 py-2 border-b border-ql/30 last:border-0">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <HabitEmoji emoji={row.emoji} className="text-sm shrink-0" />
                        <span className="text-ql text-[11px] truncate">{row.label}</span>
                      </div>
                      <span className="w-12 text-right text-ql-3 text-[11px] tabular-nums">{done}/{sched}</span>
                      <span className={`w-10 text-right text-[11px] font-semibold tabular-nums ${pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{pct}%</span>
                      <div className="w-16 ml-2 h-1.5 bg-ql-surface3 rounded-full overflow-hidden shrink-0">
                        <div className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit sheet */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setShowEdit(false)}>
          <div className="bg-ql-surface rounded-t-3xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-ql-surface3" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-ql">
              <h3 className="text-ql text-sm font-semibold">Customise Snapshot</h3>
              <button onClick={() => setShowEdit(false)} className="text-ql-3 text-sm px-2">Done</button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-5 pb-10">

              {/* Built-in rows */}
              <div>
                <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wider mb-2">Built-in</p>
                {builtinRows.map(row => {
                  const shown = !hiddenBuiltins.has(row.id);
                  return (
                    <button key={row.id} onClick={() => toggleBuiltin(row.id)}
                      className="flex items-center gap-3 py-3 border-b border-ql last:border-0 w-full">
                      <HabitEmoji emoji={row.emoji} className="text-lg" />
                      <span className="text-ql text-sm flex-1 text-left">{row.label}</span>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${shown ? 'border-emerald-500 bg-emerald-500' : 'border-ql bg-transparent'}`}>
                        {shown && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Habits */}
              <div>
                <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wider mb-2">
                  Habits {habitDefs.length === 0 && <span className="normal-case font-normal">— none created yet</span>}
                </p>
                {habitDefs.map(h => {
                  const added = addedOptional.has(h.id);
                  return (
                    <button key={h.id} onClick={() => toggleOptional(h.id)}
                      className="flex items-center gap-3 py-3 border-b border-ql last:border-0 w-full">
                      <HabitEmoji emoji={h.emoji} className="text-lg" />
                      <span className="text-ql text-sm flex-1 text-left">{h.name}</span>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${added ? 'border-emerald-500 bg-emerald-500' : 'border-ql bg-transparent'}`}>
                        {added && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      )}


    </div>
  );
}

// ─── Budget Tracker card (pinned items) ───────────────────────────────────────
function BudgetTrackerCard() {
  const { budgetItems, spendingLog, currencySymbol, setActiveSection, disabledSections } = useGameStore();
  if (disabledSections.includes('finance')) return null;
  const sym = currencySymbol;
  const pinned = budgetItems.filter(i => i.pinToHome);
  if (pinned.length === 0) return null;

  function getMonday(d: Date): Date {
    const dd = new Date(d);
    dd.setDate(dd.getDate() - ((dd.getDay() + 6) % 7));
    dd.setHours(0, 0, 0, 0);
    return dd;
  }

  function getPeriodSpend(itemId: string, frequency: 'weekly' | 'monthly' | 'annual' | 'one_off'): number {
    const now = new Date();
    return spendingLog
      .filter(e => e.budgetItemId === itemId)
      .filter(e => {
        if (frequency === 'one_off') return true;
        const d = new Date(e.date + 'T00:00:00');
        if (frequency === 'weekly') {
          const start = getMonday(now);
          const end = new Date(start); end.setDate(start.getDate() + 7);
          return d >= start && d < end;
        }
        if (frequency === 'monthly') {
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }
        return d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + e.amount, 0);
  }

  const bucketColor: Record<string, string> = {
    needs:   'text-blue-400',
    wants:   'text-purple-400',
    savings: 'text-emerald-400',
  };

  return (
    <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💳</span>
          <p className="text-ql text-sm font-semibold">Budget Allowances</p>
        </div>
        <button
          onClick={() => setActiveSection('vices')}
          className="text-ql-3 text-xs border border-ql rounded-xl px-2.5 py-1"
        >Manage ›</button>
      </div>
      <div className="flex flex-col gap-2">
        {pinned.map(item => {
          const freqLabel   = item.frequency === 'weekly' ? '/wk' : item.frequency === 'annual' ? '/yr' : item.frequency === 'one_off' ? ' (1×)' : '/mo';
          const periodLabel = item.frequency === 'weekly' ? 'this week' : item.frequency === 'annual' ? 'this year' : item.frequency === 'one_off' ? 'total' : 'this month';
          const spent    = getPeriodSpend(item.id, item.frequency);
          const budget   = item.amount;
          const spentPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
          const over     = spent > budget;
          return (
            <div key={item.id} className="bg-ql-surface2 rounded-xl px-3 py-2.5 border border-ql">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-lg shrink-0">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-ql text-xs font-semibold truncate">{item.name}</p>
                  <p className={`text-[10px] font-medium ${bucketColor[item.bucket]}`}>
                    {item.bucket.charAt(0).toUpperCase() + item.bucket.slice(1)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-bold tabular-nums ${over ? 'text-red-400' : 'text-ql'}`}>
                    {sym}{spent.toFixed(0)}<span className="text-ql-3 font-normal"> / {sym}{budget.toFixed(0)}{freqLabel}</span>
                  </p>
                  <p className={`text-[10px] tabular-nums ${over ? 'text-red-400' : 'text-emerald-400'}`}>
                    {over ? `${sym}${(spent - budget).toFixed(2)} over` : `${sym}${(budget - spent).toFixed(2)} left ${periodLabel}`}
                  </p>
                </div>
              </div>
              <div className="h-1.5 bg-ql-surface3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : spentPct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${spentPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared ring SVG ──────────────────────────────────────────────────────────
function ProgressRing({ pct, hit, color, valLine1, valLine2, goalLine }: {
  pct: number; hit: boolean; color: string;
  valLine1: string; valLine2: string; goalLine: string;
}) {
  const R = 38, CX = 46, CY = 46, CIRC = 2 * Math.PI * R;
  const stroke = hit ? '#22c55e' : color;
  return (
    <svg viewBox="0 0 92 92" width="100%" style={{ maxWidth: 92 }}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--ql-surface-3,#e8e8e8)" strokeWidth="7" />
      <circle cx={CX} cy={CY} r={R} fill="none"
        stroke={stroke} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct)}
        transform={`rotate(-90 ${CX} ${CY})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x={CX} y={CY - 6} textAnchor="middle" fontSize="15" fontWeight="800"
        fill="var(--ql-tx,#111)">{valLine1}</text>
      {valLine2 && (
        <text x={CX} y={CY + 9} textAnchor="middle" fontSize="9" fontWeight="600"
          fill="var(--ql-tx,#111)">{valLine2}</text>
      )}
      <text x={CX} y={valLine2 ? CY + 22 : CY + 9} textAnchor="middle" fontSize="8"
        fill="var(--ql-tx-3,#aaa)">{goalLine}</text>
      {hit && (
        <text x={CX} y={CY + 33} textAnchor="middle" fontSize="9" fontWeight="700" fill="#22c55e">✓</text>
      )}
    </svg>
  );
}

// ─── Calorie burn calculation ──────────────────────────────────────────────────
function calcTodayBurn(store: ReturnType<typeof useGameStore.getState>, today: string) {
  const ca   = store.characterAppearance;
  const wLog = [...store.weightLog].sort((a, b) => b.date.localeCompare(a.date));
  const weight = wLog[0]?.weight ?? ca.startingWeight ?? 75;
  const height = ca.height ?? 175;
  const age    = ca.age    ?? 25;
  const gender = ca.gender ?? 'neutral';

  // BMR — use Katch-McArdle if body fat available, else Mifflin-St Jeor
  const bfLog = [...(store.bodyCompositionLog ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const latestBf = bfLog[0];
  let bmr: number;
  let bmrLabel: string;
  if (latestBf?.bodyFatLow != null && latestBf?.bodyFatHigh != null) {
    const bf = (latestBf.bodyFatLow + latestBf.bodyFatHigh) / 2;
    const lean = weight * (1 - bf / 100);
    bmr = Math.round(370 + 21.6 * lean);
    bmrLabel = `Katch-McArdle (${bf.toFixed(0)}% BF, ${lean.toFixed(1)}kg lean mass)`;
  } else {
    const base = 10 * weight + 6.25 * height - 5 * age;
    bmr = Math.round(gender === 'masculine' ? base + 5 : gender === 'feminine' ? base - 161 : base - 78);
    bmrLabel = `Mifflin-St Jeor (${height}cm, ${weight}kg, age ${age})`;
  }

  // NEAT — steps (covers daily walking; 0.00045 kcal/step/kg is MET-validated)
  const todaySteps = store.stepLog.find(e => e.date === today)?.steps ?? 0;
  const neatKcal   = Math.round(todaySteps * weight * 0.00045);

  // GPS exercise today — specific distance + time data available
  const todayGps = (store.gpsActivities ?? []).filter(a => (a.startTime ?? '').slice(0, 10) === today);
  type ActivityRow = { label: string; kcal: number; gps: boolean; estimated: boolean };
  const activityRows: ActivityRow[] = [];

  for (const a of todayGps) {
    let kcal = 0;
    const isOther = a.type === 'other';
    // Prefer AI-stored caloriesBurned (accounts for terrain, intensity etc.)
    // Fall back to distance-based formula only for GPS-tracked activities without a stored value
    if ((a as {caloriesBurned?: number}).caloriesBurned) {
      kcal = Math.round((a as {caloriesBurned?: number}).caloriesBurned!);
    } else if (a.type === 'run')   { kcal = Math.round(weight * a.distance * 1.036); }
    else if (a.type === 'cycle')   { kcal = Math.round(weight * a.distance * 0.28); }
    else if (a.type === 'walk')    { kcal = Math.round(weight * a.distance * 0.53); }
    if (kcal > 0) {
      const mins = Math.round(a.duration / 60);
      const icon = a.type === 'run' ? '🏃' : a.type === 'cycle' ? '🚴' : isOther ? '⚡' : '🚶';
      const name = isOther && (a as {activityName?: string}).activityName
        ? (a as {activityName?: string}).activityName!
        : a.type.charAt(0).toUpperCase() + a.type.slice(1);
      const distStr = a.distance > 0 ? ` · ${a.distance.toFixed(1)}km` : '';
      activityRows.push({
        label: `${icon} ${name}${distStr} · ${mins} min`,
        kcal, gps: !isOther, estimated: false,
      });
    }
  }
  // Deduct GPS walk overlap with NEAT steps — use stored caloriesBurned if available
  const walkKcalGps = todayGps.filter(a => a.type === 'walk').reduce((s, a) => {
    return s + ((a as {caloriesBurned?: number}).caloriesBurned ?? Math.round(weight * a.distance * 0.53));
  }, 0);
  const walkOverlap = Math.min(walkKcalGps, neatKcal);

  // Gym sessions today (resistance training ~7 MET × 45 min)
  const todayGym = store.gymSessions.filter(s => (s.date ?? '').slice(0, 10) === today);
  // Track which habits are already covered by a gym session (avoid double-counting)
  const gymLinkedHabitIds = new Set(
    todayGym.map(s => store.gymPlans.find(p => p.id === s.planId)?.linkedHabitId).filter(Boolean) as string[]
  );
  for (const s of todayGym) {
    const plan = store.gymPlans.find(p => p.id === s.planId);
    const kcal = Math.round(weight * 7 * (45 / 60));
    activityRows.push({ label: `💪 ${plan?.name ?? 'Gym session'}`, kcal, gps: false, estimated: false });
  }

  // Non-GPS fitness habits completed today (e.g. "Morning Run" ticked without GPS)
  const todayHabitIds = new Set(store.habitLog.filter(e => e.date === today).map(e => e.habitId));
  // Types that GPS already covered today
  const gpsRunToday   = todayGps.some(a => a.type === 'run');
  const gpsCycleToday = todayGps.some(a => a.type === 'cycle');

  for (const habitId of todayHabitIds) {
    if (gymLinkedHabitIds.has(habitId)) continue; // gym session already counted
    const hab = store.habitDefs.find(h => h.id === habitId);
    if (!hab) continue;
    const n = hab.name.toLowerCase();
    const e = String(hab.emoji);

    let kcal = 0; let icon = '🏃'; let activity = '';
    if (!gpsRunToday && (/run|jog|5k|10k|marathon|sprint/i.test(n) || e === '🏃' || e === '🏃‍♂️' || e === '🏃‍♀️')) {
      kcal = Math.round(weight * 7 * (30 / 60)); icon = '🏃'; activity = '~30 min run';
    } else if (!gpsCycleToday && (/cycle|bike|spin/i.test(n) || e === '🚴' || e === '🚴‍♂️' || e === '🚴‍♀️')) {
      kcal = Math.round(weight * 6 * (45 / 60)); icon = '🚴'; activity = '~45 min cycle';
    } else if (/swim/i.test(n) || e === '🏊' || e === '🏊‍♂️' || e === '🏊‍♀️') {
      kcal = Math.round(weight * 8 * (45 / 60)); icon = '🏊'; activity = '~45 min swim';
    } else if (/\b(gym|lift|weight|crossfit|hiit|circuit|strength|resistance)\b/i.test(n) || e === '🏋️' || e === '🏋️‍♂️') {
      kcal = Math.round(weight * 7 * (45 / 60)); icon = '💪'; activity = '~45 min session';
    } else if (/yoga|pilates|stretch/i.test(n) || e === '🧘' || e === '🧘‍♂️' || e === '🧘‍♀️') {
      kcal = Math.round(weight * 3 * (45 / 60)); icon = '🧘'; activity = '~45 min session';
    } else {
      continue; // not a classifiable fitness habit
    }
    if (kcal > 0) {
      activityRows.push({ label: `${icon} ${hab.name} · ${activity}`, kcal, gps: false, estimated: true });
    }
  }

  const exerciseKcal = activityRows.reduce((s, r) => s + r.kcal, 0) - walkOverlap;
  const totalBurned  = bmr + neatKcal + exerciseKcal;

  // TDEE (for ring progress)
  const actMult: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  const tdee = Math.round(bmr * (actMult[ca.activityLevel ?? 'moderate'] ?? 1.55));

  return { bmr, bmrLabel, neatKcal, todaySteps, activityRows, exerciseKcal, totalBurned, tdee, weight };
}

// ─── Calories-burned detail sheet ─────────────────────────────────────────────
function CalorieBurnSheet({ onClose }: { onClose: () => void }) {
  const store = useGameStore.getState();
  const today = todayStr();
  const { bmr, bmrLabel, neatKcal, todaySteps, activityRows, totalBurned, tdee, weight } =
    calcTodayBurn(store, today);
  const meals  = useGameStore(s => s.mealLog).filter(m => m.date === today);
  const calsIn = meals.reduce((s, m) => s + m.calories, 0);
  const net    = calsIn - totalBurned;
  const fmt    = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  const netColor = net > 200 ? '#f59e0b' : net < -200 ? '#3b82f6' : '#22c55e';
  const netLabel = net > 200 ? 'Calorie surplus' : net < -200 ? 'Calorie deficit' : 'Balanced';
  const netDesc  = net > 200
    ? 'You\'re eating more than you\'re burning — good for muscle gain.'
    : net < -200
    ? 'You\'re burning more than you\'re eating — good for fat loss.'
    : 'Intake matches expenditure — good for maintenance.';

  const Row = ({ label, kcal, sub, badge }: { label: string; kcal: number; sub?: string; badge?: string }) => (
    <div className="flex items-start justify-between py-2 border-b border-ql last:border-0 gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-ql text-xs font-medium">{label}</p>
          {badge && (
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${badge === 'GPS' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {badge}
            </span>
          )}
        </div>
        {sub && <p className="text-ql-3 text-[10px] mt-0.5">{sub}</p>}
      </div>
      <p className="text-ql text-xs font-bold tabular-nums shrink-0">{fmt(kcal)} kcal</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--ql-bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-ql shrink-0">
        <button onClick={onClose} className="text-ql-3 text-sm px-1">←</button>
        <div>
          <p className="text-ql font-bold text-base">🔥 Calories Burned</p>
          <p className="text-ql-3 text-xs">Today's estimated energy expenditure</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* Big total */}
        <div className="bg-ql-surface rounded-2xl border border-ql p-5 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-ql-3 text-xs font-medium mb-1">Total burned today</p>
            <p className="text-4xl font-black tabular-nums" style={{ color: '#f97316' }}>{totalBurned.toLocaleString()}</p>
            <p className="text-ql-3 text-xs mt-1">kcal · TDEE target ~{tdee.toLocaleString()} kcal</p>
          </div>
          <div style={{ width: 72, height: 72 }}>
            <svg viewBox="0 0 72 72" width="72" height="72">
              <circle cx="36" cy="36" r="30" fill="none" stroke="var(--ql-surface2)" strokeWidth="6" />
              <circle cx="36" cy="36" r="30" fill="none" stroke="#f97316" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * (1 - Math.min(1, totalBurned / tdee))}`}
                transform="rotate(-90 36 36)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
              <text x="36" y="40" textAnchor="middle" fontSize="11" fontWeight="800" fill="#f97316">
                {Math.round((totalBurned / tdee) * 100)}%
              </text>
            </svg>
          </div>
        </div>

        {/* Badge legend */}
        {activityRows.some(r => r.gps || r.estimated) && (
          <div className="flex gap-2">
            {activityRows.some(r => r.gps) && (
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">📡 GPS — exact distance & time</span>
            )}
            {activityRows.some(r => r.estimated) && (
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">~ Est. — no GPS, typical duration used</span>
            )}
          </div>
        )}

        {/* Breakdown */}
        <div className="bg-ql-surface rounded-2xl border border-ql p-4">
          <p className="text-ql text-sm font-semibold mb-3">📊 Breakdown</p>
          <Row label="🧬 Basal Metabolic Rate" kcal={bmr} sub={bmrLabel} />
          <Row label={`👟 Daily movement · ${todaySteps.toLocaleString()} steps`} kcal={neatKcal}
            sub={`${weight}kg × ${todaySteps.toLocaleString()} steps × 0.00045 (MET-validated)`} />
          {activityRows.map((r, i) => (
            <Row key={i} label={r.label} kcal={r.kcal}
              badge={r.gps ? 'GPS' : r.estimated ? '~ Est.' : undefined}
              sub={r.gps ? 'Calculated from exact GPS distance' : r.estimated ? 'No GPS — based on typical session duration' : undefined}
            />
          ))}
          <div className="flex items-center justify-between pt-2 mt-1">
            <p className="text-ql text-xs font-bold">Total burned</p>
            <p className="text-xs font-black tabular-nums" style={{ color: '#f97316' }}>{totalBurned.toLocaleString()} kcal</p>
          </div>
        </div>

        {/* Net calculator */}
        <div className="bg-ql-surface rounded-2xl border border-ql p-4">
          <p className="text-ql text-sm font-semibold mb-3">⚖️ Net Calories</p>
          <div className="flex items-center justify-between mb-2">
            <p className="text-ql-3 text-xs">🥗 Calories in (food today)</p>
            <p className="text-green-400 text-xs font-bold tabular-nums">+{fmt(calsIn)} kcal</p>
          </div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-ql-3 text-xs">🔥 Calories burned</p>
            <p className="text-xs font-bold tabular-nums" style={{ color: '#f97316' }}>−{fmt(totalBurned)} kcal</p>
          </div>
          {/* Bar */}
          <div className="h-2 bg-ql-surface2 rounded-full overflow-hidden mb-3">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, calsIn > 0 ? (calsIn / Math.max(calsIn, totalBurned)) * 100 : 0)}%`,
                backgroundColor: netColor,
              }} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold" style={{ color: netColor }}>
                {net >= 0 ? '+' : ''}{fmt(Math.abs(net))} kcal {net >= 0 ? 'surplus' : 'deficit'}
              </p>
              <p className="text-ql-3 text-[10px] mt-0.5">{netLabel} · {netDesc}</p>
            </div>
          </div>
        </div>

        {/* Today's meals */}
        {meals.length > 0 && (
          <div className="bg-ql-surface rounded-2xl border border-ql p-4">
            <p className="text-ql text-sm font-semibold mb-3">🥗 Food logged today</p>
            {meals.map(m => (
              <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-ql last:border-0">
                <p className="text-ql text-xs truncate flex-1">{m.name}</p>
                <div className="flex gap-2 shrink-0 ml-2">
                  <p className="text-ql-3 text-[10px]">P{m.protein}g C{m.carbs}g F{m.fat}g</p>
                  <p className="text-ql text-xs font-semibold tabular-nums">{m.calories}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 mt-1">
              <p className="text-ql-3 text-xs font-semibold">Total</p>
              <p className="text-green-400 text-xs font-bold tabular-nums">{calsIn.toLocaleString()} kcal</p>
            </div>
          </div>
        )}
        {meals.length === 0 && (
          <div className="bg-ql-surface rounded-2xl border border-ql p-4 text-center">
            <p className="text-ql-3 text-xs">No food logged today — tell GAINN what you've eaten!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Daily trio — Steps, Nutrition, Hydration, Burn ───────────────────────────
function DailyTrioCard() {
  const {
    stepLog, stepGoal,
    mealLog, nutritionGoal,
    waterLog, waterGoal,
    setActiveSection, setTrainingTab, setNutritionTab, setGymTab,
    disabledSections,
  } = useGameStore();
  const [showBurn, setShowBurn] = useState(false);

  const today = todayStr();
  const fmt   = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
  const fmtMl = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}L` : `${n}ml`;

  // Steps
  const todaySteps = stepLog.find(e => e.date === today)?.steps ?? 0;
  const stepPct    = stepGoal > 0 ? Math.min(1, todaySteps / stepGoal) : 0;
  const stepsHit   = todaySteps >= stepGoal;

  // Nutrition
  const totalCal = mealLog.filter(m => m.date === today).reduce((s, m) => s + m.calories, 0);
  const calGoal  = nutritionGoal.calories;
  const calPct   = calGoal > 0 ? Math.min(1, totalCal / calGoal) : 0;
  const calHit   = totalCal >= calGoal && calGoal > 0;

  // Hydration
  const todayWater = waterLog.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
  const waterPct   = waterGoal > 0 ? Math.min(1, todayWater / waterGoal) : 0;
  const waterHit   = todayWater >= waterGoal;

  // Calorie burn
  const burn = calcTodayBurn(useGameStore.getState(), today);
  const burnPct = burn.tdee > 0 ? Math.min(1, burn.totalBurned / burn.tdee) : 0;

  const foodOff      = disabledSections.includes('food');
  const hydrationOff = disabledSections.includes('hydration');
  const stepsOff     = disabledSections.includes('steps');

  const rings = [
    !stepsOff && (
      <button key="steps"
        onClick={() => { setGymTab('steps'); setActiveSection('gym'); }}
        className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-3 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform"
      >
        <ProgressRing pct={stepPct} hit={stepsHit} color="#4a9eff"
          valLine1={fmt(todaySteps)} valLine2={todaySteps >= 1000 ? 'steps' : ''} goalLine={`/ ${fmt(stepGoal)}`} />
        <p className="text-ql-3 text-[10px] font-medium">👟 Steps</p>
      </button>
    ),
    !foodOff && (
      <button key="nutrition"
        onClick={() => { setNutritionTab('food'); setActiveSection('nutrition'); }}
        className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-3 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform"
      >
        <ProgressRing pct={calPct} hit={calHit} color="#34c759"
          valLine1={fmt(totalCal)} valLine2={totalCal >= 1000 ? 'kcal' : ''} goalLine={`/ ${fmt(calGoal)}kcal`} />
        <p className="text-ql-3 text-[10px] font-medium">🥗 Nutrition</p>
      </button>
    ),
    !hydrationOff && (
      <button key="hydration"
        onClick={() => { setNutritionTab('drink'); setActiveSection('nutrition'); }}
        className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-3 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform"
      >
        <ProgressRing pct={waterPct} hit={waterHit} color="#3b9eff"
          valLine1={fmtMl(todayWater)} valLine2="" goalLine={`/ ${fmtMl(waterGoal)}`} />
        <p className="text-ql-3 text-[10px] font-medium">💧 Hydration</p>
      </button>
    ),
    <button key="burn"
      onClick={() => setShowBurn(true)}
      className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-3 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform"
    >
      <ProgressRing pct={burnPct} hit={burnPct >= 1} color="#f97316"
        valLine1={fmt(burn.totalBurned)} valLine2="kcal" goalLine={`~${fmt(burn.tdee)} TDEE`} />
      <p className="text-ql-3 text-[10px] font-medium">🔥 Burned</p>
    </button>,
  ].filter(Boolean);

  if (rings.length === 0) return null;

  return (
    <>
      <div className={`grid gap-3 grid-cols-${rings.length}`}>
        {rings}
      </div>
      {showBurn && <CalorieBurnSheet onClose={() => setShowBurn(false)} />}
    </>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const {
    stats, habitLog, gymSessions, wakeQuest, vices,
    savingsGoal,
    userName, currencySymbol,
    hiddenStats, disabledSections,
    setActiveSection,
    loginStreak, recordAppOpen,
  } = useGameStore();
  const sym = currencySymbol;

  useEffect(() => { recordAppOpen(); }, []);

  const streak = loginStreak;
  const totalSaved = vices.reduce((sum, v) => sum + v.goldSaved, 0);
  const savedPct = Math.min(100, savingsGoal > 0 ? (totalSaved / savingsGoal) * 100 : 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Hero row: streak (or chill card) + savings circle */}
      <div className={`grid gap-3 ${!disabledSections.includes('finance') ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* Streak */}
        <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-4">
          <div className="text-2xl mb-1.5">🔥</div>
          <div className="text-ql text-3xl font-bold tabular-nums">{streak}</div>
          <div className="text-ql-3 text-xs font-medium mt-0.5">
            {streak === 1 ? 'day in a row' : 'days in a row'}
          </div>
        </div>

        {/* Savings goal — compact circle */}
        {!disabledSections.includes('finance') && <button onClick={() => setActiveSection('vices')} className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-4 flex flex-col items-center gap-2 w-full">
          {(() => {
            const r = 30, cx = 38, cy = 38;
            const circ = 2 * Math.PI * r;
            const offset = circ * (1 - savedPct / 100);
            return (
              <>
                <svg width="76" height="76" viewBox="0 0 76 76" style={{ display: 'block' }}>
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--ql-surface-3)" strokeWidth="7" />
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth="7"
                    strokeLinecap="round" strokeDasharray={`${circ}`} strokeDashoffset={offset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                  <text x={cx} y={cy - 3} textAnchor="middle" fontSize="8" fill="var(--ql-tx-3)" fontWeight="500">{sym}</text>
                  <text x={cx} y={cy + 9} textAnchor="middle" fontSize="12" fill="var(--ql-tx)" fontWeight="700">
                    {savingsGoal >= 1000 ? `${(savingsGoal/1000).toFixed(1)}k` : savingsGoal.toFixed(0)}
                  </text>
                </svg>
                <div className="text-center">
                  <div className="text-emerald-400 text-base font-bold tabular-nums">{savedPct.toFixed(0)}%</div>
                  <div className="text-ql-3 text-[10px]">savings goal</div>
                </div>
              </>
            );
          })()}
        </button>}
      </div>

      {/* Steps · Nutrition · Hydration rings */}
      {!disabledSections.includes('stats') && (
        <>
          <div className="h-px bg-ql-border mx-1 flex items-center">
            <span className="bg-ql-bg px-2 text-ql-3 text-[10px] font-semibold uppercase tracking-widest mx-auto">Today</span>
          </div>
          <DailyTrioCard />
        </>
      )}

      {/* Weekly snapshot grid */}
      {!disabledSections.includes('snapshot') && <WeeklySnapshotGrid />}

      {/* Pinned budget allowances */}
      <BudgetTrackerCard />

      {/* Level & XP — hidden (coming soon as dedicated tab) */}

      {/* Quick stats hidden */}

      <AIAdvisor section="dashboard" />

      {/* ── Calendar ────────────────────────────────────────────── */}
      {!disabledSections.includes('calendar') && (
        <div className="border-t border-ql pt-2 -mx-0">
          <CalendarPage />
        </div>
      )}
    </div>
  );
}
