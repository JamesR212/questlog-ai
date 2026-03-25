'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameStore, inferStatConfig } from '@/store/gameStore';
import type { HabitDef, GymPlan, GymExercise, PerformanceStat, PerformanceEntry } from '@/types';
import AIAdvisor from '../shared/AIAdvisor';
import AIQuizSheet, { type QuizQuestion } from '../shared/AIQuizSheet';
import StepTracker, { StepBars, getLast7Days, dayLabel, StepsChart, buildDailyBars, buildWeeklyBars, buildMonthlyBars, StepBar, StepPeriod } from './StepTracker';
import ActivityTracker from '../tracking/ActivityTracker';
import HabitEmoji from '../shared/HabitEmoji';
import FormAnalyzer from '../gym/FormAnalyzer';

// ─── Shared constants ─────────────────────────────────────────────────────────
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

const GYM_COLORS = [
  { hex: '#ff3b30', label: 'Red'    },
  { hex: '#ff9500', label: 'Orange' },
  { hex: '#34c759', label: 'Green'  },
  { hex: '#007aff', label: 'Blue'   },
  { hex: '#af52de', label: 'Purple' },
  { hex: '#ffcc00', label: 'Yellow' },
  { hex: '#ff2d55', label: 'Pink'   },
  { hex: '#5ac8fa', label: 'Teal'   },
  { hex: '#a2845e', label: 'Brown'  },
  { hex: '#636366', label: 'Grey'   },
];

const PLAN_EMOJIS = ['💪', '🏋️', '🦵', '🔄', '⬆️', '⬇️', '🔥', '⚡', '🏃', '🤸'];

const PRESET_HABITS = [
  { name: 'Study',       emoji: '📖', color: '#ff9500' },
  { name: 'Reading',     emoji: '📚', color: '#007aff' },
  { name: 'Meditation',  emoji: '🧘', color: '#af52de' },
  { name: 'Cold Shower', emoji: '🚿', color: '#5ac8fa' },
  { name: 'No Alcohol',  emoji: '🚫', color: '#ff9500' },
  { name: 'Journaling',  emoji: '✏️', color: '#a2845e' },
  { name: 'Stretching',  emoji: '🤸', color: '#ffcc00' },
];

