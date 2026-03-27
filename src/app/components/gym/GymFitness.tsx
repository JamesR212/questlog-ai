'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { GymPlan, GymExercise, PerformanceStat, PerformanceEntry } from '@/types';
import AIAdvisor from '../shared/AIAdvisor';
import FormAnalyzer from './FormAnalyzer';
import AIQuizSheet, { type QuizQuestion } from '../shared/AIQuizSheet';
import StepTracker, { StepBars, getLast7Days, StepsChart, buildDailyBars, buildWeeklyBars, buildMonthlyBars, StepPeriod } from '../training/StepTracker';
import ActivityTracker from '../tracking/ActivityTracker';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const GYM_COLORS = [
  { hex: '#ff3b30', label: 'Red'     },
  { hex: '#ff9500', label: 'Orange'  },
  { hex: '#34c759', label: 'Green'   },
  { hex: '#007aff', label: 'Blue'    },
  { hex: '#af52de', label: 'Purple'  },
  { hex: '#ffcc00', label: 'Yellow'  },
  { hex: '#ff2d55', label: 'Pink'    },
  { hex: '#5ac8fa', label: 'Teal'    },
  { hex: '#a2845e', label: 'Brown'   },
  { hex: '#636366', label: 'Grey'    },
];

const EXERCISE_SUGGESTIONS = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Pull-ups', 'Barbell Row',
  'Dips', 'Bicep Curls', 'Tricep Pushdown', 'Leg Press', 'Leg Curl', 'Leg Extension',
  'Lat Pulldown', 'Face Pulls', 'Lateral Raises', 'Calf Raises', 'Romanian Deadlift',
  'Incline Bench', 'Cable Fly', 'Hammer Curls', 'Skull Crushers', 'Hip Thrust',
  'Bulgarian Split Squat', 'Seated Row', 'Arnold Press', 'Plank', 'Push-ups', 'Lunges',
];

