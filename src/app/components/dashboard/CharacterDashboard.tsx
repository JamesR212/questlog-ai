'use client';

import { useGameStore } from '@/store/gameStore';
import AIAdvisor from '../shared/AIAdvisor';
import HabitEmoji from '../shared/HabitEmoji';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getLast7Days(): { date: string; label: string; dayOfWeek: number }[] {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: dateStr(d),
      label: d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2),
      dayOfWeek: d.getDay(),
    });
  }
  return days;
}

// Color from 0–1 ratio: dark green at 1, pale green/grey at 0
function completionColor(ratio: number, isOver = false): string {
  if (isOver) return 'bg-red-500/70';
  if (ratio <= 0) return 'bg-ql-surface3';
  if (ratio < 0.25) return 'bg-emerald-900/60';
  if (ratio < 0.5)  return 'bg-emerald-800/70';
  if (ratio < 0.75) return 'bg-emerald-600/80';
  if (ratio < 0.95) return 'bg-emerald-500';
  return 'bg-emerald-400';
}

// ─── Tracker Grid ──────────────────────────────────────────────────────────────
function TrackerGrid() {
  const { habitDefs, habitLog, mealLog, nutritionGoal } = useGameStore();
  const days = getLast7Days();

  // Build rows: one per habit + one for nutrition
  type Row = { id: string; label: string; emoji: string; type: 'habit' | 'nutrition' };
  const rows: Row[] = [
    ...habitDefs.map(h => ({ id: h.id, label: h.name, emoji: h.emoji, type: 'habit' as const })),
    { id: '__nutrition__', label: 'Food Goal', emoji: '🥗', type: 'nutrition' as const },
  ];

  if (rows.length === 0) return null;

  // For each row+day, calculate completion ratio
  function cellRatio(row: Row, date: string, dayOfWeek: number): { ratio: number; scheduled: boolean; over: boolean } {
    if (row.type === 'nutrition') {
      const dayMeals = mealLog.filter(m => m.date === date);
      if (dayMeals.length === 0) return { ratio: 0, scheduled: true, over: false };
      const totalCal = dayMeals.reduce((a, m) => a + m.calories, 0);
      const target = nutritionGoal.calories || 2000;
      const ratio = Math.min(totalCal / target, 1.1);
      return { ratio: Math.min(ratio, 1), scheduled: true, over: ratio > 1.05 };
    }
    // Habit
    const habit = habitDefs.find(h => h.id === row.id);
    if (!habit) return { ratio: 0, scheduled: false, over: false };

    // Check if scheduled for this day
    const scheduled = habit.scheduleDays.includes(dayOfWeek);
    if (!scheduled) return { ratio: 0, scheduled: false, over: false };

    const done = habitLog.some(e => e.habitId === row.id && e.date === date);
    return { ratio: done ? 1 : 0, scheduled: true, over: false };
  }

  // Per-day overall completion %
  function dayPct(date: string, dayOfWeek: number): number {
    let total = 0; let achieved = 0;
    rows.forEach(row => {
      const { ratio, scheduled } = cellRatio(row, date, dayOfWeek);
      if (row.type === 'nutrition' || scheduled) {
        total++;
        achieved += ratio;
      }
    });
    return total > 0 ? Math.round((achieved / total) * 100) : 0;
  }

  const LABEL_W = 'w-[88px]';
  const CELL_W  = 'flex-1';

  return (
    <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-4">
      <p className="text-ql text-sm font-semibold mb-3">Daily Tracker</p>

      {/* Day headers */}
      <div className="flex items-center gap-1 mb-2">
        <div className={`${LABEL_W} shrink-0`} />
        {days.map(d => (
          <div key={d.date} className={`${CELL_W} text-center`}>
            <p className="text-ql-3 text-[10px] font-medium">{d.label}</p>
            <p className={`text-[9px] tabular-nums font-semibold ${d.date === dateStr(new Date()) ? 'text-ql-accent' : 'text-ql-3'}`}>
              {dayPct(d.date, d.dayOfWeek)}%
            </p>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-1.5">
        {rows.map(row => (
          <div key={row.id} className="flex items-center gap-1">
            {/* Label */}
            <div className={`${LABEL_W} shrink-0 flex items-center gap-1 min-w-0`}>
              <HabitEmoji emoji={row.emoji} className="text-[13px] shrink-0" />
              <span className="text-ql-3 text-[10px] font-medium truncate">{row.label}</span>
            </div>
            {/* Cells */}
            {days.map(d => {
              const { ratio, scheduled, over } = cellRatio(row, d.date, d.dayOfWeek);
              const isEmpty = row.type === 'habit' && !scheduled;
              return (
                <div key={d.date} className={`${CELL_W} flex justify-center`}>
                  <div
                    className={`h-6 w-full rounded-md transition-all ${
                      isEmpty
                        ? 'bg-ql-surface2 opacity-30'
                        : completionColor(ratio, over)
                    }`}
                    title={isEmpty ? 'Not scheduled' : `${Math.round(ratio * 100)}%`}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-ql">
        {[
          { color: 'bg-emerald-400', label: '100%' },
          { color: 'bg-emerald-600/80', label: '75%' },
          { color: 'bg-emerald-900/60', label: '25%' },
          { color: 'bg-ql-surface3', label: '0%' },
          { color: 'bg-red-500/70', label: 'Over' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${color}`} />
            <span className="text-ql-3 text-[9px]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function CharacterDashboard() {
  const { stats } = useGameStore();
  const xpPct = Math.min(100, (stats.xp / stats.xpToNext) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Hero card */}
      <div className="bg-ql-surface rounded-3xl shadow-ql border border-ql overflow-hidden">
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-ql-3 text-xs font-medium mb-0.5">Adventurer</p>
              <h1 className="text-ql text-2xl font-bold">Your Hero</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Tracker Grid */}
      <TrackerGrid />

      <AIAdvisor section="dashboard" />
    </div>
  );
}