const EXERCISE_SUGGESTIONS = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Pull-ups', 'Barbell Row',
  'Dips', 'Bicep Curls', 'Tricep Pushdown', 'Leg Press', 'Leg Curl', 'Leg Extension',
  'Lat Pulldown', 'Face Pulls', 'Lateral Raises', 'Calf Raises', 'Romanian Deadlift',
  'Incline Bench', 'Cable Fly', 'Hammer Curls', 'Skull Crushers', 'Hip Thrust',
  'Bulgarian Split Squat', 'Seated Row', 'Arnold Press', 'Plank', 'Push-ups', 'Lunges',
  'Easy Run', 'Tempo Run', 'Interval Sprints', 'Long Run',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId() { return Math.random().toString(36).slice(2, 9); }

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmt12(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')}${h >= 12 ? 'pm' : 'am'}`;
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

// ─── DayPicker (habits) ───────────────────────────────────────────────────────
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
      <div className="flex gap-1">
        {DAY_SHORT.map((lbl, i) => (
          <button key={i} type="button" onClick={() => toggle(i)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-all"
            style={selected.includes(i)
              ? { backgroundColor: color, borderColor: color, color: '#fff' }
              : { backgroundColor: 'transparent', borderColor: 'var(--ql-border)', color: 'var(--ql-3)' }}
          >{lbl}</button>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {selected.map(d => (
            <div key={d} className="bg-ql-surface2 rounded-xl px-3 py-2.5 border border-ql flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-ql text-xs font-semibold">{DAY_FULL[d]}</span>
                {(times[String(d)] || endTimes[String(d)]) && (
                  <button onClick={() => { onTimeChange(d, ''); onEndTimeChange(d, ''); }}
                    className="text-ql-3 text-xs px-1">× Clear</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-ql-3 text-[10px]">Start</span>
                  <input type="time" value={times[String(d)] ?? ''} onChange={e => onTimeChange(d, e.target.value)}
                    className="w-full bg-ql-input border border-ql-input rounded-lg px-2 py-1.5 text-xs text-ql outline-none focus:border-ql-accent"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-ql-3 text-[10px]">End</span>
                  <input type="time" value={endTimes[String(d)] ?? ''} onChange={e => onEndTimeChange(d, e.target.value)}
                    className="w-full bg-ql-input border border-ql-input rounded-lg px-2 py-1.5 text-xs text-ql outline-none focus:border-ql-accent"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add / Edit habit sheet ───────────────────────────────────────────────────
interface HabitSheetProps {
  onClose: () => void;
  onSave: (def: Omit<HabitDef, 'id' | 'createdAt'>) => void;
  initial?: HabitDef | null;
}

function AddHabitSheet({ onClose, onSave, initial }: HabitSheetProps) {
  const { performanceStats, addPerformanceStat } = useGameStore();
  const [name,      setName]      = useState(initial?.name ?? '');
  const [emoji,     setEmoji]     = useState(initial?.emoji ?? '⭐');
  const imgPickerRef = useRef<HTMLInputElement>(null);
  const [color,     setColor]     = useState(initial?.color ?? '#34c759');
  const [schedType, setSchedType] = useState<HabitDef['scheduleType']>(initial?.scheduleType ?? 'days');
  const [daysA,     setDaysA]     = useState<number[]>(initial?.scheduleDays      ?? [1, 2, 3, 4, 5]);
  const [daysB,     setDaysB]     = useState<number[]>(initial?.scheduleWeekBDays ?? []);
  const [dayTimes,    setDayTimes]    = useState<Record<string, string>>(initial?.dayTimes    ?? {});
  const [dayEndTimes, setDayEndTimes] = useState<Record<string, string>>(initial?.dayEndTimes ?? {});

  // Metric / stat tracking
  const [linkedStatId,  setLinkedStatId]  = useState<string | null>(initial?.linkedStatId ?? null);
  const [perfUnit,      setPerfUnit]      = useState(() => inferStatConfig(initial?.name ?? '').unit);
  const [perfHigher,    setPerfHigher]    = useState(() => inferStatConfig(initial?.name ?? '').higherIsBetter);
  const [perfHasSec,    setPerfHasSec]    = useState(() => inferStatConfig(initial?.name ?? '').hasSecondary);
  const [perfSecUnit,   setPerfSecUnit]   = useState(() => inferStatConfig(initial?.name ?? '').secondaryUnit ?? 'min');
  const [perfSecLabel,  setPerfSecLabel]  = useState(() => inferStatConfig(initial?.name ?? '').secondaryLabel ?? 'Time');
  const [customUnit,    setCustomUnit]    = useState('');

  // Auto-suggest metric when name changes (only when user hasn't typed a custom unit)
  useEffect(() => {
    if (customUnit) return; // user has typed a custom unit — don't override
    const cfg = inferStatConfig(name, emoji);
    setPerfUnit(cfg.unit);
    setPerfHigher(cfg.higherIsBetter);
    setPerfHasSec(cfg.hasSecondary);
    setPerfSecUnit(cfg.secondaryUnit ?? 'min');
    setPerfSecLabel(cfg.secondaryLabel ?? 'Time');
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  const METRIC_CHIPS = [
    { label: '⏱ min',      unit: 'min',      higher: true,  hasSec: false, secUnit: '',    secLabel: ''     },
    { label: '💧 ml',       unit: 'ml',       higher: true,  hasSec: false, secUnit: '',    secLabel: ''     },
    { label: '🏃 km',       unit: 'km',       higher: true,  hasSec: true,  secUnit: 'min', secLabel: 'Time' },
    { label: '💪 kg',       unit: 'kg',       higher: true,  hasSec: false, secUnit: '',    secLabel: ''     },
    { label: '🔢 reps',     unit: 'reps',     higher: true,  hasSec: false, secUnit: '',    secLabel: ''     },
    { label: '📊 sessions', unit: 'sessions', higher: true,  hasSec: false, secUnit: '',    secLabel: ''     },
  ];

  const existingLinkedStat = performanceStats.find(s => s.id === linkedStatId);

  const setTime    = (day: number, time: string) => setDayTimes(p    => { const n = {...p}; time ? (n[String(day)] = time) : delete n[String(day)]; return n; });
  const setEndTime = (day: number, time: string) => setDayEndTimes(p => { const n = {...p}; time ? (n[String(day)] = time) : delete n[String(day)]; return n; });

  const canSave = name.trim().length > 0 && daysA.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl p-5 pb-10 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-ql text-base font-bold">{initial ? 'Edit Habit' : 'New Habit'}</h3>
          <button onClick={onClose} className="text-ql-3 text-2xl leading-none">×</button>
        </div>

        {!initial && (
          <div>
            <p className="text-ql-3 text-xs font-medium mb-2">Quick pick</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {PRESET_HABITS.map(p => (
                <button key={p.name} onClick={() => { setName(p.name); setEmoji(p.emoji); setColor(p.color); setCustomUnit(''); }}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all ${
                    name === p.name ? 'border-ql-accent bg-ql-surface2' : 'border-ql bg-ql-surface'}`}>
                  <span className="text-xl">{p.emoji}</span>
                  <span className="text-[10px] text-ql">{p.name}</span>
                </button>
              ))}
              {/* Custom tile */}
              <button
                onClick={() => { setName(''); setEmoji('⭐'); setCustomUnit(''); imgPickerRef.current?.click(); }}
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
          <input type="text" value={name} onChange={e => { setName(e.target.value); setCustomUnit(''); }} placeholder="Habit name..."
            className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3.5 py-2.5 text-sm text-ql outline-none focus:border-ql-accent"
          />
        </div>

        <div>
          <p className="text-ql-3 text-xs font-medium mb-2">Colour</p>
          <div className="flex gap-2 flex-wrap">
            {HABIT_COLORS.map(c => (
              <button key={c.hex} onClick={() => setColor(c.hex)}
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{ backgroundColor: c.hex, borderColor: color === c.hex ? '#fff' : 'transparent', transform: color === c.hex ? 'scale(1.15)' : 'scale(1)' }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-ql-3 text-xs font-medium mb-2">Schedule</p>
          <div className="flex gap-2">
            {([{ id: 'days', label: 'Weekly' }, { id: 'fortnightly', label: '2-Week Rota' }] as const).map(t => (
              <button key={t.id} onClick={() => setSchedType(t.id)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  schedType === t.id ? 'border-ql-accent bg-ql-surface2 text-ql-accent' : 'border-ql bg-ql-surface text-ql-3'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {schedType === 'days' && (
          <div>
            <p className="text-ql-3 text-xs font-medium mb-2">Tap a day to select, then set times</p>
            <DayPicker selected={daysA} onChange={setDaysA} times={dayTimes} endTimes={dayEndTimes} onTimeChange={setTime} onEndTimeChange={setEndTime} color={color} />
          </div>
        )}

        {schedType === 'fortnightly' && (
          <div className="flex flex-col gap-4">
            <div className="bg-ql-surface2 rounded-xl px-3 py-2 border border-ql">
              <p className="text-ql-3 text-[11px]">Different days for Week A and Week B, repeating fortnightly.</p>
            </div>
            <div>
              <p className="text-ql-3 text-xs font-medium mb-2">Week A</p>
              <DayPicker selected={daysA} onChange={setDaysA} times={dayTimes} endTimes={dayEndTimes} onTimeChange={setTime} onEndTimeChange={setEndTime} color={color} />
            </div>
            <div>
              <p className="text-ql-3 text-xs font-medium mb-2">Week B</p>
              <DayPicker selected={daysB} onChange={setDaysB} times={dayTimes} endTimes={dayEndTimes} onTimeChange={setTime} onEndTimeChange={setEndTime} color={color} />
            </div>
          </div>
        )}

        {/* Metric section — always shown */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-ql text-sm font-semibold">Metric</p>
            <p className="text-ql-3 text-[10px]">How you'll measure each session — logged straight to stats</p>
          </div>

          {existingLinkedStat ? (
            <div className="bg-ql-surface2 border border-ql rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{existingLinkedStat.emoji}</span>
                <div>
                  <p className="text-ql text-sm font-medium">{existingLinkedStat.name}</p>
                  <p className="text-ql-3 text-[10px]">Tracking {existingLinkedStat.unit}{existingLinkedStat.hasSecondary ? ` + ${existingLinkedStat.secondaryLabel}` : ''}</p>
                </div>
              </div>
              <button onClick={() => setLinkedStatId(null)} className="text-red-400 text-xs font-medium">Unlink</button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 bg-ql-surface2 rounded-2xl border border-ql p-3">
              {/* Quick chips */}
              <div className="flex flex-wrap gap-2">
                {METRIC_CHIPS.map(c => (
                  <button key={c.unit}
                    onClick={() => { setPerfUnit(c.unit); setPerfHigher(c.higher); setPerfHasSec(c.hasSec); setPerfSecUnit(c.secUnit); setPerfSecLabel(c.secLabel); setCustomUnit(''); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      perfUnit === c.unit && !customUnit ? 'bg-ql-accent border-ql-accent text-white' : 'bg-ql-surface border-ql text-ql-3'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
              {/* Custom unit */}
              <div className="flex gap-2 items-center">
                <input
                  value={customUnit}
                  onChange={e => {
                    setCustomUnit(e.target.value);
                    if (e.target.value) setPerfUnit(e.target.value);
                  }}
                  placeholder="Custom metric (e.g. pages, glasses…)"
                  className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent"
                />
              </div>
              {/* Current selection indicator */}
              <p className="text-ql-3 text-[10px]">
                Measuring: <span className="text-ql font-semibold">{customUnit || perfUnit}</span>
                {perfHasSec && !customUnit ? ` + ${perfSecLabel} (${perfSecUnit})` : ''}
                {' · '}{perfHigher ? 'higher = better' : 'lower = better'}
              </p>
            </div>
          )}
        </div>

        <button onClick={() => {
          if (!canSave) return;
          let finalLinkedStatId: string | undefined = linkedStatId ?? undefined;
          if (!existingLinkedStat) {
            const unit = (customUnit.trim() || perfUnit).trim();
            const newId = generateId();
            addPerformanceStat({
              id: newId, name: name.trim(), emoji, color,
              unit,
              higherIsBetter: perfHigher,
              hasSecondary: perfHasSec && !customUnit,
              secondaryUnit: (perfHasSec && !customUnit) ? perfSecUnit || 'min' : undefined,
              secondaryLabel: (perfHasSec && !customUnit) ? perfSecLabel || 'Time' : undefined,
            });
            finalLinkedStatId = newId;
          }
          onSave({ name: name.trim(), emoji, color, scheduleType: schedType, scheduleDays: daysA, scheduleWeekBDays: daysB, dayTimes, dayEndTimes, reminderTime: '', linkedStatId: finalLinkedStatId });
          onClose();
        }} disabled={!canSave}
          className="w-full py-3 bg-ql-accent disabled:opacity-40 text-white font-semibold rounded-2xl text-sm">
          {initial ? 'Save Changes' : 'Add Habit'}
        </button>
      </div>
    </div>
  );
}

// ─── Exercise row (plan builder) ──────────────────────────────────────────────
function ExerciseRow({ ex, onChange, onRemove }: { ex: GymExercise; onChange: (ex: GymExercise) => void; onRemove: () => void }) {
  return (
    <div className="bg-ql-surface2 rounded-xl p-3 border border-ql flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input list="ex-suggestions" value={ex.name} onChange={e => onChange({ ...ex, name: e.target.value })}
          placeholder="Exercise name..."
          className="flex-1 bg-ql-input border border-ql-input rounded-lg px-3 py-1.5 text-sm text-ql outline-none focus:border-ql-accent"
        />
        <button onClick={onRemove} className="text-ql-3 hover:text-red-500 text-sm transition-colors px-1">✕</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {([
          { key: 'sets',         label: 'Sets',            min: 1,  max: 20  },
          { key: 'targetReps',   label: 'Reps',            min: 1,  max: 100 },
          { key: 'targetWeight', label: 'kg (0 = BW)',     min: 0,  max: 500 },
        ] as const).map(({ key, label, min, max }) => (
          <div key={key} className="flex flex-col gap-0.5">
            <span className="text-ql-3 text-[10px]">{label}</span>
            <input type="number" min={min} max={max} value={ex[key]}
              onChange={e => onChange({ ...ex, [key]: Number(e.target.value) })}
              onFocus={e => e.target.select()}
              className="bg-ql-input border border-ql-input rounded-lg px-2.5 py-1.5 text-sm text-ql outline-none text-center"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Plan builder sheet ───────────────────────────────────────────────────────
interface PlanSheetProps {
  initial?: GymPlan | null;
  onClose: () => void;
  onSave: (plan: Omit<GymPlan, 'id' | 'createdAt'>) => void;
}

function PlanSheet({ initial, onClose, onSave }: PlanSheetProps) {
  const [name,      setName]      = useState(initial?.name      ?? '');
  const [emoji,     setEmoji]     = useState(initial?.emoji     ?? '💪');
  const [color,     setColor]     = useState(initial?.color     ?? '#ff3b30');
  const [days,        setDays]        = useState<number[]>(initial?.scheduleDays ?? []);
  const [dayTimes,    setDayTimes]    = useState<Record<string, string>>(initial?.dayTimes    ?? {});
  const [dayEndTimes, setDayEndTimes] = useState<Record<string, string>>(initial?.dayEndTimes ?? {});
  const [exercises,   setExercises]   = useState<GymExercise[]>(initial?.exercises ?? []);

  const setPlanTime    = (day: number, t: string) => setDayTimes(p    => { const n = {...p}; t ? (n[String(day)] = t) : delete n[String(day)]; return n; });
  const setPlanEndTime = (day: number, t: string) => setDayEndTimes(p => { const n = {...p}; t ? (n[String(day)] = t) : delete n[String(day)]; return n; });
  const [newEx,     setNewEx]     = useState('');

  const toggleDay = (d: number) =>
    setDays(days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort());

  const addExercise = (name: string) => {
    if (!name.trim()) return;
    setExercises([...exercises, { id: generateId(), name: name.trim(), sets: 3, targetReps: 8, targetWeight: 0 }]);
    setNewEx('');
  };

  const canSave = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl p-5 pb-10 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-ql text-base font-bold">{initial ? 'Edit Plan' : 'New Plan'}</h3>
          <button onClick={onClose} className="text-ql-3 text-2xl leading-none">×</button>
        </div>

        <div>
          <p className="text-ql-3 text-xs font-medium mb-2">Plan name <span className="text-red-400">*</span></p>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Push Day, 5K Run…" autoFocus
            className="w-full bg-ql-input border border-ql-input rounded-xl px-3.5 py-2.5 text-sm text-ql outline-none focus:border-ql-accent"
          />
        </div>

        <div>
          <p className="text-ql-3 text-xs font-medium mb-2">Icon</p>
          <div className="flex gap-1.5 flex-wrap">
            {PLAN_EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className="w-9 h-9 rounded-xl text-lg transition-all"
                style={emoji === e
                  ? { border: '2.5px solid #000', backgroundColor: 'var(--ql-surface2)', transform: 'scale(1.1)' }
                  : { border: '1px solid var(--ql-border)', backgroundColor: 'var(--ql-surface)' }}
              >{e}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-ql-3 text-xs font-medium mb-2">Colour</p>
          <div className="flex gap-2 flex-wrap">
            {GYM_COLORS.map(c => (
              <button key={c.hex} onClick={() => setColor(c.hex)}
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{ backgroundColor: c.hex, borderColor: color === c.hex ? '#fff' : 'transparent', transform: color === c.hex ? 'scale(1.15)' : 'scale(1)' }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-ql-3 text-xs font-medium mb-2">Schedule — tap a day, then set its times</p>
          <DayPicker
            selected={days}
            onChange={setDays}
            times={dayTimes}
            endTimes={dayEndTimes}
            onTimeChange={setPlanTime}
            onEndTimeChange={setPlanEndTime}
            color={color}
          />
        </div>

        <div>
          <p className="text-ql-3 text-xs font-medium mb-2">Exercises / Activities</p>
          <div className="flex flex-col gap-2 mb-2">
            {exercises.map(ex => (
              <ExerciseRow key={ex.id} ex={ex}
                onChange={updated => setExercises(exercises.map(e => e.id === ex.id ? updated : e))}
                onRemove={() => setExercises(exercises.filter(e => e.id !== ex.id))}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <input list="ex-suggestions" value={newEx} onChange={e => setNewEx(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExercise(newEx)}
              placeholder="Add exercise or activity…"
              className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3.5 py-2.5 text-sm text-ql outline-none focus:border-ql-accent"
            />
            <button onClick={() => addExercise(newEx)}
              className="px-4 py-2.5 bg-ql-surface2 border border-ql text-ql text-sm font-medium rounded-xl">
              Add
            </button>
          </div>
          <datalist id="ex-suggestions">
            {EXERCISE_SUGGESTIONS.map(e => <option key={e} value={e} />)}
          </datalist>
        </div>

        {!canSave && <p className="text-red-400 text-xs text-center -mt-2">Enter a plan name to continue</p>}
        <button onClick={() => {
          if (!canSave) return;
          // Derive legacy single-time fields from first scheduled day (for display elsewhere)
          const firstDay  = days[0] != null ? String(days[0]) : '';
          const fallbackStart = firstDay ? (dayTimes[firstDay]    ?? '') : '';
          const fallbackEnd   = firstDay ? (dayEndTimes[firstDay] ?? '') : '';
          onSave({ name: name.trim(), emoji, color, exercises, scheduleDays: days, scheduleTime: fallbackStart, scheduleEndTime: fallbackEnd, dayTimes, dayEndTimes });
          onClose();
        }} disabled={!canSave}
          className="w-full py-3 bg-ql-accent disabled:opacity-40 text-white font-semibold rounded-2xl text-sm">
          {initial ? 'Save Changes' : 'Create Plan'}
        </button>
      </div>
    </div>
  );
}

// ─── Mini sparkline SVG ───────────────────────────────────────────────────────
function Sparkline({ values, color, higherIsBetter }: { values: number[]; color: string; higherIsBetter: boolean }) {
  if (values.length < 2) return <div className="h-8 w-20 flex items-center justify-center"><span className="text-ql-3 text-[10px]">Need more data</span></div>;
  const pts  = values.slice(-10);
  const min  = Math.min(...pts);
  const max  = Math.max(...pts);
  const range = max - min || 1;
  const W = 80, H = 32;
  const px = (i: number) => (i / (pts.length - 1)) * W;
  const py = (v: number) => H - ((v - min) / range) * (H - 4) - 2;
  const d  = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  const last  = pts[pts.length - 1];
  const prev  = pts[pts.length - 2];
  const up    = last > prev;
  const trendColor = (up === higherIsBetter) ? '#22c55e' : '#ef4444';
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={pts.map((v, i) => `${px(i)},${py(v)}`).join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.4" />
      <path d={d} fill="none" stroke={trendColor} strokeWidth="1.5" />
      {pts.map((v, i) => i === pts.length - 1 && (
        <circle key={i} cx={px(i)} cy={py(v)} r="3" fill={trendColor} />
      ))}
    </svg>
  );
}

// ─── Steps stat detail sheet ──────────────────────────────────────────────────
function StepsStatDetailSheet({ onClose }: { onClose: () => void }) {
  const { stepLog, stepGoal } = useGameStore();
  const [period, setPeriod] = useState<StepPeriod>('W');

  const stepsByDate: Record<string, number> = {};
  for (const e of stepLog) stepsByDate[e.date] = e.steps;

  const today   = getLast7Days()[6]; // today = last element of last 7 days
  const todaySteps = stepsByDate[today] ?? 0;

  // Build bars for selected period
  const bars = (() => {
    if (period === 'W')  return buildDailyBars(stepsByDate, 7);
    if (period === 'M')  return buildDailyBars(stepsByDate, 30);
    if (period === '6M') return buildWeeklyBars(stepsByDate, 26);
    return buildMonthlyBars(stepsByDate, 12);
  })();

  // Date range label
  const rangeLabel = (() => {
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const end = new Date();
    const start = new Date();
    if (period === 'W')  start.setDate(start.getDate() - 6);
    if (period === 'M')  start.setDate(start.getDate() - 29);
    if (period === '6M') start.setMonth(start.getMonth() - 6);
    if (period === 'Y')  start.setFullYear(start.getFullYear() - 1);
    return `${fmt(start)} – ${fmt(end)}`;
  })();

  // Daily average for the period
  const activeBars = bars.filter(b => b.value > 0);
  const avg = activeBars.length ? Math.round(activeBars.reduce((s, b) => s + b.value, 0) / activeBars.length) : 0;
  const goalHit = bars.filter(b => b.value >= stepGoal).length;

  const sorted = [...stepLog].sort((a, b) => b.date.localeCompare(a.date));

  const PERIODS: StepPeriod[] = ['W', 'M', '6M', 'Y'];
  const PERIOD_LABELS: Record<StepPeriod, string> = { W: 'Week', M: 'Month', '6M': '6 Months', Y: 'Year' };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-ql shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">👟</span>
              <h3 className="text-ql text-base font-bold">Daily Steps</h3>
            </div>
            <button onClick={onClose} className="text-ql-3 text-2xl leading-none">×</button>
          </div>

          {/* Period toggle */}
          <div className="flex bg-ql-surface2 rounded-2xl p-1 border border-ql mb-4">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${period === p ? 'bg-ql-accent text-white' : 'text-ql-3'}`}>
                {p}
              </button>
            ))}
          </div>

          {/* Average + range */}
          <p className="text-ql-3 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Daily Average</p>
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="text-ql text-3xl font-bold tabular-nums">{avg.toLocaleString()}</span>
            <span className="text-ql-3 text-sm">steps</span>
          </div>
          <p className="text-ql-3 text-[11px] mb-3">{rangeLabel}</p>

          {/* Chart */}
          <StepsChart bars={bars} goal={stepGoal} />

          {/* Legend */}
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-ql-3 text-[10px]">Goal hit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-ql-accent" />
              <span className="text-ql-3 text-[10px]">Today</span>
            </div>
            <span className="ml-auto text-ql-3 text-[10px]">Goal: {stepGoal.toLocaleString()}</span>
          </div>
        </div>

        {/* Summary tiles + history */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4 pb-8">
          {/* Stats row */}
          <div className="flex gap-2">
            <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
              <p className="text-ql text-sm font-bold tabular-nums">{todaySteps.toLocaleString()}</p>
              <p className="text-ql-3 text-[10px]">Today</p>
            </div>
            <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
              <p className="text-ql text-sm font-bold">{goalHit}/{bars.length}</p>
              <p className="text-ql-3 text-[10px]">Goals hit ({PERIOD_LABELS[period]})</p>
            </div>
            <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
              <p className="text-ql text-sm font-bold tabular-nums">{stepLog.length}</p>
              <p className="text-ql-3 text-[10px]">Days logged</p>
            </div>
          </div>

          {/* History */}
          <div>
            <p className="text-ql text-sm font-semibold mb-2">History</p>
            <div className="flex flex-col gap-2">
              {sorted.length === 0 && <p className="text-ql-3 text-sm text-center py-6">No steps logged yet.</p>}
              {sorted.map(e => (
                <div key={e.id} className="bg-ql-surface2 rounded-2xl border border-ql px-4 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${e.steps >= stepGoal ? 'bg-green-500' : 'bg-ql-surface3'}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-bold tabular-nums ${e.steps >= stepGoal ? 'text-green-400' : 'text-ql'}`}>
                      {e.steps.toLocaleString()} steps
                    </p>
                    <p className="text-ql-3 text-[10px] mt-0.5">
                      {new Date(e.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      <span className="ml-2">{e.source === 'google_fit' ? '🤖 Google Fit' : '✏️ Manual'}</span>
                    </p>
                  </div>
                  {e.rewarded && <span className="text-ql-accent text-[10px] font-bold shrink-0">+stats</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Floors inline section (shown in Steps tab) ───────────────────────────────
function FloorsSection() {
  const { gpsActivities, floorsGoal, setFloorsGoal } = useGameStore();
  const [period, setPeriod] = useState<StepPeriod>('W');
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(floorsGoal));

  const floorsByDate: Record<string, number> = {};
  for (const a of gpsActivities) {
    if (!a.floorsClimbed) continue;
    const date = a.startTime.slice(0, 10);
    floorsByDate[date] = (floorsByDate[date] ?? 0) + a.floorsClimbed;
  }

  const today = getLast7Days()[6];
  const todayFloors = floorsByDate[today] ?? 0;

  const bars = (() => {
    if (period === 'W')  return buildDailyBars(floorsByDate, 7);
    if (period === 'M')  return buildDailyBars(floorsByDate, 30);
    if (period === '6M') return buildWeeklyBars(floorsByDate, 26);
    return buildMonthlyBars(floorsByDate, 12);
  })();

  const rangeLabel = (() => {
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const end = new Date(); const start = new Date();
    if (period === 'W')  start.setDate(start.getDate() - 6);
    if (period === 'M')  start.setDate(start.getDate() - 29);
    if (period === '6M') start.setMonth(start.getMonth() - 6);
    if (period === 'Y')  start.setFullYear(start.getFullYear() - 1);
    return `${fmt(start)} – ${fmt(end)}`;
  })();

  const activeBars = bars.filter(b => b.value > 0);
  const avg     = activeBars.length ? Math.round(activeBars.reduce((s, b) => s + b.value, 0) / activeBars.length) : 0;
  const goalHit = bars.filter(b => b.value >= floorsGoal).length;
  const PERIODS: StepPeriod[] = ['W', 'M', '6M', 'Y'];
  const PERIOD_LABELS: Record<StepPeriod, string> = { W: 'Week', M: 'Month', '6M': '6 Months', Y: 'Year' };
  const sorted = Object.entries(floorsByDate).sort((a, b) => b[0].localeCompare(a[0]));
  const saveGoal = () => { const v = parseInt(goalInput); if (v > 0) setFloorsGoal(v); setEditGoal(false); };

  return (
    <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql overflow-hidden flex flex-col gap-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-ql">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🏢</span>
          <p className="text-ql text-sm font-bold">Floors Climbed</p>
        </div>

        <div className="flex bg-ql-surface2 rounded-2xl p-1 border border-ql mb-3">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${period === p ? 'bg-ql-accent text-white' : 'text-ql-3'}`}>
              {p}
            </button>
          ))}
        </div>

        <p className="text-ql-3 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Daily Average</p>
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="text-ql text-3xl font-bold tabular-nums">{avg}</span>
          <span className="text-ql-3 text-sm">floors</span>
        </div>
        <p className="text-ql-3 text-[11px] mb-3">{rangeLabel}</p>

        <StepsChart bars={bars} goal={floorsGoal} />

        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-ql-3 text-[10px]">Goal hit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-ql-accent" />
            <span className="text-ql-3 text-[10px]">Today</span>
          </div>
          <span className="ml-auto text-ql-3 text-[10px]">Goal: {floorsGoal} floors</span>
        </div>
      </div>

      <div className="px-4 py-3 flex flex-col gap-3">
        {/* Stats row */}
        <div className="flex gap-2">
          <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
            <p className="text-ql text-sm font-bold tabular-nums">{todayFloors}</p>
            <p className="text-ql-3 text-[10px]">Today</p>
          </div>
          <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
            <p className="text-ql text-sm font-bold">{goalHit}/{bars.length}</p>
            <p className="text-ql-3 text-[10px]">Goals hit ({PERIOD_LABELS[period]})</p>
          </div>
          <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
            <p className="text-ql text-sm font-bold tabular-nums">{sorted.length}</p>
            <p className="text-ql-3 text-[10px]">Days with data</p>
          </div>
        </div>

        {/* Goal editor */}
        <div className="bg-ql-surface2 rounded-2xl border border-ql px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-ql text-sm font-semibold">Daily goal</p>
            {editGoal ? (
              <div className="flex gap-2 items-center mt-1">
                <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveGoal()}
                  className="w-20 bg-ql-input border border-ql rounded-lg px-2 py-1 text-xs text-ql outline-none" />
                <span className="text-ql-3 text-xs">floors</span>
                <button onClick={saveGoal} className="text-xs px-2 py-1 bg-ql-accent text-white rounded-lg font-semibold">Save</button>
              </div>
            ) : (
              <p className="text-ql-3 text-xs mt-0.5">{floorsGoal} floors/day</p>
            )}
          </div>
          {!editGoal && (
            <button onClick={() => { setGoalInput(String(floorsGoal)); setEditGoal(true); }}
              className="text-xs px-3 py-1.5 border border-ql rounded-xl text-ql-3">
              Edit
            </button>
          )}
        </div>

        {/* Recent History */}
        <div>
          <p className="text-ql text-sm font-semibold mb-2">Recent History</p>
          <div className="flex flex-col gap-2">
            {sorted.length === 0 && <p className="text-ql-3 text-sm text-center py-6">No floors data yet — use the GPS tracker on a hilly route.</p>}
            {sorted.slice(0, 10).map(([date, floors]) => (
              <div key={date} className="bg-ql-surface2 rounded-2xl border border-ql px-4 py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${floors >= floorsGoal ? 'bg-green-500' : 'bg-ql-surface3'}`} />
                <div className="flex-1">
                  <p className={`text-sm font-bold tabular-nums ${floors >= floorsGoal ? 'text-green-400' : 'text-ql'}`}>
                    {floors} floor{floors !== 1 ? 's' : ''}
                  </p>
                  <p className="text-ql-3 text-[10px] mt-0.5">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Floors modal sheet (used in Performance tab) ─────────────────────────────
function FloorsDetailSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-2 flex items-center justify-between border-b border-ql shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            <h3 className="text-ql text-base font-bold">Floors Climbed</h3>
          </div>
          <button onClick={onClose} className="text-ql-3 text-2xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 pb-8">
          <FloorsSection />
        </div>
      </div>
    </div>
  );
}

// ─── Stat detail sheet ────────────────────────────────────────────────────────
function StatDetailSheet({ stat, entries, onClose, onDelete }: {
  stat: PerformanceStat;
  entries: PerformanceEntry[];
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const best = entries.reduce<PerformanceEntry | null>((b, e) => {
    if (!b) return e;
    return stat.higherIsBetter ? (e.value > b.value ? e : b) : (e.value < b.value ? e : b);
  }, null);

  const formatVal = (e: PerformanceEntry) => {
    let s = `${e.value} ${stat.unit}`;
    if (stat.hasSecondary && e.secondaryValue != null) s += ` · ${e.secondaryValue} ${stat.secondaryUnit}`;
    // Auto-calc pace for runs/cycles (min/km)
    if (stat.hasSecondary && e.secondaryValue && e.value > 0) {
      const pace = e.secondaryValue / e.value;
      s += ` · ${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2,'0')}/km`;
    }
    return s;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl flex flex-col max-h-[88vh]"
        onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-ql shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{stat.emoji}</span>
              <h3 className="text-ql text-base font-bold">{stat.name}</h3>
            </div>
            <button onClick={onClose} className="text-ql-3 text-2xl leading-none">×</button>
          </div>
          {best && (
            <div className="flex items-center gap-3 mt-3">
              <div className="bg-ql-surface2 rounded-xl border border-ql px-3 py-2 flex-1 text-center">
                <p className="text-ql-3 text-[10px]">Personal Best</p>
                <p className="text-ql text-sm font-bold tabular-nums">{best.value} {stat.unit}</p>
                {best.secondaryValue != null && <p className="text-ql-3 text-[10px]">{best.secondaryValue} {stat.secondaryUnit}</p>}
              </div>
              <div className="bg-ql-surface2 rounded-xl border border-ql px-3 py-2 flex-1 text-center">
                <p className="text-ql-3 text-[10px]">Entries</p>
                <p className="text-ql text-sm font-bold">{entries.length}</p>
              </div>
              {entries.length >= 2 && (() => {
                const recent = [...entries].sort((a,b) => b.date.localeCompare(a.date));
                const diff   = recent[0].value - recent[1].value;
                const pct    = recent[1].value > 0 ? Math.abs((diff / recent[1].value) * 100).toFixed(1) : '–';
                const up     = diff > 0;
                const good   = up === stat.higherIsBetter;
                return (
                  <div className="bg-ql-surface2 rounded-xl border border-ql px-3 py-2 flex-1 text-center">
                    <p className="text-ql-3 text-[10px]">Last change</p>
                    <p className={`text-sm font-bold ${good ? 'text-emerald-400' : diff === 0 ? 'text-ql-3' : 'text-red-400'}`}>
                      {diff === 0 ? '—' : `${up ? '+' : ''}${diff.toFixed(1)}`}
                    </p>
                    <p className="text-ql-3 text-[10px]">{diff !== 0 && `${pct}%`}</p>
                  </div>
                );
              })()}
            </div>
          )}
          {entries.length >= 2 && (
            <div className="mt-3 flex justify-center">
              <Sparkline values={[...entries].sort((a,b) => a.date.localeCompare(b.date)).map(e => e.value)} color={stat.color} higherIsBetter={stat.higherIsBetter} />
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3 flex flex-col gap-2 pb-6">
          {sorted.length === 0 && <p className="text-ql-3 text-sm text-center py-8">No entries yet.</p>}
          {sorted.map(e => {
            const exercises = parseGymNotes(e.notes);
            const hasReceipt = exercises.length > 0;
            return (
              <div key={e.id} className="bg-ql-surface2 rounded-2xl border border-ql px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-ql text-sm font-medium tabular-nums">{formatVal(e)}</p>
                    <p className="text-ql-3 text-[10px] mt-0.5">
                      {new Date(e.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      {e.notes && !hasReceipt && <span className="ml-2 italic">{e.notes}</span>}
                    </p>
                  </div>
                  <button onClick={() => onDelete(e.id)} className="text-ql-3 hover:text-red-500 text-sm transition-colors shrink-0 px-1">✕</button>
                </div>
                {hasReceipt && <ExerciseReceipt notes={e.notes} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Habit check-in sheet (performance logging when ticking off) ───────────────
function HabitCheckInSheet({ habit, stat, lastEntry, onConfirm, onSkip, onClose }: {
  habit: HabitDef;
  stat: PerformanceStat;
  lastEntry?: PerformanceEntry | null;
  onConfirm: (value: number, secondary?: number) => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const [value,  setValue]  = useState('');
  const [secVal, setSecVal] = useState('');
  const valid = parseFloat(value) > 0;

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl p-5 pb-10 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HabitEmoji emoji={habit.emoji} className="text-2xl" />
            <div>
              <h3 className="text-ql text-base font-bold">{habit.name}</h3>
              <p className="text-ql-3 text-[10px]">Log today&apos;s performance — goes straight to stats</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ql-3 text-2xl leading-none">×</button>
        </div>

        {/* Last entry context */}
        {lastEntry && (
          <div className="flex items-center gap-2 bg-ql-surface2 rounded-xl px-3 py-2 border border-ql">
            <span className="text-ql-3 text-xs">Last:</span>
            <span className="text-ql text-xs font-semibold tabular-nums">
              {lastEntry.value} {stat.unit}
              {lastEntry.secondaryValue != null ? ` · ${lastEntry.secondaryValue} ${stat.secondaryUnit}` : ''}
            </span>
            <span className="text-ql-3 text-[10px] ml-auto">
              {new Date(lastEntry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <p className="text-ql-3 text-xs font-medium mb-1">{stat.unit}</p>
            <input type="number" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)}
              placeholder={lastEntry ? String(lastEntry.value) : '0'} autoFocus
              className="w-full bg-ql-input border border-ql-input rounded-xl px-3.5 py-3 text-2xl text-ql font-bold outline-none focus:border-ql-accent text-center"
            />
          </div>
          {stat.hasSecondary && (
            <div className="flex-1">
              <p className="text-ql-3 text-xs font-medium mb-1">{stat.secondaryLabel ?? 'Time'} ({stat.secondaryUnit})</p>
              <input type="number" inputMode="decimal" value={secVal} onChange={e => setSecVal(e.target.value)}
                placeholder={lastEntry?.secondaryValue != null ? String(lastEntry.secondaryValue) : '0'}
                className="w-full bg-ql-input border border-ql-input rounded-xl px-3.5 py-3 text-2xl text-ql font-bold outline-none focus:border-ql-accent text-center"
              />
            </div>
          )}
        </div>

        <button onClick={() => {
          if (!valid) return;
          onConfirm(parseFloat(value), secVal ? parseFloat(secVal) : undefined);
          onClose();
        }} disabled={!valid}
          className="w-full py-3 bg-ql-accent disabled:opacity-40 text-white font-semibold rounded-2xl text-sm">
          Done — save to stats ✓
        </button>
        <button onClick={() => { onSkip(); onClose(); }}
          className="text-ql-3 text-sm text-center py-1 font-medium">
          Skip tracking this time
        </button>
      </div>
    </div>
  );
}

// ─── Habit detail sheet ────────────────────────────────────────────────────────
function HabitDetailSheet({ habit, stat, entries, habitLog, onClose, onDeleteEntry, onAddEntry }: {
  habit: HabitDef;
  stat: PerformanceStat | null;
  entries: PerformanceEntry[];
  habitLog: import('@/types').HabitEntry[];
  onClose: () => void;
  onDeleteEntry: (id: string) => void;
  onAddEntry: (value: number, secondary?: number, date?: string, notes?: string) => void;
}) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const best   = stat ? entries.reduce<PerformanceEntry | null>((b, e) => {
    if (!b) return e;
    return stat.higherIsBetter ? (e.value > b.value ? e : b) : (e.value < b.value ? e : b);
  }, null) : null;

  // Habit completion count (last 30 days)
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i); return toDateStr(d);
  });
  const completions = last30.filter(d => habitLog.some(e => e.habitId === habit.id && e.date === d)).length;

  // Manual entry form state
  const [showManual, setShowManual] = useState(false);
  const [manVal,     setManVal]     = useState('');
  const [manSec,     setManSec]     = useState('');
  const [manDate,    setManDate]    = useState(toDateStr(new Date()));
  const [manNote,    setManNote]    = useState('');

  const handleManualSave = () => {
    const v = parseFloat(manVal);
    if (isNaN(v) || v <= 0) return;
    onAddEntry(v, manSec ? parseFloat(manSec) : undefined, manDate, manNote.trim() || undefined);
    setManVal(''); setManSec(''); setManNote('');
    setShowManual(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl flex flex-col max-h-[88vh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b border-ql shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl overflow-hidden"
                style={{ backgroundColor: habit.color + '22', border: `2px solid ${habit.color}` }}>
                <HabitEmoji emoji={habit.emoji} className="text-xl" />
              </div>
              <div>
                <h3 className="text-ql text-base font-bold">{habit.name}</h3>
                <p className="text-ql-3 text-[10px]">{buildScheduleLabel(habit)}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-ql-3 text-2xl leading-none">×</button>
          </div>

          {/* Stats tiles */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-ql-surface2 rounded-xl border border-ql p-2.5 text-center">
              <p className="text-ql text-sm font-bold">{completions}</p>
              <p className="text-ql-3 text-[10px]">Last 30d</p>
            </div>
            {stat && best ? (
              <>
                <div className="bg-ql-surface2 rounded-xl border border-ql p-2.5 text-center">
                  <p className="text-ql text-sm font-bold tabular-nums">{best.value} {stat.unit}</p>
                  <p className="text-ql-3 text-[10px]">Personal best</p>
                </div>
                <div className="bg-ql-surface2 rounded-xl border border-ql p-2.5 text-center">
                  <p className="text-ql text-sm font-bold">{entries.length}</p>
                  <p className="text-ql-3 text-[10px]">Entries</p>
                </div>
              </>
            ) : (
              <div className="col-span-2 bg-ql-surface2 rounded-xl border border-ql p-2.5 flex items-center justify-center">
                <p className="text-ql-3 text-xs text-center">Enable tracking in habit settings to log performance</p>
              </div>
            )}
          </div>

          {/* Sparkline */}
          {stat && entries.length >= 2 && (
            <div className="mt-3 flex justify-center">
              <Sparkline
                values={[...entries].sort((a, b) => a.date.localeCompare(b.date)).map(e => e.value)}
                color={habit.color}
                higherIsBetter={stat.higherIsBetter}
              />
            </div>
          )}
        </div>

        {/* Entry list */}
        <div className="overflow-y-auto flex-1 px-5 py-3 flex flex-col gap-2 pb-6">
          {stat && (
            <>
              {/* Manual entry form / button */}
              {showManual ? (
                <div className="bg-ql-surface2 rounded-2xl border border-ql p-4 flex flex-col gap-3 mb-1">
                  <div className="flex items-center justify-between">
                    <p className="text-ql text-sm font-semibold">Add entry manually</p>
                    <button onClick={() => setShowManual(false)} className="text-ql-3 text-lg leading-none">×</button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="text-ql-3 text-[10px] mb-1">{stat.unit}</p>
                      <input type="number" inputMode="decimal" placeholder="0" value={manVal}
                        onChange={e => setManVal(e.target.value)} autoFocus
                        className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2.5 text-xl text-ql font-bold outline-none focus:border-ql-accent text-center"
                      />
                    </div>
                    {stat.hasSecondary && (
                      <div className="flex-1">
                        <p className="text-ql-3 text-[10px] mb-1">{stat.secondaryLabel ?? 'Time'} ({stat.secondaryUnit})</p>
                        <input type="number" inputMode="decimal" placeholder="0" value={manSec}
                          onChange={e => setManSec(e.target.value)}
                          className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2.5 text-xl text-ql font-bold outline-none focus:border-ql-accent text-center"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="text-ql-3 text-[10px] mb-1">Date</p>
                      <input type="date" value={manDate} max={toDateStr(new Date())}
                        onChange={e => setManDate(e.target.value)}
                        className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-ql-3 text-[10px] mb-1">Notes (optional)</p>
                      <input type="text" placeholder="e.g. windy, new route…" value={manNote}
                        onChange={e => setManNote(e.target.value)}
                        className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent"
                      />
                    </div>
                  </div>
                  <button onClick={handleManualSave} disabled={!(parseFloat(manVal) > 0)}
                    className="w-full py-2.5 bg-ql-accent disabled:opacity-40 text-white text-sm font-semibold rounded-xl">
                    Save entry
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowManual(true)}
                  className="w-full py-2.5 border border-dashed border-ql rounded-2xl text-ql-3 hover:text-ql hover:border-ql-accent text-sm font-medium transition-colors mb-1">
                  + Add / correct an entry
                </button>
              )}

              {sorted.length === 0 ? (
                <p className="text-ql-3 text-sm text-center py-6">No entries yet — tick off this habit or add one above.</p>
              ) : (
                sorted.map(e => {
                  const exercises = parseGymNotes(e.notes);
                  const hasReceipt = exercises.length > 0;
                  return (
                    <div key={e.id} className="bg-ql-surface2 rounded-2xl border border-ql px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-ql text-sm font-medium tabular-nums">
                            {e.value} {stat.unit}{e.secondaryValue != null ? ` · ${e.secondaryValue} ${stat.secondaryUnit}` : ''}
                          </p>
                          <p className="text-ql-3 text-[10px] mt-0.5">
                            {new Date(e.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            {e.notes && !hasReceipt && <span className="ml-2 italic">{e.notes}</span>}
                          </p>
                        </div>
                        <button onClick={() => onDeleteEntry(e.id)} className="text-ql-3 hover:text-red-500 text-sm transition-colors shrink-0 px-1">✕</button>
                      </div>
                      {hasReceipt && <ExerciseReceipt notes={e.notes} />}
                    </div>
                  );
                })
              )}
            </>
          )}
          {!stat && (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-ql text-sm font-medium">No performance tracking</p>
              <p className="text-ql-3 text-xs mt-1">Edit this habit to enable tracking.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Gym log sheet (log actual weights per exercise) ─────────────────────────
interface ExerciseLogEntry { exerciseId: string; name: string; weight: number; targetWeight: number; sets: number; reps: number; }

function GymLogSheet({ plan, onClose, onSave }: {
  plan: GymPlan;
  onClose: () => void;
  onSave: (logs: ExerciseLogEntry[]) => void;
}) {
  // Detect run/cardio plans — use mins + km instead of sets × reps × weight
  const isRunPlan = /run|jog|walk|cardio|marathon|\d+k\b/i.test(plan.name);

  const extractMins = (name: string) => {
    const m = name.match(/(\d+)\s*min/i);
    return m ? parseInt(m[1]) : 1;
  };

  const [logs, setLogs] = useState<ExerciseLogEntry[]>(
    plan.exercises.map(ex => ({
      exerciseId: ex.id,
      name: ex.name,
      weight: ex.targetWeight,
      targetWeight: ex.targetWeight,
      sets: ex.sets,
      reps: isRunPlan ? extractMins(ex.name) : ex.targetReps,
    }))
  );

  const update = (id: string, patch: Partial<ExerciseLogEntry>) =>
    setLogs(l => l.map(e => e.exerciseId === id ? { ...e, ...patch } : e));

  const Stepper = ({ value, onChange, min = 1 }: { value: number; onChange: (v: number) => void; min?: number }) => (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(min, value - 1))}
        className="w-7 h-7 rounded-lg bg-ql-surface3 text-ql text-base font-bold flex items-center justify-center active:scale-90 transition-transform">−</button>
      <span className="w-8 text-center text-ql text-sm font-semibold">{value}</span>
      <button onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-lg bg-ql-surface3 text-ql text-base font-bold flex items-center justify-center active:scale-90 transition-transform">+</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl flex flex-col max-h-[88vh]"
        onClick={e => e.stopPropagation()}>

        <div className="p-5 border-b border-ql shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{plan.emoji}</span>
              <div>
                <h3 className="text-ql text-base font-bold">{plan.name}</h3>
                <p className="text-ql-3 text-[10px]">
                  {isRunPlan ? 'Edit mins & km — then log' : 'Edit sets, reps & weight — then log'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-ql-3 text-2xl leading-none">×</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3 pb-4">
          {logs.length === 0 && (
            <p className="text-ql-3 text-sm text-center py-6">No exercises in this plan — edit it to add some.</p>
          )}
          {logs.map(log => {
            if (isRunPlan) {
              return (
                <div key={log.exerciseId} className="bg-ql-surface2 rounded-2xl border border-ql px-4 py-3 flex flex-col gap-3">
                  <p className="text-ql text-sm font-semibold">{log.name}</p>
                  <div className="flex items-center gap-4">
                    {/* Mins */}
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-ql-3 text-[10px]">Mins</p>
                      <Stepper value={log.reps} onChange={v => update(log.exerciseId, { reps: v })} min={0} />
                    </div>
                    {/* KM */}
                    <div className="flex-1 flex flex-col gap-1">
                      <p className="text-ql-3 text-[10px]">Distance (km)</p>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0"
                        value={log.weight || ''}
                        onChange={e => update(log.exerciseId, { weight: parseFloat(e.target.value) || 0 })}
                        placeholder="0.0"
                        className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-base text-ql font-semibold outline-none focus:border-ql-accent text-center"
                      />
                    </div>
                    <p className="text-ql-3 text-sm mt-4">km</p>
                  </div>
                </div>
              );
            }

            const isBodyweight = log.targetWeight === 0;
            const weightDiff = !isBodyweight && log.weight > 0
              ? log.weight - log.targetWeight : null;
            return (
              <div key={log.exerciseId} className="bg-ql-surface2 rounded-2xl border border-ql px-4 py-3 flex flex-col gap-3">
                {/* Exercise name + target */}
                <div className="flex items-center justify-between">
                  <p className="text-ql text-sm font-semibold">{log.name}</p>
                  <p className="text-ql-3 text-[10px]">target: {log.targetWeight > 0 ? `${log.targetWeight}kg` : 'BW'}</p>
                </div>

                {/* Sets / Reps / Weight row */}
                <div className="flex items-center gap-3">
                  {/* Sets */}
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-ql-3 text-[10px]">Sets</p>
                    <Stepper value={log.sets} onChange={v => update(log.exerciseId, { sets: v })} />
                  </div>

                  <span className="text-ql-3 text-base mt-4">×</span>

                  {/* Reps */}
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-ql-3 text-[10px]">Reps</p>
                    <Stepper value={log.reps} onChange={v => update(log.exerciseId, { reps: v })} />
                  </div>

                  {/* Weight (weighted only) */}
                  {!isBodyweight && (
                    <>
                      <span className="text-ql-3 text-base mt-4">@</span>
                      <div className="flex-1 flex flex-col gap-1">
                        <p className="text-ql-3 text-[10px]">Weight (kg)</p>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={log.weight || ''}
                          onChange={e => update(log.exerciseId, { weight: parseFloat(e.target.value) || 0 })}
                          placeholder={String(log.targetWeight)}
                          className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-base text-ql font-semibold outline-none focus:border-ql-accent text-center"
                        />
                      </div>
                      {weightDiff !== null && (
                        <div className="text-center mt-4 shrink-0">
                          <p className={`text-sm font-bold ${weightDiff > 0 ? 'text-emerald-400' : weightDiff < 0 ? 'text-amber-400' : 'text-ql-3'}`}>
                            {weightDiff > 0 ? `+${weightDiff.toFixed(1)}` : weightDiff < 0 ? `${weightDiff.toFixed(1)}` : '='}
                          </p>
                          <p className="text-ql-3 text-[9px]">vs target</p>
                        </div>
                      )}
                    </>
                  )}

                  {isBodyweight && (
                    <p className="text-ql-3 text-xs mt-4 ml-1">Bodyweight</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 pb-8 pt-3 border-t border-ql shrink-0">
          <button
            onClick={() => { onSave(logs); onClose(); }}
            className="w-full py-3 text-white font-semibold rounded-2xl text-sm"
            style={{ backgroundColor: plan.color }}
          >
            Log Session +75 XP
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Muscle radar chart ───────────────────────────────────────────────────────
const MUSCLE_KEYS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Core', 'Arms'] as const;
type MuscleKey = typeof MUSCLE_KEYS[number];
// Angles: 90=top going clockwise at 60° steps (standard SVG-flipped)
const MUSCLE_ANGLES: Record<MuscleKey, number> = {
  Chest: 90, Back: 30, Legs: -30, Shoulders: -90, Core: -150, Arms: 150,
};

function classifyMuscle(name: string): MuscleKey | null {
  const n = name.toLowerCase();
  if (/overhead|ohp|military|arnold|lateral.?raise|front.?raise|shoulder/.test(n)) return 'Shoulders';
  if (/bench|chest.?fly|chest.?press|pec|cable.?cross|push.?up/.test(n)) return 'Chest';
  if (/squat|lunge|leg.?press|leg.?curl|leg.?ext|calf|hamstring|rdl|romanian|hip.?thrust|glute|split.?squat/.test(n)) return 'Legs';
  if (/row|pull.?up|chin.?up|lat.?pull|deadlift|pull.?down/.test(n)) return 'Back';
  if (/curl|tricep|bicep|skull|hammer|preacher|close.?grip/.test(n)) return 'Arms';
  if (/plank|crunch|sit.?up|russian|core|face.?pull/.test(n)) return 'Core';
  if (/press/.test(n)) return 'Chest';
  return null;
}

type OverviewMode = 'volume' | 'frequency' | 'load';
const OVERVIEW_LABELS: Record<OverviewMode, string> = {
  volume: '🏋️ Total Volume', frequency: '📅 Workout Frequency', load: '💪 Muscular Load',
};

function MuscleRadarChart({ sessions, color, mode }: { sessions: { exercises: GymExLog[] }[]; color: string; mode: OverviewMode }) {
  // Volume and load use sets×reps×weight; frequency counts sessions that hit each muscle
  const values: Record<MuscleKey, number> = { Chest: 0, Back: 0, Legs: 0, Shoulders: 0, Core: 0, Arms: 0 };
  for (const s of sessions) {
    const hit = new Set<MuscleKey>();
    for (const ex of s.exercises) {
      const m = classifyMuscle(ex.n);
      if (m) {
        if (mode === 'frequency') hit.add(m);
        else values[m] += ex.s * ex.r * (ex.w || 1);
      }
    }
    if (mode === 'frequency') hit.forEach(m => { values[m]++; });
  }
  const maxVal = Math.max(...Object.values(values), 1);
  const total  = Object.values(values).reduce((a, b) => a + b, 0);
  const cx = 100, cy = 108, R = 55;

  const toXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle * Math.PI / 180),
    y: cy - r * Math.sin(angle * Math.PI / 180),
  });
  const hexPath = (scale: number) => {
    const pts = MUSCLE_KEYS.map(k => { const p = toXY(MUSCLE_ANGLES[k], R * scale); return `${p.x},${p.y}`; });
    return `M${pts.join('L')}Z`;
  };
  const valuePath = () => {
    const pts = MUSCLE_KEYS.map(k => {
      const p = toXY(MUSCLE_ANGLES[k], R * Math.max(0.04, values[k] / maxVal));
      return `${p.x},${p.y}`;
    });
    return `M${pts.join('L')}Z`;
  };

  return (
    <svg viewBox="0 0 200 215" className="w-full max-w-xs mx-auto">
      {[0.25, 0.5, 0.75, 1].map(s => (
        <path key={s} d={hexPath(s)} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.9" />
      ))}
      {MUSCLE_KEYS.map(k => {
        const end = toXY(MUSCLE_ANGLES[k], R);
        return <line key={k} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.28)" strokeWidth="0.9" />;
      })}
      <path d={valuePath()} fill={color} fillOpacity="0.22" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      {MUSCLE_KEYS.map(k => {
        const p = toXY(MUSCLE_ANGLES[k], R * Math.max(0.04, values[k] / maxVal));
        return <circle key={k} cx={p.x} cy={p.y} r="2.5" fill={color} />;
      })}
      {MUSCLE_KEYS.map(k => {
        const pos = toXY(MUSCLE_ANGLES[k], R + 22);
        const v = values[k];
        const pct = total > 0 ? Math.round(v / total * 100) : 0;
        const fmt = v >= 100000 ? `${(v/1000).toFixed(0)}k` : v >= 10000 ? `${(v/1000).toFixed(1)}k` : v.toLocaleString();
        const topLabel = mode === 'load' ? `${pct}%` : mode === 'frequency' ? `${v} session${v !== 1 ? 's' : ''}` : (v > 0 ? `${fmt} kg` : '—');
        return (
          <g key={k}>
            <text x={pos.x} y={pos.y - 4} textAnchor="middle" fontSize="8.5" fontWeight="700"
              fill={v > 0 ? 'var(--ql-text,#fff)' : 'var(--ql-text-3,#aaa)'}>
              {topLabel}
            </text>
            <text x={pos.x} y={pos.y + 7} textAnchor="middle" fontSize="7.5" fill="var(--ql-text-2,#bbb)">
              {k}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function OverviewChart({ sessions, color }: { sessions: { entry: { date: string }; exercises: GymExLog[] }[]; color: string }) {
  const [mode, setMode] = useState<OverviewMode>('volume');
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-ql-surface rounded-2xl border border-ql p-4 relative">
      <div className="flex items-center justify-between mb-2">
        <p className="text-ql text-sm font-semibold">{OVERVIEW_LABELS[mode]}</p>
        <button onClick={() => setOpen(o => !o)}
          className="text-ql-3 text-base leading-none px-1 py-0.5 rounded hover:bg-ql-surface2 transition-colors">
          ⌃<br style={{ lineHeight: 0 }} />⌄
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-4 top-10 z-20 bg-ql-hdr border border-ql rounded-2xl shadow-xl overflow-hidden min-w-[180px]"
          onClick={e => e.stopPropagation()}>
          {(['volume', 'frequency', 'load'] as OverviewMode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-ql-surface2 transition-colors">
              <span className="w-4 text-ql-accent text-xs">{mode === m ? '✓' : ''}</span>
              <span className={`text-ql font-medium ${mode === m ? 'font-semibold' : ''}`}>
                {m === 'volume' ? 'Total Volume' : m === 'frequency' ? 'Workout Frequency' : 'Muscular Load'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Chart body — all three modes use the same radar, labels change */}
      <MuscleRadarChart sessions={sessions} color={color} mode={mode} />
    </div>
  );
}

// ─── Gym plan detail sheet ────────────────────────────────────────────────────
type GymExLog = { n: string; s: number; r: number; w: number };

function parseGymNotes(notes?: string): GymExLog[] {
  try { return JSON.parse(notes ?? '[]'); } catch { return []; }
}

/** Renders gym session notes as a clean receipt list, or plain text for non-JSON notes */
function ExerciseReceipt({ notes }: { notes?: string }) {
  if (!notes) return null;
  const exercises = parseGymNotes(notes);
  if (exercises.length === 0) return <span className="ml-2 italic text-[10px]">{notes}</span>;
  return (
    <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-ql/40 bg-ql-surface divide-y divide-ql/30">
      {exercises.map((ex, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-1.5">
          <span className="text-ql text-[11px] truncate mr-3">{ex.n}</span>
          <span className="text-ql-3 text-[11px] font-mono tabular-nums shrink-0">
            {ex.s}×{ex.r}{ex.w > 0 ? ` @ ${ex.w}kg` : ' BW'}
          </span>
        </div>
      ))}
    </div>
  );
}

function GymPlanDetailSheet({ plan, performanceLog, onClose }: {
  plan: GymPlan;
  performanceLog: PerformanceEntry[];
  onClose: () => void;
}) {
  const isRunPlan = /run|jog|walk|cardio|marathon|\d+k\b/i.test(plan.name);
  const [selectedEx, setSelectedEx] = useState('overview');

  // All logged sessions for this plan, newest first
  const sessions = [...performanceLog.filter(e => e.statId === plan.linkedStatId)]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(e => ({ entry: e, exercises: parseGymNotes(e.notes) }));

  // ── Run plan aggregates ───────────────────────────────────────────────────
  const runSessions = sessions.map(s => ({
    entry: s.entry,
    totalMins: s.exercises.reduce((sum, ex) => sum + ex.r, 0),
    totalKm:   s.exercises.reduce((sum, ex) => sum + ex.w, 0),
  }));
  const bestKm   = runSessions.reduce((b, s) => Math.max(b, s.totalKm), 0);
  const bestMins = runSessions.reduce((b, s) => Math.max(b, s.totalMins), 0);
  const kmValues = [...runSessions].reverse().map(s => s.totalKm).filter(k => k > 0);

  // ── Gym plan per-exercise stats ───────────────────────────────────────────
  const exHistory = sessions
    .map(s => ({ date: s.entry.date, ex: s.exercises.find(x => x.n.toLowerCase() === selectedEx.toLowerCase()) }))
    .filter((s): s is { date: string; ex: GymExLog } => !!s.ex);

  const bestWeight   = exHistory.reduce((b, e) => Math.max(b, e.ex.w), 0);
  const lastTwo      = exHistory.slice(0, 2);
  const weightChange = lastTwo.length === 2 ? lastTwo[0].ex.w - lastTwo[1].ex.w : null;
  const exWeights    = [...exHistory].reverse().map(e => e.ex.w).filter(w => w > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl flex flex-col max-h-[88vh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b border-ql shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{plan.emoji}</span>
              <div>
                <h3 className="text-ql text-base font-bold">{plan.name}</h3>
                <p className="text-ql-3 text-[10px]">
                  {sessions.length} session{sessions.length !== 1 ? 's' : ''} logged
                  {isRunPlan ? ' · total mins & km per session' : ' · tap exercise to see progression'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-ql-3 text-2xl leading-none">×</button>
          </div>

          {/* Exercise pills — gym only */}
          {!isRunPlan && plan.exercises.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
              {/* Overview always first */}
              <button onClick={() => setSelectedEx('overview')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  selectedEx === 'overview' ? 'text-white border-transparent' : 'bg-ql-surface2 border-ql text-ql-3'}`}
                style={selectedEx === 'overview' ? { backgroundColor: plan.color } : {}}>
                Overview
              </button>
              {plan.exercises.map(ex => (
                <button key={ex.id} onClick={() => setSelectedEx(ex.name)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    selectedEx === ex.name ? 'text-white border-transparent' : 'bg-ql-surface2 border-ql text-ql-3'}`}
                  style={selectedEx === ex.name ? { backgroundColor: plan.color } : {}}>
                  {ex.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4 pb-6">
          {plan.exercises.length === 0 && (
            <p className="text-ql-3 text-sm text-center py-8">No exercises in this plan yet.</p>
          )}

          {plan.exercises.length > 0 && sessions.length === 0 && (
            <div className="text-center py-8 text-ql-3">
              <p className="text-sm">No sessions yet</p>
              <p className="text-xs mt-1">Log a workout to see your breakdown here</p>
            </div>
          )}

          {/* ── RUN PLAN VIEW ── */}
          {isRunPlan && sessions.length > 0 && (
            <>
              {/* Stats tiles */}
              <div className="flex gap-2">
                <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
                  <p className="text-ql text-sm font-bold tabular-nums">{sessions.length}</p>
                  <p className="text-ql-3 text-[10px]">Sessions</p>
                </div>
                <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
                  <p className="text-ql text-sm font-bold tabular-nums">{bestKm > 0 ? `${bestKm.toFixed(1)} km` : '—'}</p>
                  <p className="text-ql-3 text-[10px]">Best distance</p>
                </div>
                <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
                  <p className="text-ql text-sm font-bold tabular-nums">{bestMins > 0 ? `${bestMins} min` : '—'}</p>
                  <p className="text-ql-3 text-[10px]">Best time</p>
                </div>
              </div>

              {/* KM progression sparkline */}
              {kmValues.length >= 2 && (
                <div className="bg-ql-surface2 rounded-2xl border border-ql p-4 flex flex-col items-center gap-2">
                  <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wider self-start">Distance progression (km)</p>
                  <Sparkline values={kmValues} color={plan.color} higherIsBetter={true} />
                </div>
              )}

              {/* Session history */}
              <div className="flex flex-col gap-3">
                <p className="text-ql text-sm font-semibold">Session History</p>
                {runSessions.map(({ entry, totalMins, totalKm }) => (
                  <div key={entry.id} className="bg-ql-surface2 rounded-2xl border border-ql overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ql/50">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: plan.color }} />
                      <p className="text-ql text-xs font-semibold flex-1">
                        {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <span className="text-ql-accent text-[10px] font-bold">+75 XP</span>
                    </div>
                    <div className="px-4 py-3 flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">⏱</span>
                        <div>
                          <p className="text-ql text-sm font-bold tabular-nums">{totalMins} min</p>
                          <p className="text-ql-3 text-[9px]">Total time</p>
                        </div>
                      </div>
                      <div className="w-px h-8 bg-ql/30" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">📍</span>
                        <div>
                          <p className="text-ql text-sm font-bold tabular-nums">{totalKm > 0 ? `${totalKm.toFixed(1)} km` : '—'}</p>
                          <p className="text-ql-3 text-[9px]">Distance</p>
                        </div>
                      </div>
                      {totalMins > 0 && totalKm > 0 && (
                        <>
                          <div className="w-px h-8 bg-ql/30" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg">🏃</span>
                            <div>
                              <p className="text-ql text-sm font-bold tabular-nums">{(totalMins / totalKm).toFixed(1)} min/km</p>
                              <p className="text-ql-3 text-[9px]">Avg pace</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── GYM PLAN VIEW ── */}
          {!isRunPlan && plan.exercises.length > 0 && sessions.length > 0 && (
            <>
              {/* ── Overview tab ── */}
              {selectedEx === 'overview' && (
                <>
                  {/* Summary tiles */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-ql-surface2 rounded-xl border border-ql p-3 text-center">
                      <p className="text-ql text-sm font-bold">{sessions.length}</p>
                      <p className="text-ql-3 text-[10px] mt-0.5">Sessions</p>
                    </div>
                    <div className="bg-ql-surface2 rounded-xl border border-ql p-3 text-center">
                      <p className="text-ql text-sm font-bold">{plan.exercises.length}</p>
                      <p className="text-ql-3 text-[10px] mt-0.5">Exercises</p>
                    </div>
                    <div className="bg-ql-surface2 rounded-xl border border-ql p-3 text-center">
                      <p className="text-ql text-sm font-bold">
                        {(() => {
                          const total = sessions.flatMap(s => s.exercises).reduce((sum, ex) => sum + ex.s * ex.r * (ex.w || 1), 0);
                          return total >= 100000 ? `${(total/1000).toFixed(0)}k` : total >= 1000 ? `${(total/1000).toFixed(1)}k` : total;
                        })()}
                      </p>
                      <p className="text-ql-3 text-[10px] mt-0.5">Total kg vol.</p>
                    </div>
                  </div>
                  {/* Unified overview chart with dropdown */}
                  <OverviewChart sessions={sessions} color={plan.color} />
                  {/* Session history */}
                  <div className="flex flex-col gap-3">
                    <p className="text-ql text-sm font-semibold">Session History</p>
                    {sessions.map(({ entry, exercises }) => (
                      <div key={entry.id} className="bg-ql-surface2 rounded-2xl border border-ql overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ql/50">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: plan.color }} />
                          <p className="text-ql text-xs font-semibold flex-1">
                            {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <span className="text-ql-accent text-[10px] font-bold">+75 XP</span>
                        </div>
                        {exercises.length > 0 ? (
                          <div className="px-4 py-2 flex flex-col gap-1.5">
                            {exercises.map((ex, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <p className="text-ql text-xs">{ex.n}</p>
                                <p className="text-ql-3 text-[11px] font-mono tabular-nums">
                                  {ex.s}×{ex.r}{ex.w > 0 ? ` @ ${ex.w}kg` : ' BW'}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-ql-3 text-[10px] px-4 py-2">No exercise data recorded</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Per-exercise tab ── */}
              {selectedEx !== 'overview' && (
                <>
                  {exHistory.length > 0 ? (
                    <div className="flex gap-2">
                      <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
                        <p className="text-ql text-sm font-bold tabular-nums">{bestWeight > 0 ? `${bestWeight} kg` : 'BW'}</p>
                        <p className="text-ql-3 text-[10px]">Best weight</p>
                      </div>
                      {weightChange !== null && (
                        <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
                          <p className={`text-sm font-bold ${weightChange > 0 ? 'text-emerald-400' : weightChange < 0 ? 'text-red-400' : 'text-ql-3'}`}>
                            {weightChange === 0 ? '—' : `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg`}
                          </p>
                          <p className="text-ql-3 text-[10px]">Last change</p>
                        </div>
                      )}
                      <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
                        <p className="text-ql text-sm font-bold">{exHistory.length}</p>
                        <p className="text-ql-3 text-[10px]">Sessions</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-ql-surface2 rounded-2xl border border-ql px-4 py-4 text-center">
                      <p className="text-ql-3 text-sm">No data for {selectedEx} yet</p>
                      <p className="text-ql-3 text-[10px] mt-1">Log a workout to start tracking</p>
                    </div>
                  )}

                  {exWeights.length >= 2 && (
                    <div className="bg-ql-surface2 rounded-2xl border border-ql p-4 flex flex-col items-center gap-2">
                      <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wider self-start">{selectedEx} — weight progression</p>
                      <Sparkline values={exWeights} color={plan.color} higherIsBetter={true} />
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <p className="text-ql text-sm font-semibold">Session History</p>
                    {sessions.map(({ entry, exercises }) => (
                      <div key={entry.id} className="bg-ql-surface2 rounded-2xl border border-ql overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ql/50">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: plan.color }} />
                          <p className="text-ql text-xs font-semibold flex-1">
                            {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <span className="text-ql-accent text-[10px] font-bold">+75 XP</span>
                        </div>
                        {exercises.length > 0 ? (
                          <div className="px-4 py-2 flex flex-col gap-1.5">
                            {exercises.map((ex, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <p className="text-ql text-xs">{ex.n}</p>
                                <p className="text-ql-3 text-[11px] font-mono tabular-nums">
                                  {ex.s}×{ex.r}{ex.w > 0 ? ` @ ${ex.w}kg` : ' BW'}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-ql-3 text-[10px] px-4 py-2">No exercise data recorded</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main: TrainingHub ────────────────────────────────────────────────────────
export default function TrainingHub() {
  const {
    habitDefs, habitLog, addHabit, updateHabit, removeHabit, logHabit, unlogHabit,
    gymPlans, gymSessions, addGymPlan, updateGymPlan, removeGymPlan, logGymSession,
    stats, savedGymPrefs, setSavedGymPrefs,
    performanceStats, performanceLog, addPerformanceStat, removePerformanceStat, logPerformanceEntry, deletePerformanceEntry,
    stepLog, stepGoal,
    gpsActivities, floorsGoal,
  } = useGameStore();

  const { trainingTab, gpsTrackingEnabled } = useGameStore();
  const [activeTab, setActiveTab] = useState<'habits' | 'plans' | 'performance' | 'steps' | 'track'>(trainingTab ?? 'habits');

  useEffect(() => {
    if (trainingTab) setActiveTab(trainingTab);
  }, [trainingTab]);

  // Performance state
  const [viewingStat,   setViewingStat]   = useState<PerformanceStat | null>(null);
  const [viewingSteps,  setViewingSteps]  = useState(false);
  const [viewingFloors, setViewingFloors] = useState(false);

  // Habit check-in / detail
  const [checkingInHabit, setCheckingInHabit] = useState<HabitDef | null>(null);
  const [viewingHabit,    setViewingHabit]    = useState<HabitDef | null>(null);

  // Gym log / detail
  const [loggingGymPlan,  setLoggingGymPlan]  = useState<GymPlan | null>(null);
  const [viewingGymPlan,  setViewingGymPlan]  = useState<GymPlan | null>(null);

  // Habit state
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitDef | null>(null);

  // Plan state
  const [showAddPlan,  setShowAddPlan]  = useState(false);
  const [editingPlan,  setEditingPlan]  = useState<GymPlan | null>(null);
  const [showQuiz,     setShowQuiz]     = useState(false);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiPreview,    setAiPreview]    = useState<Omit<GymPlan, 'id' | 'createdAt'> | null>(null);
  const [aiError,      setAiError]      = useState<string | null>(null);

  // Date helpers
  const today    = toDateStr(new Date());
  const todayDow = new Date().getDay();
  const weekDates = getWeekDates();

  // Habits helpers
  const isLogged   = (habitId: string, date: string) => habitLog.some(e => e.habitId === habitId && e.date === date);
  // Exclude habits that are linked to a gym plan — the plan card itself handles logging
  const todayHabits = habitDefs.filter(h => isDueOn(h, today) && !h.linkedPlanId);
  const doneToday   = todayHabits.filter(h => isLogged(h.id, today)).length;

  // Gym helpers
  const todayPlans      = gymPlans.filter(p => p.scheduleDays.includes(todayDow));
  const sessionToday    = (planId: string) => gymSessions.some(s => s.planId === planId && s.date.slice(0, 10) === today);
  const sessionCountThisWeek = (planId: string) => {
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return gymSessions.filter(s => s.planId === planId && new Date(s.date) >= monday).length;
  };

  // Save plan AND create a matching habit automatically, sharing one stat
  const savePlanWithHabit = (plan: Omit<GymPlan, 'id' | 'createdAt'>) => {
    // Pre-create one shared stat so plan and habit don't each make their own
    const sharedStatId = generateId();
    addPerformanceStat({
      id:   sharedStatId,
      name: plan.name,
      ...inferStatConfig(plan.name, plan.emoji),
    });
    const planId  = addGymPlan({ ...plan, linkedStatId: sharedStatId });
    const habitId = addHabit({
      name:              plan.name,
      emoji:             plan.emoji,
      color:             plan.color,
      scheduleType:      'days',
      scheduleDays:      plan.scheduleDays,
      scheduleWeekBDays: [],
      dayTimes:          plan.dayTimes    ?? {},
      dayEndTimes:       plan.dayEndTimes ?? {},
      reminderTime:      '',
      linkedPlanId:      planId,
      linkedStatId:      sharedStatId,
    });
    updateGymPlan(planId, { linkedHabitId: habitId });
  };

  // Handle gym session log with exercise weight tracking
  const handleGymLog = (plan: GymPlan, exerciseLogs: ExerciseLogEntry[]) => {
    const todayStr = toDateStr(new Date());
    // One entry per session under the plan's stat; exercises stored as JSON in notes
    if (plan.linkedStatId) {
      const notes = JSON.stringify(
        exerciseLogs.map(log => ({ n: log.name, s: log.sets, r: log.reps, w: log.weight }))
      );
      logPerformanceEntry({ statId: plan.linkedStatId, date: todayStr, value: 1, notes });
    }
    logGymSession(plan.id);
  };

  // AI plan generation
  const GYM_QUIZ: QuizQuestion[] = [
    {
      id: 'type', question: 'What type of training?', emoji: '🏅',
      options: [
        { label: 'Weights / gym',     emoji: '🏋️', value: 'Weights and gym training' },
        { label: 'Running',           emoji: '🏃', value: 'Running' },
        { label: 'Mix of both',       emoji: '⚡', value: 'Mix of weights and running' },
        { label: 'Bodyweight / home', emoji: '🏠', value: 'Bodyweight home workout' },
      ],
    },
    {
      id: 'goal', question: "What's your main goal?", emoji: '🎯', multiSelect: true,
      options: [
        { label: 'Build muscle',         emoji: '💪', value: 'Build muscle' },
        { label: 'Lose fat',             emoji: '🔥', value: 'Lose fat' },
        { label: 'Run further / faster', emoji: '🏃', value: 'Improve running performance and endurance' },
        { label: 'Get generally fitter', emoji: '❤️', value: 'General fitness and health' },
        { label: 'Train for a race',     emoji: '🥇', value: 'Race training (5k / 10k / half marathon)' },
      ],
    },
    {
      id: 'experience', question: 'How experienced are you?', emoji: '📊',
      options: [
        { label: 'Complete beginner',  emoji: '🌱', value: 'Complete beginner — baby steps' },
        { label: 'Some experience',    emoji: '⚡', value: 'Some experience (6 months – 2 years)' },
        { label: 'Experienced',        emoji: '🏆', value: 'Experienced (2+ years)' },
      ],
    },
    {
      id: 'daysPerWeek', question: 'How many days per week?', emoji: '📅',
      options: [
        { label: '1 day',  emoji: '1️⃣', value: '1' },
        { label: '2 days', emoji: '2️⃣', value: '2' },
        { label: '3 days', emoji: '3️⃣', value: '3' },
        { label: '4 days', emoji: '4️⃣', value: '4' },
        { label: '5 days', emoji: '5️⃣', value: '5' },
      ],
    },
    {
      id: 'focus', question: 'Anything specific to focus on?', emoji: '🔍', multiSelect: true,
      options: [
        { label: 'Full body / balanced', emoji: '🔄', value: 'Full body balanced' },
        { label: 'Upper body',           emoji: '💪', value: 'Upper body' },
        { label: 'Lower body / legs',    emoji: '🦵', value: 'Lower body and legs' },
        { label: 'Core & stability',     emoji: '🎯', value: 'Core and stability' },
        { label: 'No preference',        emoji: '✅', value: 'No specific preference' },
      ],
    },
  ];

  const generateAIPlan = async (preferences: Record<string, string>) => {
    setSavedGymPrefs(preferences);
    setShowQuiz(false);
    setAiLoading(true);
    setAiError(null);
    setAiPreview(null);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'generate_gym_plan', context: { stats, gymLog: gymSessions, preferences } }),
      });
      const data = await res.json();
      if (data.plan) { setAiPreview(data.plan); setActiveTab('plans'); }
      else setAiError(data.error ?? 'Failed to generate plan');
    } catch {
      setAiError('Connection lost — check your API key');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-ql text-xl font-bold">Training</h2>
          <p className="text-ql-3 text-xs mt-0.5">
            {doneToday}/{todayHabits.length} habits · {gymSessions.length} sessions · +20 XP habits · +75 XP workouts
          </p>
        </div>
      </div>

      {/* ── Today section (combined) ── */}
      {(todayHabits.length > 0 || todayPlans.length > 0) && (
        <div className="flex flex-col gap-2">
          <p className="text-ql text-sm font-semibold">Today</p>

          {/* Habits due today */}
          {todayHabits.map(habit => {
            const done      = isLogged(habit.id, today);
            const startStr  = (habit.dayTimes    ?? {})[String(todayDow)];
            const endStr    = (habit.dayEndTimes ?? {})[String(todayDow)];
            const timeLabel = startStr ? (endStr ? `${fmt12(startStr)} – ${fmt12(endStr)}` : fmt12(startStr)) : '';
            return (
              <div key={habit.id}
                className={`bg-ql-surface rounded-2xl shadow-ql border transition-all flex items-center gap-3 px-4 py-3.5 ${done ? 'border-ql-accent/40 opacity-80' : 'border-ql'}`}
              >
                <button
                  onClick={() => {
                    if (done) {
                      unlogHabit(habit.id, today);
                    } else if (habit.linkedStatId && performanceStats.find(s => s.id === habit.linkedStatId)) {
                      setCheckingInHabit(habit);
                    } else {
                      logHabit(habit.id, today);
                    }
                  }}
                  className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{ backgroundColor: done ? habit.color : 'transparent', borderColor: habit.color }}
                >
                  {done && <span className="text-white text-sm font-bold">✓</span>}
                </button>
                <HabitEmoji emoji={habit.emoji} className="text-lg" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${done ? 'line-through text-ql-3' : 'text-ql'}`}>{habit.name}</p>
                  {timeLabel && <p className="text-ql-3 text-[10px] mt-0.5">{timeLabel}</p>}
                </div>
                {done && <span className="text-xs text-ql-accent font-bold">+20 XP</span>}
              </div>
            );
          })}

          {/* Gym plans due today */}
          {todayPlans.map(plan => {
            const done = sessionToday(plan.id);
            return (
              <div key={plan.id}
                className={`bg-ql-surface rounded-2xl shadow-ql border transition-all ${done ? 'border-ql-accent/40' : 'border-ql'} p-4`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{plan.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-ql text-sm font-semibold">{plan.name}</p>
                    <p className="text-ql-3 text-[10px]">
                      {plan.exercises.length} exercises
                      {plan.scheduleTime ? ` · ${fmt12(plan.scheduleTime)}${plan.scheduleEndTime ? ` – ${fmt12(plan.scheduleEndTime)}` : ''}` : ''}
                    </p>
                  </div>
                  {done
                    ? <span className="text-ql-accent text-xs font-bold">+75 XP ✓</span>
                    : <button onClick={() => setLoggingGymPlan(plan)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                        style={{ backgroundColor: plan.color }}>
                        Log Workout
                      </button>
                  }
                </div>
                <div className="flex flex-col gap-1">
                  {plan.exercises.slice(0, 3).map(ex => (
                    <div key={ex.id} className="flex items-center justify-between text-xs text-ql-3">
                      <span>{ex.name}</span>
                      <span className="tabular-nums">{ex.sets}×{ex.targetReps}{ex.targetWeight > 0 ? ` @ ${ex.targetWeight}kg` : ' BW'}</span>
                    </div>
                  ))}
                  {plan.exercises.length > 3 && <p className="text-ql-3 text-[10px]">+{plan.exercises.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sub-tabs ── */}
      <div className="flex bg-ql-surface2 rounded-2xl p-1 border border-ql">
        {([
          { id: 'habits',      label: '✅ Habits'  },
          { id: 'plans',       label: '🏋️ Plans'   },
          { id: 'steps',       label: '👟 Steps'   },
          { id: 'performance', label: '📊 Stats'   },
          ...(gpsTrackingEnabled ? [{ id: 'track', label: '🗺️ Track' }] : []),
        ] as const).map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === id ? 'bg-ql-accent text-white shadow-sm' : 'text-ql-3'
            }`}
          >{label}</button>
        ))}
      </div>

      {/* ── Habits tab ── */}
      {activeTab === 'habits' && (
        <>
          <div className="flex items-center justify-between -mt-1">
            <p className="text-ql-3 text-xs">{habitDefs.length} active habits</p>
            <button onClick={() => setShowAddHabit(true)}
              className="px-4 py-2 bg-ql-accent text-white text-sm font-medium rounded-2xl">
              + Habit
            </button>
          </div>

          {habitDefs.length === 0 && (
            <div className="text-center py-10 text-ql-3">
              <div className="text-5xl mb-3">🌱</div>
              <p className="text-sm font-medium">No habits yet</p>
              <p className="text-xs mt-1">Tap + Habit to start building good habits.</p>
            </div>
          )}

          {habitDefs.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-ql text-sm font-semibold">This Week</p>
              {habitDefs.map(habit => {
                const done   = weekDates.filter(d => isLogged(habit.id, d)).length;
                const target = weekDates.filter(d => isDueOn(habit, d)).length;
                const pct    = target > 0 ? Math.min(100, (done / target) * 100) : 0;
                return (
                  <div key={habit.id} className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-4 cursor-pointer active:scale-[0.99] transition-transform"
                    onClick={() => setViewingHabit(habit)}>
                    <div className="flex items-center gap-3 mb-3">
                      <HabitEmoji emoji={habit.emoji} className="text-xl" />
                      <div className="flex-1 min-w-0">
                        <p className="text-ql text-sm font-semibold">{habit.name}</p>
                        <p className="text-ql-3 text-[10px] leading-tight">{buildScheduleLabel(habit)}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setEditingHabit(habit); }} className="text-ql-3 text-xs px-2 py-1 rounded-lg">Edit</button>
                      <button onClick={e => { e.stopPropagation(); removeHabit(habit.id); }} className="text-ql-3 hover:text-red-500 text-sm transition-colors">✕</button>
                    </div>
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
                            onClick={e => { e.stopPropagation(); logged ? unlogHabit(habit.id, date) : logHabit(habit.id, date); }}
                            className="flex-1 flex flex-col items-center gap-0.5 disabled:cursor-default">
                            <span className="text-[9px] text-ql-3">{DAY_SHORT[dow]}</span>
                            <div className="w-full aspect-square rounded-md transition-all"
                              style={{ backgroundColor: habit.color, opacity: logged ? 1 : scheduled && isPast ? 0.2 : 0.07 }}
                            />
                            {startStr && scheduled && (
                              <span className="text-[8px] text-ql-3 leading-none">
                                {fmt12(startStr).replace(':00','')}{endStr ? `–${fmt12(endStr).replace(':00','')}` : ''}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-ql-surface3 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: habit.color }} />
                      </div>
                      <span className="text-ql-3 text-[10px] tabular-nums min-w-[32px] text-right">{done}/{target}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {habitLog.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div className="bg-ql-surface rounded-2xl border border-ql p-3 text-center">
                <div className="text-ql text-lg font-bold">{habitLog.length}</div>
                <div className="text-ql-3 text-[10px] mt-0.5">Total done</div>
              </div>
              <div className="bg-ql-surface rounded-2xl border border-ql p-3 text-center">
                <div className="text-ql text-lg font-bold">{habitDefs.length}</div>
                <div className="text-ql-3 text-[10px] mt-0.5">Active</div>
              </div>
              <div className="bg-ql-surface rounded-2xl border border-ql p-3 text-center">
                <div className="text-ql text-lg font-bold">Lv.{stats.level}</div>
                <div className="text-ql-3 text-[10px] mt-0.5">Level</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Plans tab ── */}
      {activeTab === 'plans' && (
        <>
          {/* AI error */}
          {aiError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 flex items-center justify-between -mt-1">
              <p className="text-red-400 text-sm">{aiError}</p>
              <button onClick={() => setAiError(null)} className="text-red-400 text-xs underline ml-3">Dismiss</button>
            </div>
          )}

          {/* AI preview */}
          {aiPreview && (
            <div className="bg-ql-surface rounded-2xl border-2 border-ql-accent/50 overflow-hidden -mt-1">
              <div className="flex items-center gap-2 px-4 py-3 bg-ql-accent/10 border-b border-ql-accent/30">
                <span>✨</span>
                <span className="text-ql text-sm font-semibold">AI-Generated Plan — Review before saving</span>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{aiPreview.emoji}</span>
                  <div>
                    <p className="text-ql font-semibold">{aiPreview.name}</p>
                    <p className="text-ql-3 text-xs">
                      {(aiPreview.scheduleDays ?? []).map((d: number) => DAY_LABEL[d]).join(', ')}
                      {aiPreview.scheduleTime ? ` · ${fmt12(aiPreview.scheduleTime)}` : ''}
                      {aiPreview.scheduleEndTime ? ` – ${fmt12(aiPreview.scheduleEndTime)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 mb-4">
                  {(aiPreview.exercises ?? []).map((ex: GymExercise, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-ql-2">{ex.name}</span>
                      <span className="text-ql-3 text-xs tabular-nums">{ex.sets}×{ex.targetReps}{ex.targetWeight > 0 ? ` @ ${ex.targetWeight}kg` : ' BW'}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { savePlanWithHabit(aiPreview); setAiPreview(null); }}
                    className="flex-1 py-2.5 bg-ql-accent text-white text-sm font-semibold rounded-xl">
                    Save to My Plans
                  </button>
                  <button onClick={() => setAiPreview(null)} className="px-4 py-2.5 bg-ql-surface3 text-ql-2 text-sm rounded-xl">
                    Discard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create buttons */}
          <div className="grid grid-cols-2 gap-3 -mt-1">
            <button
              onClick={() => setShowQuiz(true)}
              disabled={aiLoading}
              className="flex flex-col items-center gap-2 bg-ql-accent/10 border border-ql-accent/40 rounded-2xl p-4 text-left active:scale-[0.97] transition-transform disabled:opacity-50"
            >
              <span className="text-2xl">{aiLoading ? '⚙️' : '✨'}</span>
              <div>
                <p className="text-ql text-sm font-semibold">{aiLoading ? 'Generating…' : 'AI Plan'}</p>
                <p className="text-ql-3 text-[10px] mt-0.5 leading-snug">Answer a few questions, we'll build a tailored plan</p>
              </div>
            </button>
            <button
              onClick={() => setShowAddPlan(true)}
              className="flex flex-col items-center gap-2 bg-ql-surface2 border border-ql rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
            >
              <span className="text-2xl">🔧</span>
              <div>
                <p className="text-ql text-sm font-semibold">Custom Plan</p>
                <p className="text-ql-3 text-[10px] mt-0.5 leading-snug">Build your own plan from scratch</p>
              </div>
            </button>
          </div>

          {/* Plans list */}
          {gymPlans.length === 0 && !aiPreview && (
            <div className="text-center py-10 text-ql-3">
              <div className="text-5xl mb-3">🏋️</div>
              <p className="text-sm font-medium">No plans yet</p>
              <p className="text-xs mt-1">Use AI to generate one or build your own above.</p>
            </div>
          )}

          {gymPlans.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-ql text-sm font-semibold">My Plans</p>
              {gymPlans.map(plan => {
                const thisWeek   = sessionCountThisWeek(plan.id);
                const schedLabel = plan.scheduleDays.length === 0 ? 'No schedule'
                  : plan.scheduleDays.map(d => DAY_LABEL[d]).join(', ');
                const planSessions = performanceLog
                  .filter(e => e.statId === plan.linkedStatId)
                  .map(e => ({ entry: e, exercises: parseGymNotes(e.notes) }));
                return (
                  <div key={plan.id} className="bg-ql-surface rounded-2xl shadow-ql border border-ql overflow-hidden">
                    {/* Header — taps to detail sheet */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-ql cursor-pointer active:scale-[0.99] transition-transform"
                      onClick={() => setViewingGymPlan(plan)}>
                      <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: plan.color }} />
                      <span className="text-xl">{plan.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-ql text-sm font-semibold">{plan.name}</p>
                        <p className="text-ql-3 text-[10px]">
                          {schedLabel}{plan.scheduleTime ? ` · ${fmt12(plan.scheduleTime)}${plan.scheduleEndTime ? ` – ${fmt12(plan.scheduleEndTime)}` : ''}` : ''} · {thisWeek} this week
                        </p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setEditingPlan(plan); }} className="text-ql-3 text-xs px-2 py-1 rounded-lg">Edit</button>
                      <button onClick={e => { e.stopPropagation(); removeGymPlan(plan.id); }} className="text-ql-3 hover:text-red-500 text-sm transition-colors">✕</button>
                    </div>

                    {/* Exercises */}
                    <div className="px-4 py-3 flex flex-col gap-1.5">
                      {plan.exercises.map(ex => (
                        <div key={ex.id} className="flex items-center justify-between">
                          <span className="text-ql-2 text-sm">{ex.name}</span>
                          <span className="text-ql-3 text-xs tabular-nums">{ex.sets}×{ex.targetReps}{ex.targetWeight > 0 ? ` @ ${ex.targetWeight}kg` : ' BW'}</span>
                        </div>
                      ))}
                      {plan.exercises.length === 0 && <p className="text-ql-3 text-xs italic">No exercises — tap Edit to add some.</p>}
                    </div>

                    {/* Overview stats — gym only, not for run/cycle/cardio plans */}
                    {planSessions.length > 0 && !/run|jog|walk|cardio|cycle|cycling|marathon|\d+k\b/i.test(plan.name) && (
                      <div className="px-4 pb-3" onClick={e => e.stopPropagation()}>
                        <OverviewChart sessions={planSessions} color={plan.color} />
                      </div>
                    )}

                    {/* Log button */}
                    <div className="px-4 pb-3">
                      <button onClick={e => { e.stopPropagation(); setLoggingGymPlan(plan); }}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                        style={{ backgroundColor: plan.color }}>
                        Log Workout · +75 XP
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stats + recent */}
          {gymSessions.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-ql-surface rounded-2xl border border-ql p-3 text-center">
                  <div className="text-ql text-lg font-bold">{gymSessions.length}</div>
                  <div className="text-ql-3 text-[10px] mt-0.5">Sessions</div>
                </div>
                <div className="bg-ql-surface rounded-2xl border border-ql p-3 text-center">
                  <div className="text-ql text-lg font-bold">{stats.str}</div>
                  <div className="text-ql-3 text-[10px] mt-0.5">STR</div>
                </div>
                <div className="bg-ql-surface rounded-2xl border border-ql p-3 text-center">
                  <div className="text-ql text-lg font-bold">Lv.{stats.level}</div>
                  <div className="text-ql-3 text-[10px] mt-0.5">Level</div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-ql text-sm font-semibold">Recent Sessions</p>
                {gymSessions.slice().reverse().slice(0, 5).map(session => {
                  const plan = gymPlans.find(p => p.id === session.planId);
                  return (
                    <div key={session.id} className="bg-ql-surface rounded-2xl border border-ql px-4 py-3 flex items-center gap-3">
                      <span className="text-xl">{plan?.emoji ?? '💪'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-ql text-sm font-medium">{plan?.name ?? 'Workout'}</p>
                        <p className="text-ql-3 text-xs">
                          {new Date(session.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <span className="text-ql-accent text-xs font-bold">+75 XP</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Form Analyzer (habits + plans tabs) ── */}
      {(activeTab === 'habits' || activeTab === 'plans') && <FormAnalyzer />}

      {/* ── Steps tab ── */}
      {activeTab === 'steps' && (
        <StepTracker belowStats={<FloorsSection />} />
      )}
      {/* ── Track tab ── */}
      {activeTab === 'track' && <ActivityTracker />}

      {/* ── Performance tab ── */}
      {activeTab === 'performance' && (
        <>
          <p className="text-ql-3 text-xs -mt-1">{performanceStats.length} stat{performanceStats.length !== 1 ? 's' : ''} tracked</p>

          {performanceStats.length === 0 && (
            <div className="text-center py-10 text-ql-3">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-sm font-medium">No stats yet</p>
              <p className="text-xs mt-1">Stats are created automatically when you add habits, plans, or log step counts.</p>
            </div>
          )}

          {performanceStats.length > 0 && (
            <div className="flex flex-col gap-3">
              {performanceStats.filter(stat => {
                if (stat.id === 'builtin-steps')  return stepLog.length > 0;
                if (stat.id === 'builtin-floors') return gpsActivities.some(a => a.floorsClimbed);
                return true;
              }).map(stat => {
                const entries    = performanceLog.filter(e => e.statId === stat.id);
                const sorted     = [...entries].sort((a, b) => b.date.localeCompare(a.date));
                const latest     = sorted[0] ?? null;
                const best       = entries.reduce<PerformanceEntry | null>((b, e) => {
                  if (!b) return e;
                  return stat.higherIsBetter ? (e.value > b.value ? e : b) : (e.value < b.value ? e : b);
                }, null);
                const trendColor = (() => {
                  if (sorted.length < 2) return stat.color;
                  const up   = sorted[0].value > sorted[1].value;
                  const good = up === stat.higherIsBetter;
                  return good ? '#34c759' : '#ff3b30';
                })();
                // Routing: steps → custom sheet, gym plan → plan detail, else → stat detail
                const linkedPlan  = gymPlans.find(p => p.linkedStatId === stat.id);
                const isSteps     = stat.id === 'builtin-steps';
                const isFloors    = stat.id === 'builtin-floors';
                const handleTap   = () => isSteps ? setViewingSteps(true) : isFloors ? setViewingFloors(true) : linkedPlan ? setViewingGymPlan(linkedPlan) : setViewingStat(stat);

                // Build bar chart data for steps / floors
                const stepsByDate: Record<string, number> = {};
                const floorsByDate: Record<string, number> = {};
                if (isSteps) for (const e of stepLog) stepsByDate[e.date] = e.steps;
                if (isFloors) for (const a of gpsActivities) {
                  if (!a.floorsClimbed) continue;
                  const date = a.startTime.slice(0, 10);
                  floorsByDate[date] = (floorsByDate[date] ?? 0) + a.floorsClimbed;
                }
                const last7 = getLast7Days();

                return (
                  <div key={stat.id}
                    className="bg-ql-surface rounded-2xl shadow-ql border border-ql overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
                    onClick={handleTap}
                  >
                    <div className="flex items-center gap-3 px-4 pt-3.5 pb-3">
                      <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
                      <span className="text-2xl">{stat.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-ql text-sm font-semibold">{stat.name}</p>
                        <p className="text-ql-3 text-[10px]">
                          {isSteps
                            ? `Today: ${(stepsByDate[last7[6]] ?? 0).toLocaleString()} · Goal: ${stepGoal.toLocaleString()}`
                            : isFloors
                              ? `Today: ${floorsByDate[last7[6]] ?? 0} · Goal: ${floorsGoal}`
                              : linkedPlan
                                ? `${entries.length} session${entries.length !== 1 ? 's' : ''} logged`
                                : latest
                                  ? `Last: ${latest.value} ${stat.unit}${latest.secondaryValue != null ? ` · ${latest.secondaryValue} ${stat.secondaryUnit}` : ''}`
                                  : 'No entries yet'}
                        </p>
                      </div>
                      {best && !linkedPlan && !isSteps && !isFloors && (
                        <div className="text-right">
                          <p className="text-ql-3 text-[9px] uppercase tracking-wide">PB</p>
                          <p className="text-ql text-xs font-bold tabular-nums">{best.value} {stat.unit}</p>
                        </div>
                      )}
                      {(linkedPlan || isSteps || isFloors) && (
                        <span className="text-ql-3 text-[10px] font-medium">View →</span>
                      )}
                    </div>

                    {/* Steps: 7-day bar chart */}
                    {isSteps && (
                      <div className="px-4 pb-3">
                        <StepBars dates={last7} stepsByDate={stepsByDate} goal={stepGoal} />
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-ql-3 text-[10px]">Goal hit</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-ql-accent" />
                            <span className="text-ql-3 text-[10px]">Today</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Floors: 7-day bar chart */}
                    {isFloors && (
                      <div className="px-4 pb-3">
                        <StepBars dates={last7} stepsByDate={floorsByDate} goal={floorsGoal} />
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-ql-3 text-[10px]">Goal hit</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-ql-accent" />
                            <span className="text-ql-3 text-[10px]">Today</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Other stats: sparkline */}
                    {entries.length >= 2 && !linkedPlan && !isSteps && !isFloors && (
                      <div className="px-4 pb-3">
                        <Sparkline
                          values={[...entries].sort((a, b) => a.date.localeCompare(b.date)).map(e => e.value)}
                          color={trendColor}
                          higherIsBetter={stat.higherIsBetter}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Sheets */}
      {showAddHabit && <AddHabitSheet onClose={() => setShowAddHabit(false)} onSave={def => addHabit(def)} />}
      {editingHabit && <AddHabitSheet initial={editingHabit} onClose={() => setEditingHabit(null)} onSave={def => updateHabit(editingHabit.id, def)} />}
      {showAddPlan  && <PlanSheet onClose={() => setShowAddPlan(false)} onSave={plan => savePlanWithHabit(plan)} />}
      {editingPlan  && <PlanSheet initial={editingPlan} onClose={() => setEditingPlan(null)} onSave={plan => updateGymPlan(editingPlan.id, plan)} />}
      {showQuiz && (
        <AIQuizSheet title="AI Training Plan" questions={GYM_QUIZ} savedAnswers={savedGymPrefs}
          onComplete={generateAIPlan} onClose={() => setShowQuiz(false)} />
      )}
      {viewingSteps  && <StepsStatDetailSheet  onClose={() => setViewingSteps(false)} />}
      {viewingFloors && <FloorsDetailSheet onClose={() => setViewingFloors(false)} />}
      {viewingStat && (
        <StatDetailSheet
          stat={viewingStat}
          entries={performanceLog.filter(e => e.statId === viewingStat.id)}
          onClose={() => setViewingStat(null)}
          onDelete={id => deletePerformanceEntry(id)}
        />
      )}

      {checkingInHabit && performanceStats.find(s => s.id === checkingInHabit.linkedStatId) && (
        <HabitCheckInSheet
          habit={checkingInHabit}
          stat={performanceStats.find(s => s.id === checkingInHabit.linkedStatId)!}
          lastEntry={
            checkingInHabit.linkedStatId
              ? [...performanceLog]
                  .filter(e => e.statId === checkingInHabit.linkedStatId)
                  .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
              : null
          }
          onConfirm={(value, secondary) => {
            logHabit(checkingInHabit.id, today);
            const stat = performanceStats.find(s => s.id === checkingInHabit.linkedStatId);
            if (stat) logPerformanceEntry({ statId: stat.id, date: today, value, secondaryValue: secondary });
          }}
          onSkip={() => logHabit(checkingInHabit.id, today)}
          onClose={() => setCheckingInHabit(null)}
        />
      )}
      {viewingHabit && (
        <HabitDetailSheet
          habit={viewingHabit}
          stat={performanceStats.find(s => s.id === viewingHabit.linkedStatId) ?? null}
          entries={viewingHabit.linkedStatId ? performanceLog.filter(e => e.statId === viewingHabit.linkedStatId) : []}
          habitLog={habitLog}
          onClose={() => setViewingHabit(null)}
          onDeleteEntry={id => deletePerformanceEntry(id)}
          onAddEntry={(value, secondary, date, notes) => {
            const stat = performanceStats.find(s => s.id === viewingHabit.linkedStatId);
            if (stat) logPerformanceEntry({ statId: stat.id, date: date ?? today, value, secondaryValue: secondary, notes });
          }}
        />
      )}
      {loggingGymPlan && (
        <GymLogSheet
          plan={loggingGymPlan}
          onClose={() => setLoggingGymPlan(null)}
          onSave={logs => handleGymLog(loggingGymPlan, logs)}
        />
      )}
      {viewingGymPlan && (
        <GymPlanDetailSheet
          plan={viewingGymPlan}
          performanceLog={performanceLog}
          onClose={() => setViewingGymPlan(null)}
        />
      )}

      <AIAdvisor section="gym" />
    </div>
  );
}