const PLAN_EMOJIS = ['💪', '🏋️', '🦵', '🔄', '⬆️', '⬇️', '🔥', '⚡', '🏃', '🤸'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId() { return Math.random().toString(36).slice(2, 9); }

function fmt12(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')}${h >= 12 ? 'pm' : 'am'}`;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── Exercise row in plan builder ─────────────────────────────────────────────
interface ExerciseRowProps {
  ex: GymExercise;
  onChange: (ex: GymExercise) => void;
  onRemove: () => void;
}

function ExerciseRow({ ex, onChange, onRemove }: ExerciseRowProps) {
  return (
    <div className="bg-ql-surface2 rounded-xl p-3 border border-ql flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          list="ex-suggestions"
          value={ex.name}
          onChange={e => onChange({ ...ex, name: e.target.value })}
          placeholder="Exercise name..."
          className="flex-1 bg-ql-input border border-ql-input rounded-lg px-3 py-1.5 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
        />
        <button onClick={onRemove} className="text-ql-3 hover:text-red-500 text-sm transition-colors px-1">✕</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-ql-3 text-[10px]">Sets</span>
          <input type="number" min={1} max={20} value={ex.sets}
            onChange={e => onChange({ ...ex, sets: Number(e.target.value) })}
            onFocus={e => e.target.select()}
            className="bg-ql-input border border-ql-input rounded-lg px-2.5 py-1.5 text-sm text-ql outline-none text-center"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-ql-3 text-[10px]">Reps</span>
          <input type="number" min={1} max={100} value={ex.targetReps}
            onChange={e => onChange({ ...ex, targetReps: Number(e.target.value) })}
            onFocus={e => e.target.select()}
            className="bg-ql-input border border-ql-input rounded-lg px-2.5 py-1.5 text-sm text-ql outline-none text-center"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-ql-3 text-[10px]">kg (0 = bodyweight)</span>
          <input type="number" min={0} max={500} value={ex.targetWeight}
            onChange={e => onChange({ ...ex, targetWeight: Number(e.target.value) })}
            onFocus={e => e.target.select()}
            className="bg-ql-input border border-ql-input rounded-lg px-2.5 py-1.5 text-sm text-ql outline-none text-center"
          />
        </div>
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
  const [name,        setName]        = useState(initial?.name      ?? '');
  const [emoji,       setEmoji]       = useState(initial?.emoji     ?? '💪');
  const [color,       setColor]       = useState(initial?.color     ?? '#ff3b30');
  const [days,        setDays]        = useState<number[]>(initial?.scheduleDays ?? []);
  const [dayTimes,    setDayTimes]    = useState<Record<string, string>>(initial?.dayTimes    ?? {});
  const [dayEndTimes, setDayEndTimes] = useState<Record<string, string>>(initial?.dayEndTimes ?? {});
  const [exercises,   setExercises]   = useState<GymExercise[]>(initial?.exercises ?? []);
  const [newEx,       setNewEx]       = useState('');

  const setDayTime    = (d: number, t: string) => setDayTimes(p    => { const n = {...p}; t ? (n[String(d)] = t) : delete n[String(d)]; return n; });
  const setDayEndTime = (d: number, t: string) => setDayEndTimes(p => { const n = {...p}; t ? (n[String(d)] = t) : delete n[String(d)]; return n; });

  const toggleDay = (d: number) =>
    setDays(days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort());

  const addExercise = (name: string) => {
    if (!name.trim()) return;
    setExercises([...exercises, { id: generateId(), name: name.trim(), sets: 3, targetReps: 8, targetWeight: 0 }]);
    setNewEx('');
  };

  const updateExercise = (id: string, ex: GymExercise) =>
    setExercises(exercises.map(e => e.id === id ? ex : e));

  const canSave = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl p-5 pb-10 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-ql text-base font-bold">{initial ? 'Edit Plan' : 'New Workout Plan'}</h3>
          <button onClick={onClose} className="text-ql-3 text-2xl leading-none">×</button>
        </div>

        {/* Name */}
        <div>
          <p className="text-ql-3 text-xs font-medium mb-2">Plan name <span className="text-red-400">*</span></p>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Push Day, Leg Day..."
            autoFocus
            className="w-full bg-ql-input border border-ql-input rounded-xl px-3.5 py-2.5 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
          />
        </div>

        {/* Emoji */}
        <div>
          <p className="text-ql-3 text-xs font-medium mb-2">Icon</p>
          <div className="flex gap-1.5 flex-wrap">
            {PLAN_EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className="w-9 h-9 rounded-xl text-lg transition-all"
                style={emoji === e
                  ? { border: '2.5px solid #000', backgroundColor: 'var(--ql-surface2)', transform: 'scale(1.1)' }
                  : { border: '1px solid var(--ql-border)', backgroundColor: 'var(--ql-surface)' }
                }
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Colour */}
        <div>
          <p className="text-ql-3 text-xs font-medium mb-2">Colour</p>
          <div className="flex gap-2 flex-wrap">
            {GYM_COLORS.map(c => (
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

        {/* Schedule */}
        <div>
          <p className="text-ql-3 text-xs font-medium mb-2">Schedule days</p>
          <div className="flex gap-1 mb-2">
            {DAY_SHORT.map((lbl, i) => (
              <button key={i} onClick={() => toggleDay(i)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-all"
                style={days.includes(i)
                  ? { backgroundColor: color, borderColor: color, color: '#fff' }
                  : { backgroundColor: 'transparent', borderColor: 'var(--ql-border)', color: 'var(--ql-3)' }}
              >
                {lbl}
              </button>
            ))}
          </div>
          {days.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              {days.map(d => (
                <div key={d} className="bg-ql-surface2 rounded-xl px-3 py-2.5 border border-ql flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-ql text-xs font-semibold">{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d]}</span>
                    {(dayTimes[String(d)] || dayEndTimes[String(d)]) && (
                      <button onClick={() => { setDayTime(d, ''); setDayEndTime(d, ''); }} className="text-ql-3 text-xs px-1">× Clear</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="time" value={dayTimes[String(d)] ?? ''} onChange={e => setDayTime(d, e.target.value)}
                      className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
                    />
                    <input type="time" value={dayEndTimes[String(d)] ?? ''} onChange={e => setDayEndTime(d, e.target.value)}
                      className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Exercises */}
        <div>
          <p className="text-ql-3 text-xs font-medium mb-2">Exercises</p>
          <div className="flex flex-col gap-2 mb-2">
            {exercises.map(ex => (
              <ExerciseRow key={ex.id} ex={ex}
                onChange={updated => updateExercise(ex.id, updated)}
                onRemove={() => setExercises(exercises.filter(e => e.id !== ex.id))}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <input
              list="ex-suggestions"
              value={newEx}
              onChange={e => setNewEx(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExercise(newEx)}
              placeholder="Add exercise..."
              className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3.5 py-2.5 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
            />
            <button onClick={() => addExercise(newEx)}
              className="px-4 py-2.5 bg-ql-surface2 border border-ql text-ql text-sm font-medium rounded-xl transition-colors hover:border-ql-accent"
            >
              Add
            </button>
          </div>
          <datalist id="ex-suggestions">
            {EXERCISE_SUGGESTIONS.map(e => <option key={e} value={e} />)}
          </datalist>
        </div>

        {!canSave && (
          <p className="text-red-400 text-xs text-center -mt-2">Enter a plan name above to continue</p>
        )}
        <button onClick={() => {
          if (!canSave) return;
          const firstDay = days[0] != null ? String(days[0]) : '';
          onSave({ name: name.trim(), emoji, color, exercises, scheduleDays: days, scheduleTime: firstDay ? (dayTimes[firstDay] ?? '') : '', scheduleEndTime: firstDay ? (dayEndTimes[firstDay] ?? '') : '', dayTimes, dayEndTimes });
          onClose();
        }} disabled={!canSave}
          className="w-full py-3 bg-ql-accent hover:bg-ql-accent-h disabled:opacity-40 text-white font-semibold rounded-2xl text-sm transition-colors"
        >
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

  const today   = getLast7Days()[6];
  const todaySteps = stepsByDate[today] ?? 0;

  const bars = (() => {
    if (period === 'W')  return buildDailyBars(stepsByDate, 7);
    if (period === 'M')  return buildDailyBars(stepsByDate, 30);
    if (period === '6M') return buildWeeklyBars(stepsByDate, 26);
    return buildMonthlyBars(stepsByDate, 12);
  })();

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
        <div className="px-5 pt-5 pb-4 border-b border-ql shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">👟</span>
              <h3 className="text-ql text-base font-bold">Daily Steps</h3>
            </div>
            <button onClick={onClose} className="text-ql-3 text-2xl leading-none">×</button>
          </div>
          <div className="flex bg-ql-surface2 rounded-2xl p-1 border border-ql mb-4">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${period === p ? 'bg-ql-accent text-white' : 'text-ql-3'}`}>
                {p}
              </button>
            ))}
          </div>
          <p className="text-ql-3 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Daily Average</p>
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="text-ql text-3xl font-bold tabular-nums">{avg.toLocaleString()}</span>
            <span className="text-ql-3 text-sm">steps</span>
          </div>
          <p className="text-ql-3 text-[11px] mb-3">{rangeLabel}</p>
          <StepsChart bars={bars} goal={stepGoal} />
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
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4 pb-8">
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

// ─── Floors inline section ────────────────────────────────────────────────────
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

// ─── Floors modal sheet ───────────────────────────────────────────────────────
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
function parseGymNotes(notes?: string): GymExLog[] {
  try { return JSON.parse(notes ?? '[]'); } catch { return []; }
}
type GymExLog = { n: string; s: number; r: number; w: number };

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

// ─── Gym plan detail sheet ─────────────────────────────────────────────────────
const MUSCLE_KEYS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Core', 'Arms'] as const;
type MuscleKey = typeof MUSCLE_KEYS[number];
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
        <path key={s} d={hexPath(s)} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.9" />
      ))}
      {MUSCLE_KEYS.map(k => {
        const end = toXY(MUSCLE_ANGLES[k], R);
        return <line key={k} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.7)" strokeWidth="0.9" />;
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
      <MuscleRadarChart sessions={sessions} color={color} mode={mode} />
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

  const sessions = [...performanceLog.filter(e => e.statId === plan.linkedStatId)]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(e => ({ entry: e, exercises: parseGymNotes(e.notes) }));

  const runSessions = sessions.map(s => ({
    entry: s.entry,
    totalMins: s.exercises.reduce((sum, ex) => sum + ex.r, 0),
    totalKm:   s.exercises.reduce((sum, ex) => sum + ex.w, 0),
  }));
  const bestKm   = runSessions.reduce((b, s) => Math.max(b, s.totalKm), 0);
  const bestMins = runSessions.reduce((b, s) => Math.max(b, s.totalMins), 0);
  const kmValues = [...runSessions].reverse().map(s => s.totalKm).filter(k => k > 0);

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
          {!isRunPlan && plan.exercises.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
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
          {isRunPlan && sessions.length > 0 && (
            <>
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
              {kmValues.length >= 2 && (
                <div className="bg-ql-surface2 rounded-2xl border border-ql p-4 flex flex-col items-center gap-2">
                  <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wider self-start">Distance progression (km)</p>
                  <Sparkline values={kmValues} color={plan.color} higherIsBetter={true} />
                </div>
              )}
              <div className="flex flex-col gap-3">
                <p className="text-ql text-sm font-semibold">Session History</p>
                {runSessions.map(({ entry, totalMins, totalKm }) => (
                  <div key={entry.id} className="bg-ql-surface2 rounded-2xl border border-ql overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ql/50">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: plan.color }} />
                      <p className="text-ql text-xs font-semibold flex-1">
                        {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      
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
          {!isRunPlan && plan.exercises.length > 0 && sessions.length > 0 && (
            <>
              {selectedEx === 'overview' && (
                <>
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
                  <OverviewChart sessions={sessions} color={plan.color} />
                  <div className="flex flex-col gap-3">
                    <p className="text-ql text-sm font-semibold">Session History</p>
                    {sessions.map(({ entry, exercises }) => (
                      <div key={entry.id} className="bg-ql-surface2 rounded-2xl border border-ql overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ql/50">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: plan.color }} />
                          <p className="text-ql text-xs font-semibold flex-1">
                            {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          
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

// ─── Recovery Section ─────────────────────────────────────────────────────────
const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Abs', 'Legs'] as const;
type MuscleGroup = typeof MUSCLE_GROUPS[number];

const MUSCLE_KEYWORDS: Record<MuscleGroup, string[]> = {
  Chest:     ['bench', 'push-up', 'pushup', 'fly', 'pec', 'chest', 'dip'],
  Back:      ['row', 'pull-up', 'pullup', 'deadlift', 'lat', 'back', 'rhomboid', 'trap', 'chin'],
  Shoulders: ['overhead', 'shoulder', 'raise', 'lateral', 'delt', 'arnold', 'ohp', 'press'],
  Arms:      ['curl', 'tricep', 'bicep', 'hammer', 'skull', 'extension', 'pushdown', 'preacher'],
  Abs:       ['plank', 'crunch', 'core', 'sit-up', 'situp', 'ab', 'hanging', 'leg raise'],
  Legs:      ['squat', 'lunge', 'leg press', 'leg curl', 'leg extension', 'hip', 'glute', 'calf', 'hamstring', 'rdl', 'bulgarian', 'thrust', 'quad'],
};

function exerciseToMuscles(name: string): MuscleGroup[] {
  const lower = name.toLowerCase();
  return MUSCLE_GROUPS.filter(g =>
    MUSCLE_KEYWORDS[g].some(kw => lower.includes(kw))
  );
}

function recoveryColor(pct: number): string {
  if (pct >= 70) return '#22c55e';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
}

function MaleBodyMap({ recovery }: { recovery: Record<MuscleGroup, number> }) {
  const rc = recoveryColor;
  const bg = 'var(--ql-surface2)';
  const sk = 'rgba(80,110,200,0.72)';
  const sw = 0.8;
  const dv = 'rgba(80,110,200,0.32)';
  return (
    <svg width="90" height="180" viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* BASE SHAPES */}
      <ellipse cx="50" cy="11" rx="9.5" ry="10.5" fill={bg} stroke={sk} strokeWidth="1.2"/>
      <path d="M44,21 Q50,19 56,21 L57,31 Q50,33 43,31 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M44,22 C40,25 32,30 27,38 L32,45 C38,40 47,35 50,32 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M56,22 C60,25 68,30 73,38 L68,45 C62,40 53,35 50,32 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M7,36 C3,42 3,55 7,66 L14,69 L22,63 L26,53 L28,40 C20,33 11,31 7,36 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M93,36 C97,42 97,55 93,66 L86,69 L78,63 L74,53 L72,40 C80,33 89,31 93,36 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M28,40 C27,36 38,31 50,31 L50,65 L28,65 C24,59 24,48 28,40 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M72,40 C73,36 62,31 50,31 L50,65 L72,65 C76,59 76,48 72,40 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M29,65 L50,65 L50,102 L29,98 C26,90 26,76 29,65 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M71,65 L50,65 L50,102 L71,98 C74,90 74,76 71,65 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M25,68 L29,66 L29,98 L25,100 C21,92 21,78 25,68 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M75,68 L71,66 L71,98 L75,100 C79,92 79,78 75,68 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M9,56 C7,63 7,74 10,83 L18,87 L25,81 L27,62 L22,54 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M91,56 C93,63 93,74 90,83 L82,87 L75,81 L73,62 L78,54 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M10,83 C8,91 9,103 13,112 L19,115 L25,109 L25,83 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M90,83 C92,91 91,103 87,112 L81,115 L75,109 L75,83 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M10,112 L25,112 L25,121 Q17,124 10,121 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M90,112 L75,112 L75,121 Q83,124 90,121 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M27,100 C25,104 27,110 30,112 L50,114 L70,112 C73,110 75,104 73,100 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M27,110 C21,120 19,138 24,156 L32,160 L36,154 L33,132 L30,110 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M30,110 L50,112 L50,158 L30,158 C27,148 27,127 30,110 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M70,110 L50,112 L50,158 L70,158 C73,148 73,127 70,110 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M73,110 C79,120 81,138 76,156 L68,160 L64,154 L67,132 L70,110 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M24,158 C19,166 20,177 24,186 L34,190 L38,184 L35,158 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M76,158 C81,166 80,177 76,186 L66,190 L62,184 L65,158 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M21,186 L37,188 L36,198 L23,198 Q14,195 21,186 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M79,186 L63,188 L64,198 L77,198 Q86,195 79,186 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      {/* MUSCLE OVERLAYS */}
      <path d="M28,40 C27,36 38,31 50,31 L50,65 L28,65 C24,59 24,48 28,40 Z" fill={rc(recovery.Chest)} opacity="0.72"/>
      <path d="M72,40 C73,36 62,31 50,31 L50,65 L72,65 C76,59 76,48 72,40 Z" fill={rc(recovery.Chest)} opacity="0.72"/>
      <path d="M44,22 C40,25 32,30 27,38 L32,45 C38,40 47,35 50,32 Z" fill={rc(recovery.Shoulders)} opacity="0.72"/>
      <path d="M56,22 C60,25 68,30 73,38 L68,45 C62,40 53,35 50,32 Z" fill={rc(recovery.Shoulders)} opacity="0.72"/>
      <path d="M7,36 C3,42 3,55 7,66 L14,69 L22,63 L26,53 L28,40 C20,33 11,31 7,36 Z" fill={rc(recovery.Shoulders)} opacity="0.72"/>
      <path d="M93,36 C97,42 97,55 93,66 L86,69 L78,63 L74,53 L72,40 C80,33 89,31 93,36 Z" fill={rc(recovery.Shoulders)} opacity="0.72"/>
      <path d="M29,65 L50,65 L50,102 L29,98 C26,90 26,76 29,65 Z" fill={rc(recovery.Abs)} opacity="0.72"/>
      <path d="M71,65 L50,65 L50,102 L71,98 C74,90 74,76 71,65 Z" fill={rc(recovery.Abs)} opacity="0.72"/>
      <path d="M25,68 L29,66 L29,98 L25,100 C21,92 21,78 25,68 Z" fill={rc(recovery.Abs)} opacity="0.62"/>
      <path d="M75,68 L71,66 L71,98 L75,100 C79,92 79,78 75,68 Z" fill={rc(recovery.Abs)} opacity="0.62"/>
      <path d="M9,56 C7,63 7,74 10,83 L18,87 L25,81 L27,62 L22,54 Z" fill={rc(recovery.Arms)} opacity="0.72"/>
      <path d="M91,56 C93,63 93,74 90,83 L82,87 L75,81 L73,62 L78,54 Z" fill={rc(recovery.Arms)} opacity="0.72"/>
      <path d="M10,83 C8,91 9,103 13,112 L19,115 L25,109 L25,83 Z" fill={rc(recovery.Arms)} opacity="0.62"/>
      <path d="M90,83 C92,91 91,103 87,112 L81,115 L75,109 L75,83 Z" fill={rc(recovery.Arms)} opacity="0.62"/>
      <path d="M27,110 C21,120 19,138 24,156 L32,160 L36,154 L33,132 L30,110 Z" fill={rc(recovery.Legs)} opacity="0.72"/>
      <path d="M30,110 L50,112 L50,158 L30,158 C27,148 27,127 30,110 Z" fill={rc(recovery.Legs)} opacity="0.72"/>
      <path d="M70,110 L50,112 L50,158 L70,158 C73,148 73,127 70,110 Z" fill={rc(recovery.Legs)} opacity="0.72"/>
      <path d="M73,110 C79,120 81,138 76,156 L68,160 L64,154 L67,132 L70,110 Z" fill={rc(recovery.Legs)} opacity="0.72"/>
      <path d="M24,158 C19,166 20,177 24,186 L34,190 L38,184 L35,158 Z" fill={rc(recovery.Legs)} opacity="0.62"/>
      <path d="M76,158 C81,166 80,177 76,186 L66,190 L62,184 L65,158 Z" fill={rc(recovery.Legs)} opacity="0.62"/>
      {/* DIVISION LINES */}
      <line x1="50" y1="31" x2="50" y2="65" stroke={dv} strokeWidth="0.7"/>
      <line x1="50" y1="65" x2="50" y2="102" stroke={dv} strokeWidth="0.6"/>
      <path d="M29,77 Q50,75 71,77" stroke={dv} strokeWidth="0.6" fill="none"/>
      <path d="M29,90 Q50,88 71,90" stroke={dv} strokeWidth="0.6" fill="none"/>
      <line x1="36" y1="110" x2="34" y2="158" stroke={dv} strokeWidth="0.5"/>
      <line x1="64" y1="110" x2="66" y2="158" stroke={dv} strokeWidth="0.5"/>
      {/* LEGEND */}
      <circle cx="8" cy="196" r="3" fill="#22c55e"/>
      <circle cx="21" cy="196" r="3" fill="#f59e0b"/>
      <circle cx="34" cy="196" r="3" fill="#ef4444"/>
    </svg>
  );
}

function FemaleBodyMap({ recovery }: { recovery: Record<MuscleGroup, number> }) {
  const rc = recoveryColor;
  const bg = 'var(--ql-surface2)';
  const sk = 'rgba(80,110,200,0.72)';
  const sw = 0.8;
  const dv = 'rgba(80,110,200,0.32)';
  return (
    <svg width="90" height="180" viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* BASE SHAPES */}
      <ellipse cx="50" cy="11" rx="9" ry="10" fill={bg} stroke={sk} strokeWidth="1.2"/>
      <path d="M45,21 Q50,19 55,21 L56,30 Q50,32 44,30 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M45,22 C42,25 36,30 31,38 L35,44 C40,39 48,35 50,32 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M55,22 C58,25 64,30 69,38 L65,44 C60,39 52,35 50,32 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M15,37 C11,42 11,53 15,63 L21,67 L27,61 L30,52 L32,40 C25,34 18,32 15,37 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M85,37 C89,42 89,53 85,63 L79,67 L73,61 L70,52 L68,40 C75,34 82,32 85,37 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M31,40 C29,36 38,31 50,31 L50,68 Q44,72 36,70 C30,67 29,60 31,50 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M69,40 C71,36 62,31 50,31 L50,68 Q56,72 64,70 C70,67 71,60 69,50 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M32,70 L50,70 L50,106 L32,102 C29,94 29,80 32,70 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M68,70 L50,70 L50,106 L68,102 C71,94 71,80 68,70 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M27,72 L32,70 L32,102 L27,104 C23,96 23,82 27,72 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M73,72 L68,70 L68,102 L73,104 C77,96 77,82 73,72 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M13,54 C11,61 11,72 14,81 L20,85 L26,80 L28,62 L24,52 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M87,54 C89,61 89,72 86,81 L80,85 L74,80 L72,62 L76,52 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M14,81 C12,89 13,101 17,110 L22,113 L27,108 L27,81 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M86,81 C88,89 87,101 83,110 L78,113 L73,108 L73,81 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M14,110 L27,110 L27,119 Q20,122 14,119 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M86,110 L73,110 L73,119 Q80,122 86,119 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M24,104 C21,108 23,116 27,118 L50,120 L73,118 C77,116 79,108 76,104 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M24,116 C18,126 16,144 21,162 L30,166 L34,160 L31,138 L27,116 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M27,116 L50,118 L50,164 L27,164 C23,154 23,134 27,116 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M73,116 L50,118 L50,164 L73,164 C77,154 77,134 73,116 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M76,116 C82,126 84,144 79,162 L70,166 L66,160 L69,138 L73,116 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M21,164 C17,172 18,183 22,192 L31,196 L35,190 L33,164 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M79,164 C83,172 82,183 78,192 L69,196 L65,190 L67,164 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M19,192 L35,194 L34,200 L20,200 Q11,197 19,192 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      <path d="M81,192 L65,194 L66,200 L80,200 Q89,197 81,192 Z" fill={bg} stroke={sk} strokeWidth={sw}/>
      {/* MUSCLE OVERLAYS */}
      <path d="M31,40 C29,36 38,31 50,31 L50,68 Q44,72 36,70 C30,67 29,60 31,50 Z" fill={rc(recovery.Chest)} opacity="0.68"/>
      <path d="M69,40 C71,36 62,31 50,31 L50,68 Q56,72 64,70 C70,67 71,60 69,50 Z" fill={rc(recovery.Chest)} opacity="0.68"/>
      <path d="M45,22 C42,25 36,30 31,38 L35,44 C40,39 48,35 50,32 Z" fill={rc(recovery.Shoulders)} opacity="0.72"/>
      <path d="M55,22 C58,25 64,30 69,38 L65,44 C60,39 52,35 50,32 Z" fill={rc(recovery.Shoulders)} opacity="0.72"/>
      <path d="M15,37 C11,42 11,53 15,63 L21,67 L27,61 L30,52 L32,40 C25,34 18,32 15,37 Z" fill={rc(recovery.Shoulders)} opacity="0.72"/>
      <path d="M85,37 C89,42 89,53 85,63 L79,67 L73,61 L70,52 L68,40 C75,34 82,32 85,37 Z" fill={rc(recovery.Shoulders)} opacity="0.72"/>
      <path d="M32,70 L50,70 L50,106 L32,102 C29,94 29,80 32,70 Z" fill={rc(recovery.Abs)} opacity="0.72"/>
      <path d="M68,70 L50,70 L50,106 L68,102 C71,94 71,80 68,70 Z" fill={rc(recovery.Abs)} opacity="0.72"/>
      <path d="M27,72 L32,70 L32,102 L27,104 C23,96 23,82 27,72 Z" fill={rc(recovery.Abs)} opacity="0.62"/>
      <path d="M73,72 L68,70 L68,102 L73,104 C77,96 77,82 73,72 Z" fill={rc(recovery.Abs)} opacity="0.62"/>
      <path d="M13,54 C11,61 11,72 14,81 L20,85 L26,80 L28,62 L24,52 Z" fill={rc(recovery.Arms)} opacity="0.72"/>
      <path d="M87,54 C89,61 89,72 86,81 L80,85 L74,80 L72,62 L76,52 Z" fill={rc(recovery.Arms)} opacity="0.72"/>
      <path d="M14,81 C12,89 13,101 17,110 L22,113 L27,108 L27,81 Z" fill={rc(recovery.Arms)} opacity="0.62"/>
      <path d="M86,81 C88,89 87,101 83,110 L78,113 L73,108 L73,81 Z" fill={rc(recovery.Arms)} opacity="0.62"/>
      <path d="M24,116 C18,126 16,144 21,162 L30,166 L34,160 L31,138 L27,116 Z" fill={rc(recovery.Legs)} opacity="0.72"/>
      <path d="M27,116 L50,118 L50,164 L27,164 C23,154 23,134 27,116 Z" fill={rc(recovery.Legs)} opacity="0.72"/>
      <path d="M73,116 L50,118 L50,164 L73,164 C77,154 77,134 73,116 Z" fill={rc(recovery.Legs)} opacity="0.72"/>
      <path d="M76,116 C82,126 84,144 79,162 L70,166 L66,160 L69,138 L73,116 Z" fill={rc(recovery.Legs)} opacity="0.72"/>
      <path d="M21,164 C17,172 18,183 22,192 L31,196 L35,190 L33,164 Z" fill={rc(recovery.Legs)} opacity="0.62"/>
      <path d="M79,164 C83,172 82,183 78,192 L69,196 L65,190 L67,164 Z" fill={rc(recovery.Legs)} opacity="0.62"/>
      {/* DIVISION LINES */}
      <line x1="50" y1="31" x2="50" y2="68" stroke={dv} strokeWidth="0.7"/>
      <line x1="50" y1="70" x2="50" y2="106" stroke={dv} strokeWidth="0.6"/>
      <path d="M32,84 Q50,82 68,84" stroke={dv} strokeWidth="0.6" fill="none"/>
      <path d="M32,96 Q50,94 68,96" stroke={dv} strokeWidth="0.6" fill="none"/>
      <line x1="34" y1="116" x2="32" y2="164" stroke={dv} strokeWidth="0.5"/>
      <line x1="66" y1="116" x2="68" y2="164" stroke={dv} strokeWidth="0.5"/>
      {/* LEGEND */}
      <circle cx="8" cy="196" r="3" fill="#22c55e"/>
      <circle cx="21" cy="196" r="3" fill="#f59e0b"/>
      <circle cx="34" cy="196" r="3" fill="#ef4444"/>
    </svg>
  );
}

function RecoverySection() {
  const { gymSessions, gymPlans, calendarEvents, sleepLog, characterAppearance } = useGameStore();

  // Calculate recovery per muscle group
  const now = Date.now();
  const recovery: Record<MuscleGroup, number> = {
    Chest: 100, Back: 100, Shoulders: 100, Arms: 100, Abs: 100, Legs: 100,
  };

  // Find last time each muscle was worked
  const lastWorked: Record<MuscleGroup, number> = {
    Chest: 0, Back: 0, Shoulders: 0, Arms: 0, Abs: 0, Legs: 0,
  };

  for (const session of gymSessions) {
    const plan = gymPlans.find(p => p.id === session.planId);
    if (!plan) continue;
    const sessionMs = new Date(session.date).getTime();
    for (const ex of plan.exercises) {
      for (const muscle of exerciseToMuscles(ex.name)) {
        if (sessionMs > lastWorked[muscle]) lastWorked[muscle] = sessionMs;
      }
    }
  }

  for (const muscle of MUSCLE_GROUPS) {
    if (lastWorked[muscle] === 0) { recovery[muscle] = 100; continue; }
    const hoursSince = (now - lastWorked[muscle]) / (1000 * 60 * 60);
    recovery[muscle] = Math.min(100, Math.round((hoursSince / 72) * 100));
  }

  // Calendar: workout today or tomorrow?
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const workoutPattern = /gym|workout|run|train|lift|exercise|session|cardio/i;
  const upcomingWorkout = calendarEvents?.find(e =>
    (e.date === today || e.date === tomorrow) && workoutPattern.test(e.title)
  );

  // Sleep: last night's sleep
  const lastSleep = sleepLog && sleepLog.length > 0
    ? [...sleepLog].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  // SVG body regions: approximate front-body geometry
  const bodyRegions: { muscle: MuscleGroup; d: string }[] = [
    { muscle: 'Chest',     d: 'M38,52 Q50,48 62,52 L64,72 Q50,76 36,72 Z' },
    { muscle: 'Abs',       d: 'M38,72 Q50,70 62,72 L62,100 Q50,104 38,100 Z' },
    { muscle: 'Shoulders', d: 'M20,44 Q30,36 38,44 L38,60 Q28,58 20,60 Z M62,44 Q70,36 80,44 L80,60 Q72,58 62,60 Z' },
    { muscle: 'Arms',      d: 'M14,62 Q20,58 24,62 L26,90 Q20,92 14,90 Z M76,62 Q80,58 86,62 L86,90 Q80,92 74,90 Z' },
    { muscle: 'Legs',      d: 'M36,104 Q44,102 48,104 L48,148 Q44,150 36,148 Z M52,104 Q56,102 64,104 L64,148 Q56,150 52,148 Z' },
    { muscle: 'Back',      d: '' }, // Back shown in card only (not visible from front)
  ];

  return (
    <div className="bg-ql-surface rounded-2xl border border-ql overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-ql flex items-center justify-between">
        <div>
          <p className="text-ql text-sm font-semibold">Training Load</p>
          <p className="text-ql-3 text-xs mt-0.5">Muscle recovery status</p>
        </div>
        <span className="text-xl">🔄</span>
      </div>

      {/* Calendar banner */}
      {upcomingWorkout && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-ql-accent/10 border border-ql-accent/30 rounded-xl px-3 py-2">
          <span className="text-sm">💪</span>
          <p className="text-ql text-xs font-medium">
            {upcomingWorkout.title} scheduled {upcomingWorkout.date === today ? 'today' : 'tomorrow'} — check recovery below
          </p>
        </div>
      )}

      {/* Sleep banner */}
      {lastSleep && (
        <div className={`mx-4 mt-2 flex items-center gap-2 rounded-xl px-3 py-1.5 border ${
          lastSleep.onTime
            ? 'bg-green-500/10 border-green-500/20'
            : 'bg-amber-500/10 border-amber-500/20'
        }`}>
          <span className="text-xs">{lastSleep.onTime ? '😴' : '⚠️'}</span>
          <p className={`text-xs font-medium ${lastSleep.onTime ? 'text-green-400' : 'text-amber-400'}`}>
            {lastSleep.onTime ? 'Good sleep logged — recovery boosted ✓' : 'Poor sleep slows muscle recovery'}
          </p>
        </div>
      )}

      <div className="flex gap-3 px-4 py-4">
        {/* SVG body diagram */}
        <div className="shrink-0">
          {characterAppearance.gender === 'feminine'
            ? <FemaleBodyMap recovery={recovery} />
            : <MaleBodyMap recovery={recovery} />
          }
          <div className="flex gap-2 text-[9px] text-ql-3 justify-center -mt-1">
            <span>Ready</span><span>Part.</span><span>Fatigued</span>
          </div>
        </div>

        {/* Muscle cards 2×3 grid */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          {(['Chest', 'Back', 'Shoulders', 'Arms', 'Abs', 'Legs'] as MuscleGroup[]).map(muscle => {
            const pct = recovery[muscle];
            const color = recoveryColor(pct);
            return (
              <div key={muscle} className="bg-ql-surface2 rounded-xl p-2.5 border border-ql">
                <p className="text-ql text-[11px] font-semibold mb-1.5">{muscle}</p>
                <div className="h-1.5 bg-ql-surface3 rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <p className="text-[10px] font-bold tabular-nums" style={{ color }}>{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function GymFitness() {
  const {
    gymPlans, gymSessions, addGymPlan, updateGymPlan, removeGymPlan, logGymSession, removeGymSession,
    stats, savedGymPrefs, setSavedGymPrefs,
    stepLog, stepGoal, gpsActivities, floorsGoal,
    performanceStats, performanceLog, deletePerformanceEntry,
    gpsTrackingEnabled, calendarEvents, sleepLog,
  } = useGameStore();
  const [activeTab,    setActiveTab]    = useState<'plans' | 'steps' | 'performance' | 'track'>('plans');
  const [showAdd,      setShowAdd]      = useState(false);
  const [editing,      setEditing]      = useState<GymPlan | null>(null);
  const [logging,      setLogging]      = useState<string | null>(null);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiPreview,    setAiPreview]    = useState<Omit<GymPlan, 'id' | 'createdAt'> | null>(null);
  const [aiError,      setAiError]      = useState<string | null>(null);
  const [showQuiz,     setShowQuiz]     = useState(false);
  const [viewingStat,   setViewingStat]   = useState<PerformanceStat | null>(null);
  const [viewingSteps,  setViewingSteps]  = useState(false);
  const [viewingFloors, setViewingFloors] = useState(false);
  const [viewingGymPlan, setViewingGymPlan] = useState<GymPlan | null>(null);

  const GYM_QUIZ: QuizQuestion[] = [
    {
      id: 'type', question: 'What type of training?', emoji: '🏅',
      options: [
        { label: 'Weights / gym',        emoji: '🏋️', value: 'Weights and gym training' },
        { label: 'Running',              emoji: '🏃', value: 'Running' },
        { label: 'Mix of both',          emoji: '⚡', value: 'Mix of weights and running' },
        { label: 'Bodyweight / home',    emoji: '🏠', value: 'Bodyweight home workout' },
      ],
    },
    {
      id: 'goal', question: "What's your main goal?", emoji: '🎯',
      multiSelect: true,
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
        { label: 'Complete beginner',        emoji: '🌱', value: 'Complete beginner — baby steps' },
        { label: 'Some experience',          emoji: '⚡', value: 'Some experience (6 months – 2 years)' },
        { label: 'Experienced',              emoji: '🏆', value: 'Experienced (2+ years)' },
      ],
    },
    {
      id: 'daysPerWeek', question: 'How many days per week?', emoji: '📅',
      options: [
        { label: '1 day — just starting',  emoji: '1️⃣', value: '1' },
        { label: '2 days',                 emoji: '2️⃣', value: '2' },
        { label: '3 days',                 emoji: '3️⃣', value: '3' },
        { label: '4 days',                 emoji: '4️⃣', value: '4' },
        { label: '5 days',                 emoji: '5️⃣', value: '5' },
      ],
    },
    {
      id: 'focus', question: 'Anything specific to focus on?', emoji: '🔍',
      multiSelect: true,
      options: [
        { label: 'Full body / balanced',   emoji: '🔄', value: 'Full body balanced' },
        { label: 'Upper body',             emoji: '💪', value: 'Upper body' },
        { label: 'Lower body / legs',      emoji: '🦵', value: 'Lower body and legs' },
        { label: 'Core & stability',       emoji: '🎯', value: 'Core and stability' },
        { label: 'No preference',          emoji: '✅', value: 'No specific preference' },
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
        body: JSON.stringify({
          mode: 'generate_gym_plan',
          context: { stats, gymLog: gymSessions, preferences },
        }),
      });
      const data = await res.json();
      if (data.plan) {
        setAiPreview(data.plan);
      } else {
        setAiError(data.error ?? 'Failed to generate plan');
      }
    } catch {
      setAiError('Connection lost — check your API key');
    } finally {
      setAiLoading(false);
    }
  };

  const today    = toDateStr(new Date());
  const todayDow = new Date().getDay();

  const todayPlans = gymPlans.filter(p => p.scheduleDays.includes(todayDow));
  const sessionToday = (planId: string) =>
    gymSessions.some(s => s.planId === planId && s.date.slice(0, 10) === today);

  const todaySession = (planId: string) =>
    gymSessions.find(s => s.planId === planId && s.date.slice(0, 10) === today);

  const totalVolume = (plan: GymPlan) =>
    plan.exercises.reduce((sum, ex) => sum + ex.sets * ex.targetReps * (ex.targetWeight || 1), 0);

  const sessionCountThisWeek = (planId: string) => {
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return gymSessions.filter(s => s.planId === planId && new Date(s.date) >= monday).length;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-ql text-xl font-bold">Fitness</h2>
          <p className="text-ql-3 text-xs mt-0.5">
            {gymPlans.length} plan{gymPlans.length !== 1 ? 's' : ''} · {gymSessions.length} sessions total 
          </p>
        </div>
        <div className="flex gap-2">
          {/* AI Plan button hidden — use GAINN AI floating assistant instead */}
          {activeTab === 'plans' && (
            <button onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-ql-accent hover:bg-ql-accent-h text-white text-sm font-medium rounded-2xl transition-colors"
            >
              + Custom Plan 🔧
            </button>
          )}
        </div>
      </div>

      {/* ── Sub-tab pill bar ── */}
      <div className="flex bg-ql-surface2 rounded-2xl p-1 border border-ql">
        {([
          { id: 'plans',       label: '🏋️ Plans'  },
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

      {/* ── Plans tab ── */}
      {activeTab === 'plans' && <>

      {/* AI error */}
      {aiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 flex items-center justify-between">
          <p className="text-red-400 text-sm">{aiError}</p>
          <button onClick={() => setAiError(null)} className="text-red-400 text-xs underline ml-3">Dismiss</button>
        </div>
      )}

      {/* AI-generated plan preview */}
      {aiPreview && (
        <div className="bg-ql-surface rounded-2xl shadow-ql border-2 border-ql-accent/50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-ql-accent/10 border-b border-ql-accent/30">
            <span className="text-base">⚡</span>
            <span className="text-ql text-sm font-semibold">AI-Generated Plan</span>
            <span className="ml-auto text-ql-3 text-xs">Review before saving</span>
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
                  <span className="text-ql-3 text-xs tabular-nums">
                    {ex.sets}×{ex.targetReps}{ex.targetWeight > 0 ? ` @ ${ex.targetWeight}kg` : ' BW'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { addGymPlan(aiPreview); setAiPreview(null); }}
                className="flex-1 py-2.5 bg-ql-accent hover:bg-ql-accent-h text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Save to My Plans
              </button>
              <button
                onClick={() => setAiPreview(null)}
                className="px-4 py-2.5 bg-ql-surface3 text-ql-2 text-sm rounded-xl"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today's workouts */}
      {todayPlans.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-ql text-sm font-semibold">Today</p>
          {todayPlans.map(plan => {
            const done = sessionToday(plan.id);
            return (
              <div key={plan.id}
                className={`bg-ql-surface rounded-2xl shadow-ql border transition-all ${
                  done ? 'border-ql-accent/40' : 'border-ql'
                } p-4`}
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
                  {done ? (
                    <div className="flex items-center gap-2">
                      <span className="text-ql-accent text-xs font-bold">Done ✓</span>
                      <button
                        onClick={() => { const s = todaySession(plan.id); if (s) removeGymSession(s.id); }}
                        className="text-ql-3 hover:text-red-400 text-[10px] underline transition-colors"
                      >Undo</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => logGymSession(plan.id)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
                      style={{ backgroundColor: plan.color }}
                    >Log Workout</button>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {plan.exercises.slice(0, 3).map(ex => (
                    <div key={ex.id} className="flex items-center justify-between text-xs text-ql-3">
                      <span>{ex.name}</span>
                      <span className="tabular-nums">
                        {ex.sets}×{ex.targetReps}{ex.targetWeight > 0 ? ` @ ${ex.targetWeight}kg` : ' BW'}
                      </span>
                    </div>
                  ))}
                  {plan.exercises.length > 3 && (
                    <p className="text-ql-3 text-[10px]">+{plan.exercises.length - 3} more exercises</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {gymPlans.length === 0 && (
        <div className="text-center py-14 text-ql-3">
          <div className="text-5xl mb-3">🏋️</div>
          <p className="text-sm font-medium">No workout plans yet</p>
          <p className="text-xs mt-1">Tap 🔧 Custom Plan or ask GAINN AI to build one for you.</p>
        </div>
      )}

      {/* All plans */}
      {gymPlans.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-ql text-sm font-semibold">My Plans</p>
          {gymPlans.map(plan => {
            const thisWeek = sessionCountThisWeek(plan.id);
            const schedLabel = plan.scheduleDays.length === 0 ? 'No schedule'
              : plan.scheduleDays.map(d => DAY_LABEL[d]).join(', ');

            return (
              <div key={plan.id} className="bg-ql-surface rounded-2xl shadow-ql border border-ql overflow-hidden">
                {/* Plan header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-ql">
                  <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: plan.color }} />
                  <span className="text-xl">{plan.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-ql text-sm font-semibold">{plan.name}</p>
                    <p className="text-ql-3 text-[10px]">
                      {schedLabel}{plan.scheduleTime ? ` · ${fmt12(plan.scheduleTime)}${plan.scheduleEndTime ? ` – ${fmt12(plan.scheduleEndTime)}` : ''}` : ''} · {thisWeek} this week
                    </p>
                  </div>
                  <button onClick={() => setEditing(plan)}
                    className="text-ql-3 hover:text-ql text-xs px-2 py-1 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button onClick={() => removeGymPlan(plan.id)}
                    className="text-ql-3 hover:text-red-500 text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Split + recovery info */}
                {(plan.split || plan.recoveryNotes) && (
                  <div className="px-4 pt-3 flex flex-col gap-1.5">
                    {plan.split && (
                      <span className="inline-flex items-center gap-1 self-start text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: plan.color + '22', color: plan.color }}>
                        ⚡ {plan.split}
                      </span>
                    )}
                    {plan.recoveryNotes && (
                      <p className="text-ql-3 text-[11px] leading-relaxed">
                        🔁 {plan.recoveryNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* Exercises list */}
                <div className="px-4 py-3 flex flex-col gap-1.5">
                  {plan.exercises.map(ex => (
                    <div key={ex.id} className="flex items-center justify-between">
                      <span className="text-ql-2 text-sm">{ex.name}</span>
                      <span className="text-ql-3 text-xs tabular-nums">
                        {ex.sets}×{ex.targetReps}
                        {ex.targetWeight > 0 ? ` @ ${ex.targetWeight}kg` : ' BW'}
                      </span>
                    </div>
                  ))}
                  {plan.exercises.length === 0 && (
                    <p className="text-ql-3 text-xs italic">No exercises yet — tap Edit to add some.</p>
                  )}
                </div>

                {/* Log button */}
                <div className="px-4 pb-3">
                  {sessionToday(plan.id) ? (
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-ql-surface2 border border-ql">
                      <span className="text-sm font-semibold" style={{ color: plan.color }}>✓ Logged today</span>
                      <button
                        onClick={() => { const s = todaySession(plan.id); if (s) removeGymSession(s.id); }}
                        className="text-ql-3 hover:text-red-400 text-xs underline transition-colors"
                      >Undo</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => logGymSession(plan.id)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                      style={{ backgroundColor: plan.color }}
                    >Log Workout</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {gymSessions.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          <div className="bg-ql-surface rounded-2xl shadow-ql-sm border border-ql p-3 text-center">
            <div className="text-ql text-lg font-bold tabular-nums">{gymSessions.length}</div>
            <div className="text-ql-3 text-[10px] font-medium mt-0.5">Sessions</div>
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {gymSessions.length > 0 && (
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
                
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <PlanSheet onClose={() => setShowAdd(false)} onSave={plan => addGymPlan(plan)} />
      )}
      {editing && (
        <PlanSheet initial={editing} onClose={() => setEditing(null)}
          onSave={plan => updateGymPlan(editing.id, plan)}
        />
      )}
      {showQuiz && (
        <AIQuizSheet
          title="AI Fitness Plan"
          questions={GYM_QUIZ}
          savedAnswers={savedGymPrefs}
          onComplete={generateAIPlan}
          onClose={() => setShowQuiz(false)}
        />
      )}
      </>}

      {/* ── Steps tab ── */}
      {activeTab === 'steps' && (
        <StepTracker belowStats={<FloorsSection />} />
      )}

      {/* ── Track tab ── */}
      {activeTab === 'track' && <ActivityTracker />}

      {/* ── Stats tab ── */}
      {activeTab === 'performance' && (
        <>
          <RecoverySection />
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
                const linkedPlan  = gymPlans.find(p => p.linkedStatId === stat.id);
                const isSteps     = stat.id === 'builtin-steps';
                const isFloors    = stat.id === 'builtin-floors';
                const handleTap   = () => isSteps ? setViewingSteps(true) : isFloors ? setViewingFloors(true) : linkedPlan ? setViewingGymPlan(linkedPlan) : setViewingStat(stat);

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

      {/* ── Detail sheets ── */}
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
      {viewingGymPlan && (
        <GymPlanDetailSheet
          plan={viewingGymPlan}
          performanceLog={performanceLog}
          onClose={() => setViewingGymPlan(null)}
        />
      )}

      {/* FormAnalyzer hidden — use GAINN AI floating assistant instead */}
      <AIAdvisor section="gym" />
    </div>
  );
}
