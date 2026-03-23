'use client';

import { useState, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { HabitDef } from '@/types';
import HabitEmoji from '../shared/HabitEmoji';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HABIT_COLORS = [
  { hex: '#34c759', label: 'Green'    },
  { hex: '#007aff', label: 'Blue'     },
  { hex: '#ff9500', label: 'Orange'   },
  { hex: '#ff3b30', label: 'Red'      },
  { hex: '#af52de', label: 'Purple'   },
  { hex: '#5ac8fa', label: 'Teal'     },
  { hex: '#ffcc00', label: 'Yellow'   },
  { hex: '#ff2d55', label: 'Pink'     },
  { hex: '#a2845e', label: 'Brown'    },
  { hex: '#636366', label: 'Graphite' },
];

const PRESET_HABITS = [
  { name: 'Study',       emoji: '📖', color: '#ff9500' },
  { name: 'Reading',     emoji: '📚', color: '#007aff' },
  { name: 'Running',     emoji: '🏃', color: '#34c759' },
  { name: 'Gym',         emoji: '💪', color: '#ff3b30' },
  { name: 'Meditation',  emoji: '🧘', color: '#af52de' },
  { name: 'Cold Shower', emoji: '🚿', color: '#5ac8fa' },
  { name: 'No Alcohol',  emoji: '🚫', color: '#ff9500' },
  { name: 'Journaling',  emoji: '✏️', color: '#a2845e' },
  { name: 'Stretching',  emoji: '🤸', color: '#ffcc00' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekDates(): string[] {
  const today  = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toDateStr(d);
  });
}

function isWeekA(dateStr: string, createdAt: string): boolean {
  const getMonday = (d: Date) => {
    const dd = new Date(d);
    dd.setDate(dd.getDate() - (dd.getDay() === 0 ? 6 : dd.getDay() - 1));
    dd.setHours(0, 0, 0, 0);
    return dd;
  };
  const weeks = Math.round(
    (getMonday(new Date(dateStr + 'T00:00:00')).getTime() -
     getMonday(new Date(createdAt)).getTime()) /
    (7 * 24 * 60 * 60 * 1000)
  );
  return weeks % 2 === 0;
}

function isDueOn(habit: HabitDef, dateStr: string): boolean {
  const dow = new Date(dateStr + 'T00:00:00').getDay();
  if (habit.scheduleType === 'fortnightly') {
    return isWeekA(dateStr, habit.createdAt)
      ? habit.scheduleDays.includes(dow)
      : (habit.scheduleWeekBDays ?? []).includes(dow);
  }
  return (habit.scheduleDays ?? []).includes(dow);
}

function fmt12(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`;
}

function buildScheduleLabel(h: HabitDef): string {
  const daysStr = (days: number[]) =>
    days.length === 0 ? 'None'
    : days.length === 7 ? 'Every day'
    : days.map(d => DAY_LABEL[d]).join(', ');

  if (h.scheduleType === 'fortnightly') {
    return `Wk A: ${daysStr(h.scheduleDays ?? [])} / Wk B: ${daysStr(h.scheduleWeekBDays ?? [])}`;
  }
  return daysStr(h.scheduleDays ?? []);
}

// ─── Day pills + per-day time inputs ─────────────────────────────────────────
interface DayPickerProps {
  selected: number[];
  onChange: (days: number[]) => void;
  times: Record<string, string>;
  endTimes: Record<string, string>;
  onTimeChange: (day: number, time: string) => void;
  onEndTimeChange: (day: number, time: string) => void;
  color: string;
}

function DayPicker({ selected, onChange, times, endTimes, onTimeChange, onEndTimeChange, color }: DayPickerProps) {
  const toggle = (d: number) =>
    onChange(selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d].sort());

  return (
    <div className="flex flex-col gap-2">
      {/* Pills row */}
      <div className="flex gap-1">
        {DAY_SHORT.map((lbl, i) => (
          <button key={i} type="button" onClick={() => toggle(i)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-all"
            style={selected.includes(i)
              ? { backgroundColor: color, borderColor: color, color: '#fff' }
              : { backgroundColor: 'transparent', borderColor: 'var(--ql-border)', color: 'var(--ql-3)' }}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Per-day time inputs */}
      {selected.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {selected.map(d => (
            <div key={d} className="bg-ql-surface2 rounded-xl px-3 py-2.5 border border-ql flex flex-col gap-1.5">
              <span className="text-ql text-xs font-semibold">{DAY_FULL[d]}</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex flex-col gap-0.5">
                  <span className="text-ql-3 text-[10px]">Start</span>
                  <input
                    type="time"
                    value={times[String(d)] ?? ''}
                    onChange={e => onTimeChange(d, e.target.value)}
                    className="w-full bg-ql-input border border-ql-input rounded-lg px-2.5 py-1.5 text-xs text-ql outline-none focus:border-ql-accent transition-colors"
                    style={{ height: 32 }}
                  />
                </div>
                <span className="text-ql-3 text-xs mt-4">→</span>
                <div className="flex-1 flex flex-col gap-0.5">
                  <span className="text-ql-3 text-[10px]">End / Bedtime</span>
                  <input
                    type="time"
                    value={endTimes[String(d)] ?? ''}
                    onChange={e => onEndTimeChange(d, e.target.value)}
                    className="w-full bg-ql-input border border-ql-input rounded-lg px-2.5 py-1.5 text-xs text-ql outline-none focus:border-ql-accent transition-colors"
                    style={{ height: 32 }}
                  />
                </div>
                {(times[String(d)] || endTimes[String(d)]) && (
                  <button
                    onClick={() => { onTimeChange(d, ''); onEndTimeChange(d, ''); }}
                    className="text-ql-3 hover:text-ql text-xs mt-4 px-1"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add / Edit sheet ─────────────────────────────────────────────────────────
interface SheetProps {
  onClose: () => void;
  onSave: (def: Omit<HabitDef, 'id' | 'createdAt'>) => void;
  initial?: HabitDef | null;
}

function AddHabitSheet({ onClose, onSave, initial }: SheetProps) {
  const [name,      setName]      = useState(initial?.name ?? '');
  const [emoji,     setEmoji]     = useState(initial?.emoji ?? '⭐');
  const imgPickerRef = useRef<HTMLInputElement>(null);
  const [color,     setColor]     = useState(initial?.color ?? '#34c759');
  const [schedType, setSchedType] = useState<HabitDef['scheduleType']>(initial?.scheduleType ?? 'days');
  const [daysA,     setDaysA]     = useState<number[]>(initial?.scheduleDays      ?? [1, 2, 3, 4, 5]);
  const [daysB,     setDaysB]     = useState<number[]>(initial?.scheduleWeekBDays ?? []);
  const [dayTimes,    setDayTimes]    = useState<Record<string, string>>(initial?.dayTimes    ?? {});
  const [dayEndTimes, setDayEndTimes] = useState<Record<string, string>>(initial?.dayEndTimes ?? {});

  const setTime = (day: number, time: string) =>
    setDayTimes(prev => {
      const next = { ...prev };
      if (time) next[String(day)] = time; else delete next[String(day)];
      return next;
    });

  const setEndTime = (day: number, time: string) =>
    setDayEndTimes(prev => {
      const next = { ...prev };
      if (time) next[String(day)] = time; else delete next[String(day)];
      return next;
    });

  const canSave = name.trim().length > 0 && daysA.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl p-5 pb-10 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-ql text-base font-bold">{initial ? 'Edit Habit' : 'New Habit'}</h3>
          <button onClick={onClose} className="text-ql-3 text-2xl leading-none">×</button>
        </div>

        {/* Presets */}
        {!initial && (
          <div>
            <p className="text-ql-3 text-xs font-medium mb-2">Quick pick</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {PRESET_HABITS.map(p => (
                <button key={p.name}
                  onClick={() => { setName(p.name); setEmoji(p.emoji); setColor(p.color); }}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all ${
                    name === p.name ? 'border-ql-accent bg-ql-surface2' : 'border-ql bg-ql-surface'
                  }`}
                >
                  <span className="text-xl">{p.emoji}</span>
                  <span className="text-[10px] text-ql">{p.name}</span>
                </button>
              ))}
              {/* Custom tile */}
              <button
                onClick={() => { setName(''); setEmoji('⭐'); imgPickerRef.current?.click(); }}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all border-dashed ${
                  !PRESET_HABITS.some(p => p.name === name) ? 'border-ql-accent bg-ql-surface2' : 'border-ql bg-ql-surface'}`}
              >
                <span className="text-xl">📸</span>
                <span className="text-[10px] text-ql">Custom</span>
              </button>
              <input ref={imgPickerRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setEmoji(ev.target?.result as string);
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        )}

        {/* Name + emoji */}
        <div className="flex gap-2 items-center">
          {emoji.startsWith('data:') ? (
            <div className="relative w-14 shrink-0">
              <img src={emoji} alt="" className="w-14 h-12 rounded-xl object-cover border border-ql" />
              <button onClick={() => setEmoji('⭐')}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center leading-none">
                ×
              </button>
            </div>
          ) : (
            <div className="relative w-14 shrink-0">
              <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2}
                className="w-14 bg-ql-input border border-ql-input rounded-xl px-2 py-2.5 text-center text-xl outline-none"
              />
              <label className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-ql-accent rounded-full flex items-center justify-center cursor-pointer" title="Upload image">
                <span className="text-[9px] text-white leading-none">📷</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => setEmoji(ev.target?.result as string);
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          )}
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Habit name..."
            className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3.5 py-2.5 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
          />
        </div>

        {/* Colour */}
        <div>
          <p className="text-ql-3 text-xs font-medium mb-2">Colour</p>
          <div className="flex gap-2 flex-wrap">
            {HABIT_COLORS.map(c => (
              <button key={c.hex} onClick={() => setColor(c.hex)}
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c.hex,
                  borderColor: color === c.hex ? '#fff' : 'transparent',
                  transform: color === c.hex ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Schedule type */}
        <div>
          <p className="text-ql-3 text-xs font-medium mb-2">Schedule</p>
          <div className="flex gap-2">
            {([
              { id: 'days',        label: 'Weekly' },
              { id: 'fortnightly', label: '2-Week Rota' },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setSchedType(t.id)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  schedType === t.id
                    ? 'border-ql-accent bg-ql-surface2 text-ql-accent'
                    : 'border-ql bg-ql-surface text-ql-3'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Weekly */}
        {schedType === 'days' && (
          <div>
            <p className="text-ql-3 text-xs font-medium mb-2">
              Tap a day to select, then set start and end times
            </p>
            <DayPicker selected={daysA} onChange={setDaysA} times={dayTimes} endTimes={dayEndTimes} onTimeChange={setTime} onEndTimeChange={setEndTime} color={color} />
          </div>
        )}

        {/* 2-Week Rota */}
        {schedType === 'fortnightly' && (
          <div className="flex flex-col gap-4">
            <div className="bg-ql-surface2 rounded-xl px-3 py-2 border border-ql">
              <p className="text-ql-3 text-[11px]">
                Set different days for Week A and Week B. The pattern repeats every fortnight from the week you create this habit.
              </p>
            </div>
            <div>
              <p className="text-ql-3 text-xs font-medium mb-2">Week A — tap day, set times</p>
              <DayPicker selected={daysA} onChange={setDaysA} times={dayTimes} endTimes={dayEndTimes} onTimeChange={setTime} onEndTimeChange={setEndTime} color={color} />
            </div>
            <div>
              <p className="text-ql-3 text-xs font-medium mb-2">Week B — tap day, set times</p>
              <DayPicker selected={daysB} onChange={setDaysB} times={dayTimes} endTimes={dayEndTimes} onTimeChange={setTime} onEndTimeChange={setEndTime} color={color} />
            </div>
          </div>
        )}

        {/* Save */}
        <button onClick={() => {
          if (!canSave) return;
          onSave({
            name: name.trim(), emoji, color,
            scheduleType: schedType,
            scheduleDays: daysA,
            scheduleWeekBDays: daysB,
            dayTimes,
            dayEndTimes,
            reminderTime: '',
          });
          onClose();
        }} disabled={!canSave}
          className="w-full py-3 bg-ql-accent hover:bg-ql-accent-h disabled:opacity-40 text-white font-semibold rounded-2xl text-sm transition-colors"
        >
          {initial ? 'Save Changes' : 'Add Habit'}
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HabitTracker() {
  const { habitDefs, habitLog, addHabit, updateHabit, removeHabit, logHabit, unlogHabit, stats } = useGameStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<HabitDef | null>(null);

  const today     = toDateStr(new Date());
  const todayDow  = new Date().getDay();
  const weekDates = getWeekDates();

  const isLogged = (habitId: string, date: string) =>
    habitLog.some(e => e.habitId === habitId && e.date === date);

  const todayHabits = habitDefs.filter(h => isDueOn(h, today));
  const doneToday   = todayHabits.filter(h => isLogged(h.id, today)).length;

  const weekDone   = (h: HabitDef) => weekDates.filter(d => isLogged(h.id, d)).length;
  const weekTarget = (h: HabitDef) => weekDates.filter(d => isDueOn(h, d)).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-ql text-xl font-bold">Good Habits</h2>
          <p className="text-ql-3 text-xs mt-0.5">
            {doneToday}/{todayHabits.length} done today · +20 XP each
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-ql-accent hover:bg-ql-accent-h text-white text-sm font-medium rounded-2xl transition-colors"
        >
          + Habit
        </button>
      </div>

      {/* Today */}
      {todayHabits.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-ql text-sm font-semibold">Today</p>
          {todayHabits.map(habit => {
            const done       = isLogged(habit.id, today);
            const startStr   = (habit.dayTimes    ?? {})[String(todayDow)];
            const endStr     = (habit.dayEndTimes ?? {})[String(todayDow)];
            const timeLabel  = startStr
              ? endStr ? `${fmt12(startStr)} – ${fmt12(endStr)}` : fmt12(startStr)
              : '';
            return (
              <div key={habit.id}
                className={`bg-ql-surface rounded-2xl shadow-ql border transition-all flex items-center gap-3 px-4 py-3.5 ${
                  done ? 'border-ql-accent/40 opacity-80' : 'border-ql'
                }`}
              >
                <button
                  onClick={() => done ? unlogHabit(habit.id, today) : logHabit(habit.id, today)}
                  className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{ backgroundColor: done ? habit.color : 'transparent', borderColor: habit.color }}
                >
                  {done && <span className="text-white text-sm font-bold">✓</span>}
                </button>
                <HabitEmoji emoji={habit.emoji} className="text-lg" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${done ? 'line-through text-ql-3' : 'text-ql'}`}>
                    {habit.name}
                  </p>
                  {timeLabel && (
                    <p className="text-ql-3 text-[10px] mt-0.5">{timeLabel}</p>
                  )}
                </div>
                {done && <span className="text-xs text-ql-accent font-bold">+20 XP</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty */}
      {habitDefs.length === 0 && (
        <div className="text-center py-14 text-ql-3">
          <div className="text-5xl mb-3">🌱</div>
          <p className="text-sm font-medium">No habits yet</p>
          <p className="text-xs mt-1">Tap + Habit to start building good habits.</p>
        </div>
      )}

      {/* Weekly view */}
      {habitDefs.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-ql text-sm font-semibold">This Week</p>
          {habitDefs.map(habit => {
            const done   = weekDone(habit);
            const target = weekTarget(habit);
            const pct    = target > 0 ? Math.min(100, (done / target) * 100) : 0;

            return (
              <div key={habit.id} className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-4">
                <div className="flex items-center gap-3 mb-3">
                  <HabitEmoji emoji={habit.emoji} className="text-xl" />
                  <div className="flex-1 min-w-0">
                    <p className="text-ql text-sm font-semibold">{habit.name}</p>
                    <p className="text-ql-3 text-[10px] leading-tight">{buildScheduleLabel(habit)}</p>
                  </div>
                  <button onClick={() => setEditing(habit)}
                    className="text-ql-3 hover:text-ql text-xs px-2 py-1 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button onClick={() => removeHabit(habit.id)}
                    className="text-ql-3 hover:text-red-500 text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Week day grid */}
                <div className="flex gap-1 mb-2">
                  {weekDates.map(date => {
                    const dow       = new Date(date + 'T00:00:00').getDay();
                    const scheduled = isDueOn(habit, date);
                    const logged    = isLogged(habit.id, date);
                    const isPast    = date <= today;
                    const startStr  = (habit.dayTimes    ?? {})[String(dow)];
                    const endStr    = (habit.dayEndTimes ?? {})[String(dow)];

                    return (
                      <button key={date} disabled={!isPast || !scheduled}
                        onClick={() => logged ? unlogHabit(habit.id, date) : logHabit(habit.id, date)}
                        className="flex-1 flex flex-col items-center gap-0.5 disabled:cursor-default"
                      >
                        <span className="text-[9px] text-ql-3">{DAY_SHORT[dow]}</span>
                        <div className="w-full aspect-square rounded-md transition-all"
                          style={{
                            backgroundColor: habit.color,
                            opacity: logged ? 1 : scheduled && isPast ? 0.2 : 0.07,
                          }}
                        />
                        {startStr && scheduled && (
                          <span className="text-[8px] text-ql-3 leading-none">
                            {fmt12(startStr).replace(':00','')}
                            {endStr ? `–${fmt12(endStr).replace(':00','')}` : ''}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-ql-surface3 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: habit.color }}
                    />
                  </div>
                  <span className="text-ql-3 text-[10px] tabular-nums min-w-[32px] text-right">
                    {done}/{target}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {habitLog.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-ql-surface rounded-2xl shadow-ql-sm border border-ql p-3 text-center">
            <div className="text-ql text-lg font-bold tabular-nums">{habitLog.length}</div>
            <div className="text-ql-3 text-[10px] font-medium mt-0.5">Total done</div>
          </div>
          <div className="bg-ql-surface rounded-2xl shadow-ql-sm border border-ql p-3 text-center">
            <div className="text-ql text-lg font-bold tabular-nums">{habitDefs.length}</div>
            <div className="text-ql-3 text-[10px] font-medium mt-0.5">Active habits</div>
          </div>
          <div className="bg-ql-surface rounded-2xl shadow-ql-sm border border-ql p-3 text-center">
            <div className="text-ql text-lg font-bold tabular-nums">Lv.{stats.level}</div>
            <div className="text-ql-3 text-[10px] font-medium mt-0.5">Character</div>
          </div>
        </div>
      )}

      {showAdd && (
        <AddHabitSheet onClose={() => setShowAdd(false)} onSave={def => addHabit(def)} />
      )}
      {editing && (
        <AddHabitSheet initial={editing} onClose={() => setEditing(null)}
          onSave={def => updateHabit(editing.id, def)}
        />
      )}
    </div>
  );
}
