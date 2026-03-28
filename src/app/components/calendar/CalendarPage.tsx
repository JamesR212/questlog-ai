'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { CalendarEvent, HabitDef } from '@/types';
import HabitEmoji from '../shared/HabitEmoji';
import { buildDailyBars, buildWeeklyBars, buildMonthlyBars } from '../training/StepTracker';
import type { StepBar, StepPeriod } from '../training/StepTracker';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS_SHORT  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS      = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const EVENT_COLORS = [
  { hex: '#ff3b30', label: 'Red'      },
  { hex: '#ff9500', label: 'Orange'   },
  { hex: '#ffcc00', label: 'Yellow'   },
  { hex: '#34c759', label: 'Green'    },
  { hex: '#5ac8fa', label: 'Teal'     },
  { hex: '#007aff', label: 'Blue'     },
  { hex: '#af52de', label: 'Purple'   },
  { hex: '#ff2d55', label: 'Pink'     },
  { hex: '#a2845e', label: 'Brown'    },
  { hex: '#636366', label: 'Graphite' },
];

const REMINDER_OPTIONS = [
  { value: 0,    label: 'None'              },
  { value: 5,    label: '5 min before'      },
  { value: 15,   label: '15 min before'     },
  { value: 30,   label: '30 min before'     },
  { value: 60,   label: '1 hour before'     },
  { value: 120,  label: '2 hours before'    },
  { value: 1440, label: '1 day before'      },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isWeekA(dateStr: string, createdAt: string): boolean {
  const getMonday = (d: Date): Date => {
    const dd = new Date(d);
    const day = dd.getDay();
    dd.setDate(dd.getDate() - (day === 0 ? 6 : day - 1));
    dd.setHours(0, 0, 0, 0);
    return dd;
  };
  const createdMonday = getMonday(new Date(createdAt));
  const dateMonday    = getMonday(new Date(dateStr + 'T00:00:00'));
  const weeks = Math.round(
    (dateMonday.getTime() - createdMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  return weeks % 2 === 0;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr(): string { return toDateStr(new Date()); }

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days: Date[] = [];
  // Pad from Monday (Mon=0 … Sun=6)
  const startOffset = (first.getDay() + 6) % 7;
  for (let i = 0; i < startOffset; i++) {
    days.push(new Date(year, month, 1 - (startOffset - i)));
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  // Pad to complete last row
  let overflow = 1;
  while (days.length % 7 !== 0) {
    days.push(new Date(year, month + 1, overflow++));
  }
  return days;
}

function fmtTime(t: string, format: '12h' | '24h'): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (format === '24h') return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

function fmtDate(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

const BLANK_FORM = {
  title: '', date: todayStr(), startTime: '09:00', endTime: '10:00',
  allDay: false, location: '', notes: '', color: '#007aff', reminder: 0,
};

// ─── Add/Edit event sheet ─────────────────────────────────────────────────────
function EventSheet({
  initial, onSave, onClose,
}: {
  initial: Omit<CalendarEvent, 'id'>;
  onSave: (e: Omit<CalendarEvent, 'id'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);
  const up = (p: Partial<typeof form>) => setForm(f => ({ ...f, ...p }));

  const valid = form.title.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-ql-surface rounded-t-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-ql-surface3" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ql">
          <button onClick={onClose} className="text-ql-3 text-sm">Cancel</button>
          <h3 className="text-ql text-sm font-semibold">
            {initial.title ? 'Edit Event' : 'New Event'}
          </h3>
          <button
            onClick={() => valid && onSave(form)}
            className={`text-sm font-semibold transition-colors ${valid ? 'text-ql-accent' : 'text-ql-3'}`}
          >
            {initial.title ? 'Save' : 'Add'}
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Title */}
          <input
            autoFocus
            value={form.title}
            onChange={e => up({ title: e.target.value })}
            placeholder="Event title"
            className="w-full bg-ql-surface2 rounded-2xl px-4 py-3 text-ql text-base font-medium outline-none border border-ql focus:border-ql-accent transition-colors placeholder:text-ql-3"
          />

          {/* Date + all-day */}
          <div className="bg-ql-surface2 rounded-2xl border border-ql overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ql">
              <span className="text-ql text-sm font-medium">All Day</span>
              <button
                onClick={() => up({ allDay: !form.allDay })}
                className={`w-12 h-6 rounded-full transition-colors relative ${form.allDay ? 'bg-ql-accent' : 'bg-ql-surface3'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.allDay ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center px-4 py-3 border-b border-ql">
              <span className="text-ql text-sm font-medium w-20">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={e => up({ date: e.target.value })}
                style={{ colorScheme: 'dark' }}
                className="bg-transparent text-ql text-sm outline-none flex-1 text-right"
              />
            </div>
            {!form.allDay && (
              <>
                <div className="flex items-center px-4 py-3 border-b border-ql">
                  <span className="text-ql text-sm font-medium w-20">Starts</span>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => up({ startTime: e.target.value })}
                    style={{ colorScheme: 'dark' }}
                    className="bg-transparent text-ql text-sm outline-none flex-1 text-right"
                  />
                </div>
                <div className="flex items-center px-4 py-3">
                  <span className="text-ql text-sm font-medium w-20">Ends</span>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => up({ endTime: e.target.value })}
                    style={{ colorScheme: 'dark' }}
                    className="bg-transparent text-ql text-sm outline-none flex-1 text-right"
                  />
                </div>
              </>
            )}
          </div>

          {/* Location + Notes */}
          <div className="bg-ql-surface2 rounded-2xl border border-ql overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-ql gap-3">
              <span className="text-lg">📍</span>
              <input
                value={form.location}
                onChange={e => up({ location: e.target.value })}
                placeholder="Location"
                className="flex-1 bg-transparent text-ql text-sm outline-none placeholder:text-ql-3"
              />
            </div>
            <div className="flex items-start px-4 py-3 gap-3">
              <span className="text-lg mt-0.5">📝</span>
              <textarea
                value={form.notes}
                onChange={e => up({ notes: e.target.value })}
                placeholder="Notes"
                rows={2}
                className="flex-1 bg-transparent text-ql text-sm outline-none resize-none placeholder:text-ql-3"
              />
            </div>
          </div>

          {/* Calendar colour */}
          <div className="bg-ql-surface2 rounded-2xl border border-ql p-4">
            <p className="text-ql text-sm font-medium mb-3">Colour</p>
            <div className="flex flex-wrap gap-3">
              {EVENT_COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => up({ color: c.hex })}
                  className="relative w-8 h-8 rounded-full transition-transform"
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                >
                  {form.color === c.hex && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div className="bg-ql-surface2 rounded-2xl border border-ql overflow-hidden">
            <div className="px-4 py-3 border-b border-ql">
              <span className="text-ql text-sm font-medium">🔔 Reminder</span>
            </div>
            {REMINDER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => up({ reminder: opt.value })}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-ql last:border-0 transition-colors hover:bg-ql-surface3"
              >
                <span className={`text-sm ${form.reminder === opt.value ? 'text-ql-accent font-semibold' : 'text-ql'}`}>
                  {opt.label}
                </span>
                {form.reminder === opt.value && <span className="text-ql-accent text-sm">✓</span>}
              </button>
            ))}
          </div>

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}

// ─── Merged sleep & wake card (targets + log) ────────────────────────────────
function SleepWakeCard({ date }: { date: string }) {
  const { wakeQuest, bedTime, setWakeTarget, setBedTime, sleepLog, checkInWake, logSleep, deleteWakeCheckIn, deleteSleepEntry, clockFormat } = useGameStore();
  const fmt = (t: string) => fmtTime(t, clockFormat);
  const [editWake, setEditWake] = useState(false);
  const [newWake, setNewWake]   = useState(wakeQuest.targetTime);
  const [editBed, setEditBed]   = useState(false);
  const [newBed, setNewBed]     = useState(bedTime);

  const isPast     = date <= todayStr();
  const wakeEntry  = wakeQuest.checkIns.find(c => c.date === date);
  const sleepEntry = sleepLog.find(e => e.date === date);

  return (
    <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql overflow-hidden">
      {/* Sleep row */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-ql">
        <span className="text-base shrink-0">🌙</span>
        <div className="flex-1 min-w-0">
          <p className="text-ql text-xs font-medium">Sleep</p>
          {editBed ? (
            <div className="flex gap-1.5 items-center mt-1">
              <input type="time" value={newBed} onChange={e => setNewBed(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="bg-ql-surface2 border border-ql rounded-lg px-2 py-1 text-xs text-ql outline-none focus:border-ql-accent"
              />
              <button onClick={() => { setBedTime(newBed); setEditBed(false); }}
                className="px-2 py-1 bg-ql-accent text-white text-[10px] font-semibold rounded-lg">Save</button>
              <button onClick={() => setEditBed(false)}
                className="px-2 py-1 bg-ql-surface3 text-ql-3 text-[10px] rounded-lg">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEditBed(true)} className="flex items-center gap-1.5 mt-0.5">
              <span className="text-ql-3 text-[10px] tabular-nums">{fmt(bedTime)}</span>
              {sleepEntry ? (
                <span className={`text-[10px] font-medium ${sleepEntry.onTime ? 'text-emerald-400' : 'text-red-400'}`}>
                  · {sleepEntry.onTime ? 'Done ✓' : 'Missed ✗'}
                </span>
              ) : (
                <span className="text-ql-accent text-[9px]">· tap to change</span>
              )}
            </button>
          )}
        </div>
        {isPast && (
          sleepEntry ? (
            <button onClick={() => deleteSleepEntry(sleepEntry.id)} className="text-ql-3 hover:text-red-400 text-xs transition-colors">Clear</button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => logSleep(date, true)}
                className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold rounded-lg">Log</button>
              <button onClick={() => logSleep(date, false)}
                className="px-3 py-1 bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg">Miss</button>
            </div>
          )
        )}
      </div>

      {/* Wake row */}
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="text-base shrink-0">🌅</span>
        <div className="flex-1 min-w-0">
          <p className="text-ql text-xs font-medium">Wake Up</p>
          {editWake ? (
            <div className="flex gap-1.5 items-center mt-1">
              <input type="time" value={newWake} onChange={e => setNewWake(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="bg-ql-surface2 border border-ql rounded-lg px-2 py-1 text-xs text-ql outline-none focus:border-ql-accent"
              />
              <button onClick={() => { setWakeTarget(newWake); setEditWake(false); }}
                className="px-2 py-1 bg-ql-accent text-white text-[10px] font-semibold rounded-lg">Save</button>
              <button onClick={() => setEditWake(false)}
                className="px-2 py-1 bg-ql-surface3 text-ql-3 text-[10px] rounded-lg">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEditWake(true)} className="flex items-center gap-1.5 mt-0.5">
              <span className="text-ql-3 text-[10px] tabular-nums">{fmt(wakeQuest.targetTime)}</span>
              {wakeEntry ? (
                <span className={`text-[10px] font-medium ${wakeEntry.onTime ? 'text-emerald-400' : 'text-red-400'}`}>
                  · {wakeEntry.onTime ? 'Done ✓' : 'Missed ✗'}
                </span>
              ) : (
                <span className="text-ql-accent text-[9px]">· tap to change</span>
              )}
            </button>
          )}
        </div>
        {isPast && (
          wakeEntry ? (
            <button onClick={() => deleteWakeCheckIn(wakeEntry.id)} className="text-ql-3 hover:text-red-400 text-xs transition-colors">Clear</button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => checkInWake(wakeQuest.targetTime, date)}
                className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold rounded-lg">Log</button>
              <button onClick={() => checkInWake('23:59', date)}
                className="px-3 py-1 bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg">Miss</button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Generic metric bar chart ─────────────────────────────────────────────────
function MetricChart({ bars, goal, color = '#4a9eff', goalColor = '#22c55e' }: {
  bars: StepBar[]; goal: number; color?: string; goalColor?: string;
}) {
  const W = 340, H = 140, PAD_L = 8, PAD_R = 44, PAD_T = 8, PAD_B = 20;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const maxVal = Math.max(goal > 0 ? goal * 1.1 : 1, ...bars.map(b => b.value), 1);
  const mag = Math.pow(10, Math.floor(Math.log10(maxVal / 3)));
  const tickStep = Math.ceil((maxVal / 3) / mag) * mag;
  const ticks = Array.from({ length: Math.ceil(maxVal / tickStep) + 1 }, (_, i) => i * tickStep).filter(t => t <= maxVal * 1.05);
  const yPct = (v: number) => 1 - v / maxVal;
  const barW = Math.max(2, (chartW / bars.length) * 0.7);
  const gap  = chartW / bars.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      {ticks.map(t => {
        const y = PAD_T + yPct(t) * chartH;
        return (
          <g key={t}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--ql-surface-3)" strokeWidth="0.5" strokeDasharray="3 3" />
            <text x={W - PAD_R + 4} y={y + 3} fill="var(--ql-tx)" fontSize="8" textAnchor="start">
              {t >= 1000 ? `${(t/1000).toFixed(t % 1000 === 0 ? 0 : 1)}k` : t}
            </text>
          </g>
        );
      })}
      {goal > 0 && (() => {
        const y = PAD_T + yPct(goal) * chartH;
        return <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke={goalColor} strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />;
      })()}
      {bars.map((b, i) => {
        const x  = PAD_L + i * gap + (gap - barW) / 2;
        const bh = Math.max(b.value > 0 ? 2 : 0, yPct(0) * chartH - yPct(b.value) * chartH);
        const by = PAD_T + yPct(b.value) * chartH;
        const c  = b.isToday ? '#7c3aed' : (goal > 0 && b.value >= goal) ? goalColor : color;
        return (
          <g key={i}>
            <rect x={x} y={by} width={barW} height={bh} rx="1.5" fill={c} opacity={b.value === 0 ? 0.25 : 1} />
            {b.value === 0 && <rect x={x} y={PAD_T + chartH - 2} width={barW} height={2} rx="1" fill={c} opacity={0.3} />}
            {b.showLabel && <text x={x + barW / 2} y={H - 3} fill="var(--ql-tx)" fontSize="8" textAnchor="middle">{b.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main calendar page ───────────────────────────────────────────────────────
export default function CalendarPage() {
  const { calendarEvents, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, habitDefs, habitLog, logHabit, unlogHabit, gymPlans, gymSessions, mealLog, nutritionGoal, wakeQuest, sleepLog, stepLog, stepGoal, waterLog, waterGoal, setActiveSection, setTrainingTab, setNutritionTab, disabledSections, clockFormat } = useGameStore();
  const fmt = (t: string) => fmtTime(t, clockFormat);

  const now   = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selected,  setSelected]  = useState(todayStr());
  const [showForm,  setShowForm]  = useState(false);
  const [formInit,  setFormInit]  = useState<Omit<CalendarEvent, 'id'>>(BLANK_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [showFoodDetail,  setShowFoodDetail]  = useState(false);
  const [showWaterDetail, setShowWaterDetail] = useState(false);
  const [foodMetric, setFoodMetric] = useState<'calories'|'protein'|'carbs'|'fat'>('calories');
  const [foodPeriod, setFoodPeriod] = useState<StepPeriod>('W');
  const [waterPeriod, setWaterPeriod] = useState<StepPeriod>('W');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPerm(Notification.permission);
    } else {
      setNotifPerm('unsupported');
    }
  }, []);

  // Schedule notifications for upcoming events with reminders
  useEffect(() => {
    if (notifPerm !== 'granted') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const horizon = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    calendarEvents.forEach(ev => {
      if (!ev.reminder) return;
      const evTime = ev.allDay
        ? new Date(`${ev.date}T00:00:00`).getTime()
        : new Date(`${ev.date}T${ev.startTime}:00`).getTime();
      const notifyAt = evTime - ev.reminder * 60 * 1000;
      const delay = notifyAt - Date.now();
      if (delay > 0 && notifyAt < horizon) {
        timers.push(setTimeout(() => {
          new Notification(`📅 ${ev.title}`, {
            body: ev.allDay
              ? `All day · ${fmtDate(ev.date)}`
              : `${fmt(ev.startTime)} · ${fmtDate(ev.date)}${ev.location ? ` · ${ev.location}` : ''}`,
            icon: '/favicon.ico',
          });
        }, delay));
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [calendarEvents, notifPerm]);

  const requestNotifPerm = async () => {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setNotifPerm(p);
  };

  // Month grid
  const days = getMonthDays(viewYear, viewMonth);

  // Index events by date
  const byDate: Record<string, CalendarEvent[]> = {};
  calendarEvents.forEach(ev => {
    if (!byDate[ev.date]) byDate[ev.date] = [];
    byDate[ev.date].push(ev);
  });

  // Selected day events sorted by time
  const dayEvts = (byDate[selected] ?? []).slice().sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    return a.startTime.localeCompare(b.startTime);
  });

  // Habits due on a given date
  const habitsForDate = (dateStr: string): HabitDef[] => {
    const dow = new Date(dateStr + 'T00:00:00').getDay();
    return habitDefs.filter(h => {
      if (h.scheduleType === 'fortnightly') {
        const weekA = isWeekA(dateStr, h.createdAt);
        return weekA
          ? (h.scheduleDays ?? []).includes(dow)
          : (h.scheduleWeekBDays ?? []).includes(dow);
      }
      return (h.scheduleDays ?? []).includes(dow);
    });
  };

  const isHabitLogged = (habitId: string, date: string) =>
    habitLog.some(e => e.habitId === habitId && e.date === date);

  // Habit dots for a day cell: completed ones + due-but-not-done
  const habitDotsForDate = (dateStr: string) => {
    const due = habitsForDate(dateStr);
    return due.slice(0, 3).map(h => ({
      color: h.color,
      done: isHabitLogged(h.id, dateStr),
    }));
  };

  const dayHabits = habitsForDate(selected);

  // Gym plans due on a given date
  const gymPlansForDate = (dateStr: string) => {
    const dow = new Date(dateStr + 'T00:00:00').getDay();
    return (gymPlans ?? []).filter(p => p.scheduleDays.includes(dow));
  };
  const dayGymPlans = gymPlansForDate(selected);

  const gymSessionsOnDate = (dateStr: string) =>
    (gymSessions ?? []).filter(s => s.date.slice(0, 10) === dateStr);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelected(todayStr());
  };

  const openAdd = (date: string) => {
    setFormInit({ ...BLANK_FORM, date });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    const { id, ...rest } = ev;
    setFormInit(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleSave = (ev: Omit<CalendarEvent, 'id'>) => {
    if (editingId) {
      updateCalendarEvent(editingId, ev);
    } else {
      addCalendarEvent(ev);
    }
    setShowForm(false);
    setEditingId(null);
    setSelected(ev.date);
    const d = new Date(ev.date + 'T00:00:00');
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const selDate = new Date(selected + 'T00:00:00');
  const today   = todayStr();

  return (
    <>
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0">
      {/* ── Month header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl bg-ql-surface2 border border-ql text-ql text-sm">‹</button>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl bg-ql-surface2 border border-ql text-ql text-sm">›</button>
        </div>
        <h2 className="text-ql text-lg font-bold">
          {MONTHS[viewMonth]} {viewYear}
        </h2>
        <button
          onClick={goToday}
          className="text-ql-accent text-xs font-semibold px-3 py-1.5 rounded-xl bg-ql-surface2 border border-ql"
        >
          Today
        </button>
      </div>

      {/* ── Day-of-week headers ── */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-ql-3 text-[10px] font-semibold py-1">{d}</div>
        ))}
      </div>

      {/* ── Month grid ── */}
      <div className="grid grid-cols-7 gap-y-1 mb-4">
        {days.map((day, i) => {
          const ds           = toDateStr(day);
          const inMonth      = day.getMonth() === viewMonth;
          const isToday      = ds === today;
          const isSelected   = ds === selected;
          const evts         = byDate[ds] ?? [];

          return (
            <button
              key={i}
              onClick={() => setSelected(ds)}
              className="flex flex-col items-center py-1"
            >
              <span className={`
                w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold transition-colors
                ${isToday    ? 'bg-ql-accent text-white'                                                        : ''}
                ${isSelected && !isToday ? 'ring-2 ring-ql-accent bg-white/10 text-ql'                         : ''}
                ${!isToday && !isSelected && inMonth  ? 'bg-white/8 text-ql'                                   : ''}
                ${!isToday && !isSelected && !inMonth ? 'text-ql-3 opacity-35'                                 : ''}
              `}>
                {day.getDate()}
              </span>
              {/* Event + habit + gym + sleep/wake dots */}
              <div className="flex gap-0.5 mt-0.5 h-2 items-center">
                {evts.slice(0, 1).map((ev, j) => (
                  <div key={`e${j}`} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ev.color }} />
                ))}
                {habitDotsForDate(ds).slice(0, 1).map((h, j) => (
                  <div key={`h${j}`} className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: h.color, opacity: h.done ? 1 : 0.35 }}
                  />
                ))}
                {gymPlansForDate(ds).slice(0, 1).map((p, j) => (
                  <div key={`g${j}`} className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: p.color, opacity: gymSessionsOnDate(ds).some(s => s.planId === p.id) ? 1 : 0.35 }}
                  />
                ))}
                {/* Sleep dot — indigo, fades if not logged */}
                {ds <= today && !disabledSections.includes('sleep') && !disabledSections.includes('wake') && (
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    wakeQuest.checkIns.some(c => c.date === ds) || sleepLog.some(e => e.date === ds)
                      ? 'bg-indigo-400'
                      : 'bg-indigo-400/25'
                  }`} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Day accuracy ring ── */}
      {(() => {
        if (selected > today) return null;
        if (disabledSections.includes('stats')) return null;
        const habitsDue  = dayHabits.length;
        const habitsDone = dayHabits.filter(h => isHabitLogged(h.id, selected)).length;
        const sleepDisabled = disabledSections.includes('sleep');
        const wakeDisabled  = disabledSections.includes('wake');
        const sleepDone  = !sleepDisabled && sleepLog.some(e => e.date === selected) ? 1 : 0;
        const wakeDone   = !wakeDisabled  && wakeQuest.checkIns.some(c => c.date === selected) ? 1 : 0;
        const sleepWakeTotal = (sleepDisabled ? 0 : 1) + (wakeDisabled ? 0 : 1);
        const stepsDone  = stepGoal > 0 && (stepLog.find(e => e.date === selected)?.steps ?? 0) >= stepGoal ? 1 : 0;
        const total      = habitsDue + sleepWakeTotal + (stepGoal > 0 ? 1 : 0);
        const done       = habitsDone + sleepDone + wakeDone + stepsDone;
        const pct        = total > 0 ? done / total : 0;
        const R = 22; const C = 28; const circ = 2 * Math.PI * R;
        const color = pct >= 1 ? '#34c759' : pct >= 0.5 ? '#4a9eff' : '#ff9500';
        return (
          <div className="flex items-center justify-center py-2 mb-1">
            <div className="flex items-center gap-3 bg-ql-surface2 rounded-2xl border border-ql px-4 py-2.5">
              <svg width={C * 2} height={C * 2} viewBox={`0 0 ${C*2} ${C*2}`} className="-rotate-90">
                <circle cx={C} cy={C} r={R} fill="none" stroke="currentColor" strokeWidth={4} className="text-ql-surface3" />
                <circle cx={C} cy={C} r={R} fill="none" stroke={color} strokeWidth={4}
                  strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
              </svg>
              <div>
                <p className="text-ql text-base font-bold tabular-nums" style={{ color }}>{Math.round(pct * 100)}%</p>
                <p className="text-ql-3 text-[10px]">Day accuracy</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Selected day ── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-ql text-sm font-bold">
            {selected === today ? 'Today' : selDate.toLocaleDateString('en-GB', { weekday: 'long' })}
            {selected !== today && (
              <span className="text-ql-3 font-normal ml-1.5">
                {selDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </p>
          <p className="text-ql-3 text-xs">
            {dayEvts.length === 0 ? 'No events' : `${dayEvts.length} event${dayEvts.length > 1 ? 's' : ''}`}
            {dayHabits.length > 0 && ` · ${dayHabits.filter(h => isHabitLogged(h.id, selected)).length}/${dayHabits.length} habits`}
          </p>
        </div>
        <button
          onClick={() => openAdd(selected)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-ql-accent text-white text-xs font-semibold rounded-xl"
        >
          <span className="text-base leading-none">+</span> Add
        </button>
      </div>

      {/* Event list */}
      <div className="flex flex-col gap-2">
        {dayEvts.length === 0 ? (
          <button
            onClick={() => openAdd(selected)}
            className="bg-ql-surface rounded-2xl border border-dashed border-ql p-6 text-center"
          >
            <p className="text-ql-3 text-sm">No events on this day</p>
            <p className="text-ql-accent text-xs mt-1 font-medium">Tap to add one</p>
          </button>
        ) : (
          dayEvts.map(ev => (
            <div
              key={ev.id}
              className="bg-ql-surface rounded-2xl border border-ql px-4 py-3 flex items-start gap-3"
            >
              {/* Colour bar */}
              <div className="w-1 self-stretch rounded-full mt-0.5 shrink-0" style={{ backgroundColor: ev.color }} />

              <div className="flex-1 min-w-0">
                <p className="text-ql text-sm font-semibold leading-tight">{ev.title}</p>
                <p className="text-ql-3 text-xs mt-0.5">
                  {ev.allDay ? 'All day' : `${fmt(ev.startTime)} – ${fmt(ev.endTime)}`}
                </p>
                {ev.location && (
                  <p className="text-ql-3 text-xs mt-0.5 flex items-center gap-1">
                    <span>📍</span>{ev.location}
                  </p>
                )}
                {ev.notes && (
                  <p className="text-ql-3 text-xs mt-1 leading-relaxed">{ev.notes}</p>
                )}
                {ev.reminder > 0 && (
                  <p className="text-ql-3 text-[10px] mt-1">
                    🔔 {REMINDER_OPTIONS.find(r => r.value === ev.reminder)?.label}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1 items-end shrink-0">
                <button
                  onClick={() => openEdit(ev)}
                  className="text-ql-3 hover:text-ql text-xs transition-colors px-2 py-0.5 rounded-lg"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteCalendarEvent(ev.id)}
                  className="text-ql-3 hover:text-red-500 text-xs transition-colors px-2 py-0.5 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Habits for this day ── */}
      {dayHabits.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-ql text-xs font-semibold text-ql-3 uppercase tracking-wide">Habits</p>
          {dayHabits.map(habit => {
            const logged  = isHabitLogged(habit.id, selected);
            const isPast  = selected <= todayStr();
            const dow       = new Date(selected + 'T00:00:00').getDay();
            const startStr  = (habit.dayTimes    ?? {})[String(dow)];
            const endStr    = (habit.dayEndTimes ?? {})[String(dow)];
            const timeLabel = startStr
              ? endStr ? `${fmt(startStr)} – ${fmt(endStr)}` : fmt(startStr)
              : '';
            return (
              <div
                key={habit.id}
                className={`bg-ql-surface rounded-2xl border px-4 py-3 flex items-center gap-3 transition-all ${
                  logged ? 'border-ql-accent/30 opacity-80' : 'border-ql'
                }`}
              >
                <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
                <HabitEmoji emoji={habit.emoji} className="text-base" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${logged ? 'line-through text-ql-3' : 'text-ql'}`}>
                    {habit.name}
                  </p>
                  {timeLabel && <p className="text-ql-3 text-[10px] mt-0.5">{timeLabel}</p>}
                </div>
                {isPast && (
                  <button
                    onClick={() => logged ? unlogHabit(habit.id, selected) : logHabit(habit.id, selected)}
                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0"
                    style={{ backgroundColor: logged ? habit.color : 'transparent', borderColor: habit.color }}
                  >
                    {logged && <span className="text-white text-xs font-bold">✓</span>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sleep & wake log for selected day ── */}
      {!disabledSections.includes('sleep') && !disabledSections.includes('wake') && (
        <div className="mt-2">
          <SleepWakeCard date={selected} />
        </div>
      )}

      {/* ── Gym plans for this day ── */}
      {dayGymPlans.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-ql text-xs font-semibold text-ql-3 uppercase tracking-wide">Gym</p>
          {dayGymPlans.map(plan => {
            const done = gymSessionsOnDate(selected).some(s => s.planId === plan.id);
            return (
              <div key={plan.id}
                className={`bg-ql-surface rounded-2xl border px-4 py-3 flex items-center gap-3 transition-all ${
                  done ? 'border-ql-accent/30 opacity-80' : 'border-ql'
                }`}
              >
                <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: plan.color }} />
                <span className="text-base">{plan.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'line-through text-ql-3' : 'text-ql'}`}>{plan.name}</p>
                  <p className="text-ql-3 text-[10px] mt-0.5">
                    {plan.exercises.length} exercise{plan.exercises.length !== 1 ? 's' : ''}
                    {plan.scheduleTime ? ` · ${fmt(plan.scheduleTime)}` : ''}
                  </p>
                </div>
                {done && <span className="text-ql-accent text-xs font-bold">Done</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Steps / Nutrition / Hydration for selected day ── */}
      {!disabledSections.includes('stats') && (() => {
        const isToday  = selected === today;

        // Steps
        const selSteps = stepLog.find(e => e.date === selected)?.steps ?? 0;
        const stepPct  = stepGoal > 0 ? Math.min(100, (selSteps / stepGoal) * 100) : 0;
        const stepsHit = selSteps >= stepGoal && stepGoal > 0;

        // Nutrition
        const dayMeals = mealLog.filter(m => m.date === selected);
        const totCal   = dayMeals.reduce((s, m) => s + m.calories, 0);
        const totP     = dayMeals.reduce((s, m) => s + m.protein, 0);
        const totC     = dayMeals.reduce((s, m) => s + m.carbs, 0);
        const totF     = dayMeals.reduce((s, m) => s + m.fat, 0);
        const calPct   = nutritionGoal.calories > 0 ? Math.min(100, (totCal / nutritionGoal.calories) * 100) : 0;
        const calHit   = totCal >= nutritionGoal.calories && nutritionGoal.calories > 0;

        // Hydration
        const selWater = waterLog.filter(e => e.date === selected).reduce((s, e) => s + e.amount, 0);
        const waterPct = waterGoal > 0 ? Math.min(100, (selWater / waterGoal) * 100) : 0;
        const waterHit = selWater >= waterGoal && waterGoal > 0;
        const fmtMl    = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}L` : `${n}ml`;

        const hasAnyData = selSteps > 0 || dayMeals.length > 0 || selWater > 0;
        if (!isToday && !hasAnyData) return null;

        return (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-ql text-xs font-semibold text-ql-3 uppercase tracking-wide">Stats</p>

            {/* Steps */}
            <button
              onClick={() => { setTrainingTab('steps'); setActiveSection('training'); }}
              className="bg-ql-surface rounded-2xl border border-ql px-4 py-3 text-left w-full"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-ql text-sm font-semibold">👟 {selSteps.toLocaleString()} steps</span>
                <span className={`text-xs font-semibold ${stepsHit ? 'text-green-400' : 'text-ql-3'}`}>
                  {stepsHit ? 'Goal hit ✓' : `/ ${stepGoal.toLocaleString()}`}
                </span>
              </div>
              <div className="h-1.5 bg-ql-surface3 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${stepsHit ? 'bg-green-500' : 'bg-blue-400'}`} style={{ width: `${stepPct}%` }} />
              </div>
            </button>

            {/* Nutrition */}
            {(isToday || dayMeals.length > 0) && (
              <button
                onClick={() => setShowFoodDetail(true)}
                className="bg-ql-surface rounded-2xl border border-ql px-4 py-3 text-left w-full"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-ql text-sm font-semibold">🥗 {totCal} kcal</span>
                  <span className={`text-xs font-semibold ${calHit ? 'text-green-400' : 'text-ql-3'}`}>
                    {calHit ? 'Goal hit ✓' : dayMeals.length > 0 ? `${dayMeals.length} meal${dayMeals.length !== 1 ? 's' : ''}` : '—'}
                  </span>
                </div>
                <div className="h-1.5 bg-ql-surface3 rounded-full overflow-hidden mb-1.5">
                  <div className={`h-full rounded-full transition-all duration-700 ${calHit ? 'bg-green-500' : 'bg-emerald-500'}`} style={{ width: `${calPct}%` }} />
                </div>
                {dayMeals.length > 0 && (
                  <div className="flex justify-between text-[10px] text-ql-3">
                    <span>P: {totP}g</span><span>C: {totC}g</span><span>F: {totF}g</span>
                  </div>
                )}
              </button>
            )}

            {/* Hydration */}
            <button
              onClick={() => setShowWaterDetail(true)}
              className="bg-ql-surface rounded-2xl border border-ql px-4 py-3 text-left w-full"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-ql text-sm font-semibold">💧 {fmtMl(selWater)}</span>
                <span className={`text-xs font-semibold ${waterHit ? 'text-green-400' : 'text-ql-3'}`}>
                  {waterHit ? 'Goal hit ✓' : `/ ${fmtMl(waterGoal)}`}
                </span>
              </div>
              <div className="h-1.5 bg-ql-surface3 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${waterHit ? 'bg-green-500' : 'bg-sky-400'}`} style={{ width: `${waterPct}%` }} />
              </div>
            </button>
          </div>
        );
      })()}

      {/* ── Notification permission ── */}
      {notifPerm !== 'unsupported' && notifPerm !== 'granted' && (
        <div className="mt-4 bg-ql-surface rounded-2xl border border-ql p-4 flex items-center gap-3">
          <span className="text-xl">🔔</span>
          <div className="flex-1">
            <p className="text-ql text-xs font-semibold">
              {notifPerm === 'denied' ? 'Notifications blocked' : 'Enable event reminders'}
            </p>
            <p className="text-ql-3 text-[10px] mt-0.5">
              {notifPerm === 'denied'
                ? 'Allow in browser settings to receive event alerts'
                : 'Get notified before your events'}
            </p>
          </div>
          {notifPerm === 'default' && (
            <button
              onClick={requestNotifPerm}
              className="px-3 py-1.5 bg-ql-accent text-white text-xs font-semibold rounded-xl shrink-0"
            >
              Enable
            </button>
          )}
        </div>
      )}

      {/* Add event sheet */}
      {showForm && (
        <EventSheet
          initial={formInit}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
      </div>
    </div>

    {/* ── Food Detail Sheet ── */}
    {showFoodDetail && (() => {
      const PERIODS: StepPeriod[] = ['W', 'M', '6M', 'Y'];
      const PERIOD_LABELS: Record<StepPeriod, string> = { W: 'Week', M: 'Month', '6M': '6 Months', Y: 'Year' };
      const METRICS: { key: 'calories'|'protein'|'carbs'|'fat'; label: string; unit: string; color: string; goal: number }[] = [
        { key: 'calories', label: 'Calories', unit: 'kcal', color: '#f97316', goal: nutritionGoal.calories },
        { key: 'protein',  label: 'Protein',  unit: 'g',    color: '#4a9eff', goal: nutritionGoal.protein  },
        { key: 'carbs',    label: 'Carbs',    unit: 'g',    color: '#a78bfa', goal: nutritionGoal.carbs    },
        { key: 'fat',      label: 'Fat',      unit: 'g',    color: '#fb923c', goal: nutritionGoal.fat      },
      ];
      const m = METRICS.find(x => x.key === foodMetric)!;

      // Build byDate for selected metric
      const byDate: Record<string, number> = {};
      mealLog.forEach(ml => {
        byDate[ml.date] = (byDate[ml.date] ?? 0) + (ml[foodMetric] ?? 0);
      });

      const chartBars = foodPeriod === 'W' ? buildDailyBars(byDate, 7)
                      : foodPeriod === 'M' ? buildDailyBars(byDate, 30)
                      : foodPeriod === '6M' ? buildWeeklyBars(byDate, 26)
                      : buildMonthlyBars(byDate, 12);

      const activeBars = chartBars.filter(b => b.value > 0);
      const chartAvg = activeBars.length ? Math.round(activeBars.reduce((s, b) => s + b.value, 0) / activeBars.length) : 0;
      const goalHit  = chartBars.filter(b => m.goal > 0 && b.value >= m.goal).length;

      const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const rangeEnd = new Date();
      const rangeStart = new Date();
      if (foodPeriod === 'W')  rangeStart.setDate(rangeStart.getDate() - 6);
      if (foodPeriod === 'M')  rangeStart.setDate(rangeStart.getDate() - 29);
      if (foodPeriod === '6M') rangeStart.setMonth(rangeStart.getMonth() - 6);
      if (foodPeriod === 'Y')  rangeStart.setFullYear(rangeStart.getFullYear() - 1);
      const rangeLabel = `${fmtDate(rangeStart)} – ${fmtDate(rangeEnd)}`;

      const allDates = [...new Set(mealLog.map(ml => ml.date))].sort().reverse();

      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-ql-bg">
          <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-ql shrink-0">
            <h2 className="text-ql font-bold text-base">🥗 Food History</h2>
            <button onClick={() => setShowFoodDetail(false)} className="text-ql-3 text-xs border border-ql rounded-xl px-3 py-1.5">Close</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

            {/* Metric selector */}
            <div className="flex gap-1.5 bg-ql-surface2 rounded-2xl p-1 border border-ql">
              {METRICS.map(metric => (
                <button key={metric.key} onClick={() => setFoodMetric(metric.key)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${foodMetric === metric.key ? 'bg-ql-accent text-white shadow-ql-sm' : 'text-ql-3'}`}>
                  {metric.label}
                </button>
              ))}
            </div>

            {/* Chart card */}
            <div className="bg-ql-surface rounded-2xl border border-ql p-4">
              {/* Period toggle */}
              <div className="flex bg-ql-surface2 rounded-2xl p-1 border border-ql mb-4">
                {PERIODS.map(p => (
                  <button key={p} onClick={() => setFoodPeriod(p)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${foodPeriod === p ? 'bg-ql-accent text-white' : 'text-ql-3'}`}>
                    {p}
                  </button>
                ))}
              </div>

              <p className="text-ql-3 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Daily Average</p>
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-ql text-3xl font-bold tabular-nums">{chartAvg.toLocaleString()}</span>
                <span className="text-ql-3 text-sm">{m.unit}</span>
              </div>
              <p className="text-ql-3 text-[11px] mb-3">{rangeLabel}</p>

              <MetricChart bars={chartBars} goal={m.goal} color={m.color} />

              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-ql-3 text-[10px]">Goal hit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-ql-3 text-[10px]">Today</span>
                </div>
                {m.goal > 0 && <span className="ml-auto text-ql-3 text-[10px]">Goal: {m.goal}{m.unit}</span>}
              </div>

              {/* Summary tiles */}
              <div className="flex gap-2 mt-4">
                <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
                  <p className="text-ql text-sm font-bold tabular-nums">{chartAvg.toLocaleString()}</p>
                  <p className="text-ql-3 text-[10px]">Avg ({PERIOD_LABELS[foodPeriod]})</p>
                </div>
                {m.goal > 0 && (
                  <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
                    <p className="text-ql text-sm font-bold">{goalHit}/{chartBars.length}</p>
                    <p className="text-ql-3 text-[10px]">Goals hit</p>
                  </div>
                )}
                <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
                  <p className="text-ql text-sm font-bold tabular-nums">{allDates.length}</p>
                  <p className="text-ql-3 text-[10px]">Days logged</p>
                </div>
              </div>
            </div>

            {/* Per-day meal log */}
            <div className="flex flex-col gap-3">
              {allDates.length === 0 && <p className="text-ql-3 text-sm text-center py-8">No meals logged yet</p>}
              {allDates.map(date => {
                const meals   = mealLog.filter(ml => ml.date === date);
                const totCal  = meals.reduce((s, ml) => s + (ml.calories ?? 0), 0);
                const totProt = meals.reduce((s, ml) => s + (ml.protein  ?? 0), 0);
                const totCarb = meals.reduce((s, ml) => s + (ml.carbs    ?? 0), 0);
                const totFat  = meals.reduce((s, ml) => s + (ml.fat      ?? 0), 0);
                const pct = nutritionGoal.calories > 0 ? Math.min(100, Math.round(totCal / nutritionGoal.calories * 100)) : null;
                return (
                  <div key={date} className="bg-ql-surface rounded-2xl border border-ql p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-ql text-sm font-semibold">{new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      <span className="text-ql-3 text-xs">{totCal} kcal{pct !== null ? ` · ${pct}%` : ''}</span>
                    </div>
                    {pct !== null && (
                      <div className="h-1.5 bg-ql-surface2 rounded-full mb-2 overflow-hidden">
                        <div className="h-full bg-ql-accent rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    <div className="flex gap-3 text-[10px] text-ql-3 mb-2">
                      <span>P: <span className="text-ql font-semibold">{totProt}g</span></span>
                      <span>C: <span className="text-ql font-semibold">{totCarb}g</span></span>
                      <span>F: <span className="text-ql font-semibold">{totFat}g</span></span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {meals.map(ml => (
                        <div key={ml.id} className="flex items-center justify-between">
                          <span className="text-ql text-xs">{ml.name}</span>
                          <span className="text-ql-3 text-[10px]">{ml.calories}kcal · P:{ml.protein}g C:{ml.carbs}g F:{ml.fat}g</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    })()}

    {/* ── Water Detail Sheet ── */}
    {showWaterDetail && (() => {
      const PERIODS: StepPeriod[] = ['W', 'M', '6M', 'Y'];
      const PERIOD_LABELS: Record<StepPeriod, string> = { W: 'Week', M: 'Month', '6M': '6 Months', Y: 'Year' };

      const byDate: Record<string, number> = {};
      waterLog.forEach(w => { byDate[w.date] = (byDate[w.date] ?? 0) + w.amount; });

      const chartBars = waterPeriod === 'W' ? buildDailyBars(byDate, 7)
                      : waterPeriod === 'M' ? buildDailyBars(byDate, 30)
                      : waterPeriod === '6M' ? buildWeeklyBars(byDate, 26)
                      : buildMonthlyBars(byDate, 12);

      const activeBars = chartBars.filter(b => b.value > 0);
      const chartAvg = activeBars.length ? Math.round(activeBars.reduce((s, b) => s + b.value, 0) / activeBars.length) : 0;
      const goalHit  = chartBars.filter(b => waterGoal > 0 && b.value >= waterGoal).length;
      const fmtMl    = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}L` : `${n}ml`;

      const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const rangeEnd = new Date();
      const rangeStart = new Date();
      if (waterPeriod === 'W')  rangeStart.setDate(rangeStart.getDate() - 6);
      if (waterPeriod === 'M')  rangeStart.setDate(rangeStart.getDate() - 29);
      if (waterPeriod === '6M') rangeStart.setMonth(rangeStart.getMonth() - 6);
      if (waterPeriod === 'Y')  rangeStart.setFullYear(rangeStart.getFullYear() - 1);
      const rangeLabel = `${fmtDate(rangeStart)} – ${fmtDate(rangeEnd)}`;

      const allWaterDates = [...new Set(waterLog.map(w => w.date))].sort().reverse();

      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-ql-bg">
          <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-ql shrink-0">
            <h2 className="text-ql font-bold text-base">💧 Hydration History</h2>
            <button onClick={() => setShowWaterDetail(false)} className="text-ql-3 text-xs border border-ql rounded-xl px-3 py-1.5">Close</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

            {/* Chart card */}
            <div className="bg-ql-surface rounded-2xl border border-ql p-4">
              {/* Period toggle */}
              <div className="flex bg-ql-surface2 rounded-2xl p-1 border border-ql mb-4">
                {PERIODS.map(p => (
                  <button key={p} onClick={() => setWaterPeriod(p)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${waterPeriod === p ? 'bg-ql-accent text-white' : 'text-ql-3'}`}>
                    {p}
                  </button>
                ))}
              </div>

              <p className="text-ql-3 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Daily Average</p>
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-ql text-3xl font-bold tabular-nums">{fmtMl(chartAvg)}</span>
              </div>
              <p className="text-ql-3 text-[11px] mb-3">{rangeLabel}</p>

              <MetricChart bars={chartBars} goal={waterGoal} color="#38bdf8" />

              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-ql-3 text-[10px]">Goal hit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-ql-3 text-[10px]">Today</span>
                </div>
                {waterGoal > 0 && <span className="ml-auto text-ql-3 text-[10px]">Goal: {fmtMl(waterGoal)}</span>}
              </div>

              {/* Summary tiles */}
              <div className="flex gap-2 mt-4">
                <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
                  <p className="text-ql text-sm font-bold tabular-nums">{fmtMl(chartAvg)}</p>
                  <p className="text-ql-3 text-[10px]">Avg ({PERIOD_LABELS[waterPeriod]})</p>
                </div>
                <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
                  <p className="text-ql text-sm font-bold">{goalHit}/{chartBars.length}</p>
                  <p className="text-ql-3 text-[10px]">Goals hit</p>
                </div>
                <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
                  <p className="text-ql text-sm font-bold tabular-nums">{allWaterDates.length}</p>
                  <p className="text-ql-3 text-[10px]">Days logged</p>
                </div>
              </div>
            </div>

            {/* Per-day water log */}
            <div className="flex flex-col gap-2">
              {allWaterDates.length === 0 && <p className="text-ql-3 text-sm text-center py-8">No water logged yet</p>}
              {allWaterDates.map(date => {
                const total = waterLog.filter(w => w.date === date).reduce((s, w) => s + w.amount, 0);
                const pct   = waterGoal > 0 ? Math.min(100, Math.round(total / waterGoal * 100)) : null;
                const color = pct === null ? 'bg-ql-accent' : pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-500/70';
                return (
                  <div key={date} className="bg-ql-surface rounded-2xl border border-ql p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-ql text-sm font-semibold">{new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      <span className="text-ql-3 text-xs">{fmtMl(total)}{pct !== null ? ` · ${pct}%` : ''}</span>
                    </div>
                    {pct !== null && (
                      <div className="h-1.5 bg-ql-surface2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    })()}
    </>
  );
}
