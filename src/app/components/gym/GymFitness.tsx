'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { GymPlan, GymExercise } from '@/types';
import AIAdvisor from '../shared/AIAdvisor';
import FormAnalyzer from './FormAnalyzer';
import AIQuizSheet, { type QuizQuestion } from '../shared/AIQuizSheet';

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
  const [name,      setName]      = useState(initial?.name      ?? '');
  const [emoji,     setEmoji]     = useState(initial?.emoji     ?? '💪');
  const [color,     setColor]     = useState(initial?.color     ?? '#ff3b30');
  const [days,      setDays]      = useState<number[]>(initial?.scheduleDays ?? []);
  const [time,      setTime]      = useState(initial?.scheduleTime    ?? '');
  const [endTime,   setEndTime]   = useState(initial?.scheduleEndTime ?? '');
  const [exercises, setExercises] = useState<GymExercise[]>(initial?.exercises ?? []);
  const [newEx,     setNewEx]     = useState('');

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
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="flex flex-col gap-0.5">
              <p className="text-ql-3 text-xs font-medium">Start time</p>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2.5 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-ql-3 text-xs font-medium">End time</p>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2.5 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
              />
            </div>
          </div>
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
          onSave({ name: name.trim(), emoji, color, exercises, scheduleDays: days, scheduleTime: time, scheduleEndTime: endTime });
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function GymFitness() {
  const { gymPlans, gymSessions, addGymPlan, updateGymPlan, removeGymPlan, logGymSession, stats, savedGymPrefs, setSavedGymPrefs } = useGameStore();
  const [showAdd,      setShowAdd]      = useState(false);
  const [editing,      setEditing]      = useState<GymPlan | null>(null);
  const [logging,      setLogging]      = useState<string | null>(null);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiPreview,    setAiPreview]    = useState<Omit<GymPlan, 'id' | 'createdAt'> | null>(null);
  const [aiError,      setAiError]      = useState<string | null>(null);
  const [showQuiz,     setShowQuiz]     = useState(false);

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
            {gymPlans.length} plan{gymPlans.length !== 1 ? 's' : ''} · {gymSessions.length} sessions total · +75 XP each
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuiz(true)}
            disabled={aiLoading}
            className="px-3 py-2 bg-ql-surface2 border border-ql hover:border-ql-accent text-ql text-sm font-medium rounded-2xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {aiLoading ? <span className="animate-spin">⚙️</span> : '⚡'}
            {aiLoading ? 'Generating…' : 'AI Plan'}
          </button>
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-ql-accent hover:bg-ql-accent-h text-white text-sm font-medium rounded-2xl transition-colors"
          >
            + Plan
          </button>
        </div>
      </div>

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
                  {done
                    ? <span className="text-ql-accent text-xs font-bold">+75 XP ✓</span>
                    : (
                      <button
                        onClick={() => { logGymSession(plan.id); }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
                        style={{ backgroundColor: plan.color }}
                      >
                        Log Workout
                      </button>
                    )
                  }
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
          <p className="text-xs mt-1">Tap + Plan to build your first routine.</p>
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
                  <button
                    onClick={() => logGymSession(plan.id)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                    style={{ backgroundColor: plan.color }}
                  >
                    Log Workout · +75 XP +3 STR
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {gymSessions.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-ql-surface rounded-2xl shadow-ql-sm border border-ql p-3 text-center">
            <div className="text-ql text-lg font-bold tabular-nums">{gymSessions.length}</div>
            <div className="text-ql-3 text-[10px] font-medium mt-0.5">Sessions</div>
          </div>
          <div className="bg-ql-surface rounded-2xl shadow-ql-sm border border-ql p-3 text-center">
            <div className="text-ql text-lg font-bold tabular-nums">{stats.str}</div>
            <div className="text-ql-3 text-[10px] font-medium mt-0.5">STR</div>
          </div>
          <div className="bg-ql-surface rounded-2xl shadow-ql-sm border border-ql p-3 text-center">
            <div className="text-ql text-lg font-bold tabular-nums">Lv.{stats.level}</div>
            <div className="text-ql-3 text-[10px] font-medium mt-0.5">Character</div>
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
                <span className="text-ql-accent text-xs font-bold">+75 XP</span>
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

      <FormAnalyzer />
      <AIAdvisor section="gym" />
    </div>
  );
}
