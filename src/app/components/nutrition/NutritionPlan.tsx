'use client';

import { useState, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { NutritionGoal, Micros } from '@/types';
import AIAdvisor from '../shared/AIAdvisor';
import AIQuizSheet, { type QuizQuestion } from '../shared/AIQuizSheet';
import BarcodeScanner, { type ScannedProduct } from './BarcodeScanner';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


function MacroBar({
  label,
  current,
  target,
  color,
  unit = 'g',
  overIsGood = false,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
  unit?: string;
  overIsGood?: boolean;
}) {
  const ratio = target > 0 ? current / target : 0;
  const pct   = Math.min(100, ratio * 100);
  const over  = ratio > 1.05;
  const warn  = over && !overIsGood;
  const celebrate = over && overIsGood;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium ${warn ? 'text-red-400' : 'text-ql-3'}`}>{label}</span>
          {warn      && <span className="text-[10px]">⚠️</span>}
          {celebrate && <span className="text-[10px]">💪</span>}
        </div>
        <span className={`text-xs tabular-nums font-medium ${warn ? 'text-red-400' : celebrate ? 'text-emerald-400' : 'text-ql'}`}>
          {current.toFixed(0)}{unit} / {target}{unit}
          {warn && ` (+${Math.round((ratio - 1) * 100)}%)`}
        </span>
      </div>
      <div className="h-1.5 bg-ql-surface3 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${warn ? 'bg-red-500' : celebrate ? 'bg-emerald-500' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Goal Editor Sheet ─────────────────────────────────────────────────────────
function GoalSheet({
  goal,
  onSave,
  onClose,
}: {
  goal: NutritionGoal;
  onSave: (g: NutritionGoal) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    calories: String(goal.calories),
    protein: String(goal.protein),
    carbs: String(goal.carbs),
    fat: String(goal.fat),
    saturatedFat: String(goal.saturatedFat ?? ''),
    unsaturatedFat: String(goal.unsaturatedFat ?? ''),
    sugar: String(goal.sugar ?? 50),
  });

  const up = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const parsed: NutritionGoal = {
      calories: parseInt(form.calories) || 2000,
      protein: parseInt(form.protein) || 150,
      carbs: parseInt(form.carbs) || 200,
      fat: parseInt(form.fat) || 65,
      sugar: parseInt(form.sugar) || 50,
    };
    if (form.saturatedFat) parsed.saturatedFat = parseInt(form.saturatedFat) || undefined;
    if (form.unsaturatedFat) parsed.unsaturatedFat = parseInt(form.unsaturatedFat) || undefined;
    onSave(parsed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-ql-surface rounded-t-3xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-ql-surface3" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-ql">
          <button onClick={onClose} className="text-ql-3 text-sm">Cancel</button>
          <h3 className="text-ql text-sm font-semibold">Daily Targets</h3>
          <button onClick={handleSave} className="text-ql-accent text-sm font-semibold">Save</button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          {(
            [
              { key: 'calories',      label: 'Calories',       unit: 'kcal', placeholder: '2000' },
              { key: 'protein',       label: 'Protein',        unit: 'g',    placeholder: '150'  },
              { key: 'carbs',         label: 'Carbs',          unit: 'g',    placeholder: '200'  },
              { key: 'fat',           label: 'Fat (total)',    unit: 'g',    placeholder: '65'   },
              { key: 'saturatedFat',  label: 'Saturated Fat',  unit: 'g',    placeholder: '20'   },
              { key: 'unsaturatedFat',label: 'Unsaturated Fat',unit: 'g',    placeholder: '45'   },
              { key: 'sugar',         label: 'Sugar',          unit: 'g',    placeholder: '50'   },
            ] as const
          ).map(({ key, label, unit, placeholder }) => (
            <div key={key} className="bg-ql-surface2 rounded-2xl border border-ql px-4 py-3 flex items-center gap-3">
              <span className="text-ql text-sm font-medium flex-1">{label}</span>
              <input
                type="number"
                inputMode="numeric"
                value={form[key]}
                onChange={e => up(key, e.target.value)}
                placeholder={placeholder}
                className="w-24 bg-ql-input border border-ql rounded-xl px-3 py-1.5 text-sm text-ql outline-none focus:border-ql-accent text-right"
              />
              <span className="text-ql-3 text-xs w-8">{unit}</span>
            </div>
          ))}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

// ─── Add Meal Sheet ────────────────────────────────────────────────────────────
function AddMealSheet({ onClose }: { onClose: () => void }) {
  const { logMeal } = useGameStore();
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', saturatedFat: '', unsaturatedFat: '', sugar: '' });
  const [micros, setMicros] = useState<Micros | undefined>(undefined);
  const [servingNote, setServingNote] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const up = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const valid = form.name.trim().length > 0 && parseInt(form.calories) > 0;

  const handleAdd = () => {
    if (!valid) return;
    logMeal({
      name: form.name.trim(),
      calories: parseInt(form.calories) || 0,
      protein: parseInt(form.protein) || 0,
      carbs: parseInt(form.carbs) || 0,
      fat: parseInt(form.fat) || 0,
      ...(form.saturatedFat   ? { saturatedFat:   parseInt(form.saturatedFat)   } : {}),
      ...(form.unsaturatedFat ? { unsaturatedFat: parseInt(form.unsaturatedFat) } : {}),
      sugar: parseInt(form.sugar) || 0,
      micros,
    });
    onClose();
  };

  const handleScan = (product: ScannedProduct) => {
    setForm({
      name:           product.name,
      calories:       String(product.calories),
      protein:        String(product.protein),
      carbs:          String(product.carbs),
      fat:            String(product.fat),
      saturatedFat:   product.saturatedFat != null ? String(product.saturatedFat) : '',
      unsaturatedFat: product.unsaturatedFat != null ? String(product.unsaturatedFat) : '',
      sugar:          String(product.sugar),
    });
    setMicros(product.micros);
    if (product.servingSize) setServingNote(`Per ${product.servingSize}`);
    setShowScanner(false);
  };

  const hasMicros = micros && Object.values(micros).some(v => v != null);

  return (
    <>
      {showScanner && (
        <BarcodeScanner onResult={handleScan} onClose={() => setShowScanner(false)} />
      )}
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
        <div className="bg-ql-surface rounded-t-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-ql-surface3" />
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-ql">
            <button onClick={onClose} className="text-ql-3 text-sm">Cancel</button>
            <h3 className="text-ql text-sm font-semibold">Log Meal</h3>
            <button
              onClick={handleAdd}
              className={`text-sm font-semibold ${valid ? 'text-ql-accent' : 'text-ql-3'}`}
            >
              Add
            </button>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            {/* Scan button */}
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center justify-center gap-2 w-full bg-ql-accent/10 border border-ql-accent/30 rounded-2xl px-4 py-3 text-ql-accent text-sm font-semibold"
            >
              <span className="text-base">📷</span>
              Scan Barcode / QR Code
            </button>

            <input
              autoFocus
              value={form.name}
              onChange={e => up('name', e.target.value)}
              placeholder="Meal name (e.g. Chicken & Rice)"
              className="w-full bg-ql-surface2 rounded-2xl px-4 py-3 text-ql text-base font-medium outline-none border border-ql focus:border-ql-accent transition-colors placeholder:text-ql-3"
            />

            {servingNote && (
              <p className="text-ql-3 text-xs px-1">{servingNote}</p>
            )}

            {(
              [
                { key: 'calories',       label: 'Calories',        unit: 'kcal' },
                { key: 'protein',        label: 'Protein',         unit: 'g' },
                { key: 'carbs',          label: 'Carbs',           unit: 'g' },
                { key: 'fat',            label: 'Fat (total)',     unit: 'g' },
                { key: 'saturatedFat',   label: 'Saturated Fat',   unit: 'g' },
                { key: 'unsaturatedFat', label: 'Unsaturated Fat', unit: 'g' },
                { key: 'sugar',          label: 'Sugar',           unit: 'g' },
              ] as const
            ).map(({ key, label, unit }) => (
              <div key={key} className="bg-ql-surface2 rounded-2xl border border-ql px-4 py-3 flex items-center gap-3">
                <span className="text-ql text-sm font-medium flex-1">{label}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form[key]}
                  onChange={e => up(key, e.target.value)}
                  placeholder="0"
                  className="w-24 bg-ql-input border border-ql rounded-xl px-3 py-1.5 text-sm text-ql outline-none focus:border-ql-accent text-right"
                />
                <span className="text-ql-3 text-xs w-8">{unit}</span>
              </div>
            ))}

            {/* Micros preview (when scanned) */}
            {hasMicros && (
              <div className="bg-ql-surface2 border border-ql rounded-2xl p-3">
                <p className="text-ql text-xs font-semibold mb-2">Vitamins & Minerals (from barcode scan)</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {[
                    { key: 'vitA',      label: 'Vit A',      unit: 'µg' },
                    { key: 'vitC',      label: 'Vit C',      unit: 'mg' },
                    { key: 'vitD',      label: 'Vit D',      unit: 'µg' },
                    { key: 'vitE',      label: 'Vit E',      unit: 'mg' },
                    { key: 'vitK',      label: 'Vit K',      unit: 'µg' },
                    { key: 'vitB6',     label: 'Vit B6',     unit: 'mg' },
                    { key: 'vitB12',    label: 'Vit B12',    unit: 'µg' },
                    { key: 'folate',    label: 'Folate',     unit: 'µg' },
                    { key: 'calcium',   label: 'Calcium',    unit: 'mg' },
                    { key: 'iron',      label: 'Iron',       unit: 'mg' },
                    { key: 'magnesium', label: 'Magnesium',  unit: 'mg' },
                    { key: 'zinc',      label: 'Zinc',       unit: 'mg' },
                    { key: 'potassium', label: 'Potassium',  unit: 'mg' },
                    { key: 'sodium',    label: 'Sodium',     unit: 'mg' },
                  ].filter(m => micros[m.key as keyof Micros] != null).map(m => (
                    <div key={m.key} className="flex justify-between text-[11px]">
                      <span className="text-ql-3">{m.label}</span>
                      <span className="text-ql font-medium tabular-nums">
                        {micros[m.key as keyof Micros]}{m.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="h-4" />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Nutrition Calendar ────────────────────────────────────────────────────────
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function NutritionCalendar({
  mealLog,
  nutritionGoal,
  onDayClick,
}: {
  mealLog: import('@/types').MealEntry[];
  nutritionGoal: NutritionGoal;
  onDayClick: (date: string) => void;
}) {
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed

  const todayStr = toStr(now.getFullYear(), now.getMonth(), now.getDate());

  // Build calorie map for quick lookup
  const calMap: Record<string, number> = {};
  const mealMap: Record<string, number> = {};
  mealLog.forEach(m => {
    calMap[m.date]  = (calMap[m.date]  ?? 0) + m.calories;
    mealMap[m.date] = (mealMap[m.date] ?? 0) + 1;
  });

  // Build day cells for the grid (Mon-start)
  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // getDay() is 0=Sun..6=Sat; convert to Mon-first offset
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-GB', {
    month: 'long', year: 'numeric',
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  // Don't go into the future beyond the current month
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  return (
    <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-4">
      {/* Section title */}
      <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-widest mb-3">Food Log</p>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="text-ql-3 px-2 py-1 text-sm">‹</button>
        <p className="text-ql text-sm font-semibold">{monthLabel}</p>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="text-ql-3 px-2 py-1 text-sm disabled:opacity-30"
        >›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-ql-3 text-[10px] font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;

          const dateStr = toStr(viewYear, viewMonth, day);
          const cals    = calMap[dateStr] ?? 0;
          const meals   = mealMap[dateStr] ?? 0;
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const hitGoal  = cals >= nutritionGoal.calories * 0.9;
          const partial  = cals > 0 && !hitGoal;
          const logged   = cals > 0;

          return (
            <button
              key={dateStr}
              disabled={isFuture}
              onClick={() => onDayClick(dateStr)}
              className={`
                relative flex flex-col items-center justify-center rounded-xl py-1.5 gap-0.5 transition-all
                ${isFuture ? 'opacity-25 pointer-events-none' : 'active:scale-95'}
                ${isToday ? 'ring-2 ring-ql-accent' : ''}
                ${logged
                  ? hitGoal
                    ? 'bg-emerald-500/20'
                    : 'bg-amber-400/15'
                  : 'bg-ql-surface2'}
              `}
            >
              <span className={`text-xs font-bold tabular-nums ${isToday ? 'text-ql-accent' : logged ? 'text-ql' : 'text-ql-3'}`}>
                {day}
              </span>

              {/* Status dot */}
              <div className={`w-1.5 h-1.5 rounded-full ${
                !logged ? 'bg-transparent'
                : hitGoal ? 'bg-emerald-500'
                : 'bg-amber-400'
              }`} />

              {/* Calorie mini label */}
              {logged && (
                <span className="text-[8px] tabular-nums text-ql-3 leading-none">
                  {cals >= 1000 ? `${(cals / 1000).toFixed(1)}k` : cals}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-ql">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-ql-3 text-[10px]">Goal hit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-ql-3 text-[10px]">Partial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-ql-surface3" />
          <span className="text-ql-3 text-[10px]">Nothing logged</span>
        </div>
      </div>
    </div>
  );
}

// ─── Day Detail Sheet ──────────────────────────────────────────────────────────
function DayDetailSheet({
  date,
  meals,
  nutritionGoal,
  onClose,
  onDelete,
}: {
  date: string;
  meals: import('@/types').MealEntry[];
  nutritionGoal: NutritionGoal;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const d = new Date(date + 'T00:00:00');
  const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      saturatedFat: acc.saturatedFat + (m.saturatedFat ?? 0),
      unsaturatedFat: acc.unsaturatedFat + (m.unsaturatedFat ?? 0),
      sugar: acc.sugar + (m.sugar ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, saturatedFat: 0, unsaturatedFat: 0, sugar: 0 }
  );

  const calPct = Math.min(100, Math.round((totals.calories / nutritionGoal.calories) * 100));
  const hitGoal = calPct >= 90;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="bg-ql-surface rounded-t-3xl flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-ql-surface3" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 border-b border-ql shrink-0">
          <div>
            <h3 className="text-ql text-sm font-semibold">{label}</h3>
            <p className="text-ql-3 text-[10px] mt-0.5">
              {meals.length === 0 ? 'Nothing logged' : `${meals.length} meal${meals.length !== 1 ? 's' : ''} · ${totals.calories} kcal`}
            </p>
          </div>
          <button onClick={onClose} className="text-ql-3 text-sm px-2 mt-0.5">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-4 flex flex-col gap-4 pb-6">
          {meals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">🍽️</p>
              <p className="text-ql-3 text-sm">No meals logged for this day</p>
            </div>
          ) : (
            <>
              {/* Daily macro summary */}
              <div className="bg-ql-surface2 rounded-2xl border border-ql p-4">
                {/* Calorie bar */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-ql text-sm font-semibold">Daily Total</span>
                  <span className={`text-xs font-semibold tabular-nums ${hitGoal ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {totals.calories} / {nutritionGoal.calories} kcal {hitGoal ? '✓' : ''}
                  </span>
                </div>
                <div className="h-2 bg-ql-surface3 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${calPct}%`,
                      background: hitGoal ? '#22c55e' : '#f59e0b',
                    }}
                  />
                </div>

                {/* Macro tiles */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Protein', val: totals.protein,  target: nutritionGoal.protein,     unit: 'g', color: '#60a5fa', overIsGood: true  },
                    { label: 'Carbs',   val: totals.carbs,    target: nutritionGoal.carbs,        unit: 'g', color: '#f59e0b', overIsGood: false },
                    { label: 'Fat',     val: totals.fat,      target: nutritionGoal.fat,          unit: 'g', color: '#22c55e', overIsGood: false },
                    { label: 'Sugar',   val: totals.sugar,    target: nutritionGoal.sugar ?? 50,  unit: 'g', color: '#ec4899', overIsGood: false },
                  ].map(({ label, val, target, unit, color, overIsGood }) => {
                    const isFat = label === 'Fat';
                    const ratio = target > 0 ? val / target : 0;
                    const pct   = Math.min(100, ratio * 100);
                    const over  = ratio > 1.05;
                    const warn  = over && !overIsGood;
                    const barColor = warn ? '#ef4444' : over && overIsGood ? '#22c55e' : color;
                    return (
                      <div
                        key={label}
                        className={`bg-ql-surface rounded-xl p-2 border text-center ${warn ? 'border-red-500/50' : 'border-ql'}`}
                      >
                        <div className={`text-sm font-bold tabular-nums ${warn ? 'text-red-400' : over && overIsGood ? 'text-emerald-400' : 'text-ql'}`}>
                          {val}
                        </div>
                        <div className="text-ql-3 text-[9px]">{unit}</div>
                        <div className={`text-[9px] font-medium mb-1 ${warn ? 'text-red-400' : 'text-ql-3'}`}>
                          {label}{warn ? ' ⚠️' : over && overIsGood ? ' 💪' : ''}
                        </div>
                        <div className="h-1 bg-ql-surface3 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                        </div>
                        {isFat && (totals.saturatedFat > 0 || totals.unsaturatedFat > 0) && (
                          <div className="mt-1 text-[8px] text-ql-3 tabular-nums leading-tight">
                            {totals.saturatedFat > 0 && <div>Sat {totals.saturatedFat}g</div>}
                            {totals.unsaturatedFat > 0 && <div>Unsat {totals.unsaturatedFat}g</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Meal list */}
              <div className="flex flex-col gap-2">
                {meals.map(meal => (
                  <div
                    key={meal.id}
                    className="bg-ql-surface2 rounded-2xl border border-ql px-4 py-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-ql text-sm font-medium">{meal.name}</p>
                      <p className="text-ql-3 text-[10px] mt-0.5 tabular-nums">
                        {meal.calories} kcal · P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g
                        {(meal.saturatedFat ?? 0) > 0 ? ` (Sat ${meal.saturatedFat}g)` : ''}
                        {(meal.sugar ?? 0) > 0 ? ` · S ${meal.sugar}g` : ''}
                        {meal.micros && <span className="text-ql-accent"> · 🧬</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => onDelete(meal.id)}
                      className="text-ql-3 hover:text-red-500 text-sm transition-colors shrink-0 px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Nutrition History Sheet ───────────────────────────────────────────────────
function NutritionHistorySheet({
  mealLog,
  nutritionGoal,
  onClose,
  onDelete,
}: {
  mealLog: import('@/types').MealEntry[];
  nutritionGoal: NutritionGoal;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [filterMonth, setFilterMonth] = useState<string>(''); // 'YYYY-MM' or ''

  const toggleDate = (date: string) =>
    setExpandedDates(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });

  // Group all meals by date, sorted newest first
  const grouped = Object.entries(
    mealLog.reduce<Record<string, typeof mealLog>>((acc, m) => {
      (acc[m.date] ??= []).push(m);
      return acc;
    }, {})
  )
    .sort(([a], [b]) => b.localeCompare(a))
    .filter(([date]) => !filterMonth || date.startsWith(filterMonth));

  // Available months for filter
  const months = [...new Set(mealLog.map(m => m.date.slice(0, 7)))].sort((a, b) => b.localeCompare(a));

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (dateStr === today.toISOString().slice(0, 10)) return 'Today';
    if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const dayTotals = (meals: typeof mealLog) =>
    meals.reduce((acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      saturatedFat: acc.saturatedFat + (m.saturatedFat ?? 0),
      sugar: acc.sugar + (m.sugar ?? 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, saturatedFat: 0, sugar: 0 });

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="bg-ql-surface rounded-t-3xl flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-ql-surface3" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ql shrink-0">
          <div>
            <h3 className="text-ql text-sm font-semibold">Meal History</h3>
            <p className="text-ql-3 text-[10px] mt-0.5">{mealLog.length} meals logged total</p>
          </div>
          <button onClick={onClose} className="text-ql-3 text-sm px-2">✕</button>
        </div>

        {/* Month filter */}
        {months.length > 1 && (
          <div className="flex gap-2 px-4 py-2.5 overflow-x-auto shrink-0 border-b border-ql">
            <button
              onClick={() => setFilterMonth('')}
              className={`shrink-0 px-3 py-1 rounded-xl text-xs font-medium transition-colors ${!filterMonth ? 'bg-ql-accent text-white' : 'bg-ql-surface2 border border-ql text-ql-3'}`}
            >
              All
            </button>
            {months.map(m => {
              const label = new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
              return (
                <button
                  key={m}
                  onClick={() => setFilterMonth(filterMonth === m ? '' : m)}
                  className={`shrink-0 px-3 py-1 rounded-xl text-xs font-medium transition-colors ${filterMonth === m ? 'bg-ql-accent text-white' : 'bg-ql-surface2 border border-ql text-ql-3'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-3 pb-6">
          {grouped.length === 0 && (
            <div className="text-center py-8">
              <p className="text-ql-3 text-sm">No meals logged yet</p>
            </div>
          )}

          {grouped.map(([date, meals]) => {
            const totals = dayTotals(meals);
            const hitGoal = totals.calories >= nutritionGoal.calories * 0.9;
            const isExpanded = expandedDates.has(date);

            return (
              <div key={date} className="bg-ql-surface2 rounded-2xl border border-ql overflow-hidden">
                {/* Day header — tappable to expand */}
                <button
                  onClick={() => toggleDate(date)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  {/* Calorie status dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${hitGoal ? 'bg-emerald-500' : 'bg-amber-400'}`} />

                  <div className="flex-1 min-w-0">
                    <p className="text-ql text-sm font-semibold">{formatDate(date)}</p>
                    <p className="text-ql-3 text-[10px] tabular-nums mt-0.5">
                      {totals.calories} kcal · {meals.length} meal{meals.length !== 1 ? 's' : ''}
                      {' · '}P {totals.protein}g · C {totals.carbs}g · F {totals.fat}g
                      {totals.saturatedFat > 0 ? ` (Sat ${totals.saturatedFat}g)` : ''}
                      {totals.sugar > 0 ? ` · S ${totals.sugar}g` : ''}
                    </p>
                  </div>

                  {/* Calorie bar */}
                  <div className="w-16 shrink-0">
                    <div className="h-1.5 bg-ql-surface3 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (totals.calories / nutritionGoal.calories) * 100)}%`,
                          backgroundColor: hitGoal ? '#22c55e' : '#f59e0b',
                        }}
                      />
                    </div>
                    <p className="text-ql-3 text-[9px] tabular-nums text-right mt-0.5">
                      {Math.round((totals.calories / nutritionGoal.calories) * 100)}%
                    </p>
                  </div>

                  <span className="text-ql-3 text-xs shrink-0">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {/* Expanded meal list */}
                {isExpanded && (
                  <div className="border-t border-ql">
                    {meals.map((meal, i) => (
                      <div
                        key={meal.id}
                        className={`flex items-center gap-3 px-4 py-3 ${i < meals.length - 1 ? 'border-b border-ql' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-ql text-sm font-medium">{meal.name}</p>
                          <p className="text-ql-3 text-[10px] mt-0.5 tabular-nums">
                            {meal.calories} kcal · P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g
                            {(meal.saturatedFat ?? 0) > 0 ? ` (Sat ${meal.saturatedFat}g)` : ''}
                            {(meal.sugar ?? 0) > 0 ? ` · S ${meal.sugar}g` : ''}
                            {meal.micros && <span className="text-ql-accent"> · 🧬</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => onDelete(meal.id)}
                          className="text-ql-3 hover:text-red-500 text-sm transition-colors shrink-0 px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Day macro summary bar */}
                    <div className="px-4 py-3 bg-ql-surface border-t border-ql grid grid-cols-5 gap-1.5">
                      {[
                        { label: 'Cal',   val: totals.calories, target: nutritionGoal.calories,    overIsGood: false },
                        { label: 'P',     val: totals.protein,  target: nutritionGoal.protein,     overIsGood: true  },
                        { label: 'C',     val: totals.carbs,    target: nutritionGoal.carbs,        overIsGood: false },
                        { label: 'F',     val: totals.fat,      target: nutritionGoal.fat,          overIsGood: false },
                        { label: 'Sugar', val: totals.sugar,    target: nutritionGoal.sugar ?? 50,  overIsGood: false },
                      ].map(({ label, val, target, overIsGood }) => {
                        const ratio = target > 0 ? val / target : 0;
                        const pct   = Math.min(100, ratio * 100);
                        const over  = ratio > 1.05;
                        const warn  = over && !overIsGood;
                        const barBg = warn ? '#ef4444' : over && overIsGood ? '#22c55e' : pct >= 90 ? '#22c55e' : '#f59e0b';
                        return (
                          <div key={label} className="flex flex-col items-center gap-0.5">
                            <span className={`text-[9px] ${warn ? 'text-red-400' : 'text-ql-3'}`}>
                              {label}{warn ? '⚠️' : ''}
                            </span>
                            <span className={`text-xs font-bold tabular-nums ${warn ? 'text-red-400' : 'text-ql'}`}>{val}</span>
                            <div className="w-full h-1 bg-ql-surface3 rounded-full mt-0.5 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barBg }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Micronutrient definitions ─────────────────────────────────────────────────
interface MicroDef {
  key: keyof Micros;
  label: string;
  unit: string;
  rda: number;
  group: 'Vitamins' | 'Minerals';
  emoji: string;
}

const MICRO_DEFS: MicroDef[] = [
  { key: 'vitA',      label: 'Vitamin A',   unit: 'µg', rda: 700,  group: 'Vitamins',  emoji: '🟠' },
  { key: 'vitC',      label: 'Vitamin C',   unit: 'mg', rda: 80,   group: 'Vitamins',  emoji: '🟡' },
  { key: 'vitD',      label: 'Vitamin D',   unit: 'µg', rda: 15,   group: 'Vitamins',  emoji: '☀️' },
  { key: 'vitE',      label: 'Vitamin E',   unit: 'mg', rda: 15,   group: 'Vitamins',  emoji: '🌿' },
  { key: 'vitK',      label: 'Vitamin K',   unit: 'µg', rda: 75,   group: 'Vitamins',  emoji: '🟢' },
  { key: 'vitB6',     label: 'Vitamin B6',  unit: 'mg', rda: 1.4,  group: 'Vitamins',  emoji: '🔵' },
  { key: 'vitB12',    label: 'Vitamin B12', unit: 'µg', rda: 2.4,  group: 'Vitamins',  emoji: '🔴' },
  { key: 'folate',    label: 'Folate',      unit: 'µg', rda: 200,  group: 'Vitamins',  emoji: '🌸' },
  { key: 'calcium',   label: 'Calcium',     unit: 'mg', rda: 800,  group: 'Minerals',  emoji: '🦷' },
  { key: 'iron',      label: 'Iron',        unit: 'mg', rda: 14,   group: 'Minerals',  emoji: '⚙️' },
  { key: 'magnesium', label: 'Magnesium',   unit: 'mg', rda: 375,  group: 'Minerals',  emoji: '💎' },
  { key: 'zinc',      label: 'Zinc',        unit: 'mg', rda: 10,   group: 'Minerals',  emoji: '🔩' },
  { key: 'potassium', label: 'Potassium',   unit: 'mg', rda: 2000, group: 'Minerals',  emoji: '🍌' },
  { key: 'sodium',    label: 'Sodium',      unit: 'mg', rda: 2300, group: 'Minerals',  emoji: '🧂' },
];

// ─── Vitamins & Minerals section ───────────────────────────────────────────────
function VitaminsMineralsSection({ totals }: { totals: Micros }) {
  const [expanded, setExpanded] = useState(false);

  const filled = MICRO_DEFS.filter(d => (totals[d.key] ?? 0) > 0);
  const overallPct = filled.length === 0 ? 0 : Math.round(
    filled.reduce((sum, d) => sum + Math.min(100, ((totals[d.key] ?? 0) / d.rda) * 100), 0) / MICRO_DEFS.length
  );
  const trackedCount = filled.length;

  const vitamins  = MICRO_DEFS.filter(d => d.group === 'Vitamins');
  const minerals  = MICRO_DEFS.filter(d => d.group === 'Minerals');

  return (
    <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql overflow-hidden">
      {/* Header row — tappable */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left"
      >
        <span className="text-lg">🧬</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-ql text-sm font-semibold">Vitamins &amp; Minerals</span>
            <span className="text-ql-3 text-xs tabular-nums">{overallPct}%</span>
          </div>
          {/* Overall bar */}
          <div className="h-2 bg-ql-surface3 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${overallPct}%`,
                background: overallPct >= 75 ? '#22c55e' : overallPct >= 40 ? '#f59e0b' : '#6366f1',
              }}
            />
          </div>
          <p className="text-ql-3 text-[10px] mt-1">
            {trackedCount === 0
              ? 'Log food with AI to track vitamins & minerals'
              : `${trackedCount} of ${MICRO_DEFS.length} nutrients tracked today`}
          </p>
        </div>
        <span className="text-ql-3 text-sm ml-1 shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-ql px-4 pb-4 pt-3 flex flex-col gap-4">
          {(['Vitamins', 'Minerals'] as const).map(group => (
            <div key={group}>
              <p className="text-ql-3 text-xs font-semibold uppercase tracking-wider mb-2">{group}</p>
              <div className="flex flex-col gap-2.5">
                {(group === 'Vitamins' ? vitamins : minerals).map(def => {
                  const val = totals[def.key] ?? 0;
                  const pct = Math.min(100, (val / def.rda) * 100);
                  const met = pct >= 90;
                  return (
                    <div key={def.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-ql-3 text-xs flex items-center gap-1">
                          <span>{def.emoji}</span> {def.label}
                        </span>
                        <span className={`text-xs tabular-nums font-medium ${met ? 'text-emerald-400' : 'text-ql'}`}>
                          {val > 0 ? `${val % 1 === 0 ? val : val.toFixed(1)}${def.unit}` : '–'} / {def.rda}{def.unit}
                          {met && ' ✓'}
                        </span>
                      </div>
                      <div className="h-1.5 bg-ql-surface3 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: met ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#6366f1',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Meal Detail Sheet ─────────────────────────────────────────────────────────
function MealDetailSheet({
  meal,
  onClose,
  onLog,
  onDelete,
}: {
  meal: import('@/types').SavedMealItem;
  onClose: () => void;
  onLog: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="bg-ql-surface rounded-t-3xl flex flex-col"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-ql-surface3" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 border-b border-ql shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-ql text-base font-semibold leading-snug">{meal.name}</h3>
            <p className="text-ql-3 text-[10px] mt-0.5 tabular-nums">
              {meal.calories} kcal · {meal.protein}g P · {meal.carbs}g C · {meal.fat}g F
              {(meal.saturatedFat ?? 0) > 0 ? ` (Sat ${meal.saturatedFat}g)` : ''}
              {meal.sugar > 0 ? ` · ${meal.sugar}g S` : ''}
              {meal.micros && <span className="text-ql-accent ml-1">🧬</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-ql-3 text-sm px-1 mt-0.5 shrink-0">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5 pb-6">

          {/* Macro tiles */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Calories', val: meal.calories, unit: 'kcal', color: 'text-amber-400' },
              { label: 'Protein',  val: meal.protein,  unit: 'g',    color: 'text-blue-400'  },
              { label: 'Carbs',    val: meal.carbs,    unit: 'g',    color: 'text-orange-400'},
              { label: 'Fat',      val: meal.fat,      unit: 'g',    color: 'text-emerald-400'},
            ].map(({ label, val, unit, color }) => (
              <div key={label} className="bg-ql-surface2 rounded-2xl border border-ql p-2.5 text-center">
                <p className={`text-sm font-bold tabular-nums ${color}`}>{val}</p>
                <p className="text-ql-3 text-[9px]">{unit}</p>
                <p className="text-ql-3 text-[9px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {((meal.saturatedFat ?? 0) > 0 || (meal.unsaturatedFat ?? 0) > 0 || meal.sugar > 0) && (
            <div className="flex gap-3 -mt-3 flex-wrap">
              {(meal.saturatedFat ?? 0) > 0 && <p className="text-ql-3 text-[10px] tabular-nums">Saturated fat: {meal.saturatedFat}g</p>}
              {(meal.unsaturatedFat ?? 0) > 0 && <p className="text-ql-3 text-[10px] tabular-nums">Unsaturated fat: {meal.unsaturatedFat}g</p>}
              {meal.sugar > 0 && <p className="text-ql-3 text-[10px] tabular-nums">Sugar: {meal.sugar}g</p>}
            </div>
          )}

          {/* Ingredients */}
          {meal.ingredients ? (
            <div>
              <p className="text-ql-3 text-xs font-semibold uppercase tracking-wider mb-2">Ingredients</p>
              <div className="bg-ql-surface2 rounded-2xl border border-ql px-4 py-3">
                <p className="text-ql text-sm leading-relaxed whitespace-pre-wrap">{meal.ingredients}</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-ql-3 text-xs font-semibold uppercase tracking-wider mb-2">Ingredients</p>
              <p className="text-ql-3 text-xs italic">No ingredients saved for this meal.</p>
            </div>
          )}

          {/* Recipe */}
          {meal.recipe ? (
            <div>
              <p className="text-ql-3 text-xs font-semibold uppercase tracking-wider mb-2">Recipe</p>
              <div className="bg-ql-surface2 rounded-2xl border border-ql px-4 py-3">
                <p className="text-ql text-sm leading-relaxed whitespace-pre-wrap">{meal.recipe}</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-ql-3 text-xs font-semibold uppercase tracking-wider mb-2">Recipe</p>
              <p className="text-ql-3 text-xs italic">No recipe saved for this meal.</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-6 pt-3 border-t border-ql flex gap-3 shrink-0">
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="px-4 py-3 bg-ql-surface2 border border-ql text-red-400 text-sm font-semibold rounded-2xl"
          >
            Remove
          </button>
          <button
            onClick={() => { onLog(); onClose(); }}
            className="flex-1 py-3 bg-ql-accent text-white text-sm font-semibold rounded-2xl"
          >
            Log Meal
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Saved Meals Sheet ─────────────────────────────────────────────────────────
const MEAL_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Bulk Cook', 'Other'] as const;

interface AiMealRaw { name: string; category: string; calories: number; protein: number; carbs: number; fat: number; saturatedFat?: number; unsaturatedFat?: number; sugar?: number; ingredients?: string; recipe?: string; micros?: Micros; }

const EMPTY_RECIPE = { name: '', category: 'Dinner', ingredients: '', method: '', calories: '', protein: '', carbs: '', fat: '', saturatedFat: '', unsaturatedFat: '', sugar: '' };

function SavedMealsSheet({ onClose }: { onClose: () => void }) {
  const { savedMealLibrary, addToMealLibrary, removeFromMealLibrary, logMeal, nutritionGoal } = useGameStore();

  const [activeTab,    setActiveTab]    = useState<'library' | 'ai' | 'create'>('library');
  const [activeFilter, setActiveFilter] = useState('All');
  const [search,       setSearch]       = useState('');
  const [loggedToday,  setLoggedToday]  = useState<Set<string>>(new Set());
  const [selectedMeal, setSelectedMeal] = useState<import('@/types').SavedMealItem | null>(null);

  // AI suggestions state
  const [aiPrompt,   setAiPrompt]   = useState('');
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiMeals,    setAiMeals]    = useState<AiMealRaw[] | null>(null);
  const [aiError,    setAiError]    = useState<string | null>(null);
  const [savedToLib,     setSavedToLib]     = useState<Set<number>>(new Set());
  const [expandedAiMeals, setExpandedAiMeals] = useState<Set<number>>(new Set());
  const toggleAiExpand = (idx: number) => setExpandedAiMeals(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });

  // Create recipe state
  const [recipe,         setRecipe]         = useState<typeof EMPTY_RECIPE>(EMPTY_RECIPE);
  const [recipeLoading,  setRecipeLoading]  = useState(false);
  const [recipeAiError,  setRecipeAiError]  = useState<string | null>(null);
  const [recipeSaved,    setRecipeSaved]    = useState(false);

  const upRecipe = (k: keyof typeof EMPTY_RECIPE, v: string) => {
    setRecipe(r => ({ ...r, [k]: v }));
    setRecipeSaved(false);
  };

  const recipeValid = recipe.name.trim().length > 0 && parseInt(recipe.calories) > 0;

  const estimateRecipeWithAI = async () => {
    const desc = recipe.ingredients.trim() || recipe.name.trim();
    if (!desc || recipeLoading) return;
    setRecipeLoading(true);
    setRecipeAiError(null);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'analyze_food', context: { foodDescription: desc } }),
      });
      const data = await res.json();
      if (data.food) {
        setRecipe(r => ({
          ...r,
          calories:       String(data.food.calories      ?? ''),
          protein:        String(data.food.protein       ?? ''),
          carbs:          String(data.food.carbs         ?? ''),
          fat:            String(data.food.fat           ?? ''),
          saturatedFat:   String(data.food.saturatedFat  ?? ''),
          unsaturatedFat: String(data.food.unsaturatedFat ?? ''),
          sugar:          String(data.food.sugar         ?? ''),
        }));
      } else {
        setRecipeAiError(data.error ?? 'Could not estimate — try adding more detail');
      }
    } catch {
      setRecipeAiError('Connection error — check your API key');
    } finally {
      setRecipeLoading(false);
    }
  };

  const saveRecipe = () => {
    if (!recipeValid) return;
    addToMealLibrary({
      name:           recipe.name.trim(),
      category:       recipe.category,
      calories:       parseInt(recipe.calories) || 0,
      protein:        parseInt(recipe.protein)  || 0,
      carbs:          parseInt(recipe.carbs)    || 0,
      fat:            parseInt(recipe.fat)      || 0,
      ...(recipe.saturatedFat   ? { saturatedFat:   parseInt(recipe.saturatedFat)   } : {}),
      ...(recipe.unsaturatedFat ? { unsaturatedFat: parseInt(recipe.unsaturatedFat) } : {}),
      sugar:          parseInt(recipe.sugar)    || 0,
      ingredients:    recipe.ingredients.trim() || undefined,
      recipe:         recipe.method.trim()      || undefined,
    });
    setRecipeSaved(true);
    setRecipe(EMPTY_RECIPE);
  };

  // Dynamic filter pills: standard categories + any custom ones from library
  const customCategories = [...new Set(savedMealLibrary.map(m => m.category))]
    .filter(c => !MEAL_CATEGORIES.includes(c as typeof MEAL_CATEGORIES[number]));
  const allFilters = ['All', ...MEAL_CATEGORIES, ...customCategories];

  const filteredLib = savedMealLibrary.filter(m => {
    const matchesFilter = activeFilter === 'All' || m.category === activeFilter;
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Categories that have meals in filtered view
  const visibleCategories = activeFilter === 'All'
    ? [...new Set(filteredLib.map(m => m.category))]
    : [activeFilter];

  const logLibraryMeal = (meal: import('@/types').SavedMealItem) => {
    logMeal({ name: meal.name, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, sugar: meal.sugar, micros: meal.micros });
    setLoggedToday(prev => new Set([...prev, meal.id]));
  };

  const getSuggestions = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setAiMeals(null);
    setSavedToLib(new Set());
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'suggest_meals', context: { nutritionGoal, prompt: aiPrompt } }),
      });
      const data = await res.json();
      if (data.mealPlan?.meals) setAiMeals(data.mealPlan.meals);
      else setAiError(data.error ?? 'Could not get suggestions');
    } catch {
      setAiError('Connection error — check your API key');
    } finally {
      setAiLoading(false);
    }
  };

  const saveAiToLibrary = (meal: AiMealRaw, idx: number) => {
    addToMealLibrary({ ...meal, sugar: meal.sugar ?? 0, ingredients: meal.ingredients, recipe: meal.recipe });
    setSavedToLib(prev => new Set([...prev, idx]));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div className="bg-ql-surface rounded-t-3xl flex flex-col" style={{ maxHeight: '93vh' }} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-ql-surface3" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ql shrink-0">
          <div>
            <h3 className="text-ql text-sm font-semibold">Saved Meals</h3>
            <p className="text-ql-3 text-[10px] mt-0.5">{savedMealLibrary.length} meals in your library</p>
          </div>
          <button onClick={onClose} className="text-ql-3 text-sm px-2">✕</button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-ql shrink-0">
          {([
            { id: 'library', label: '📚 Library' },
            { id: 'ai',      label: '✨ Suggest' },
            { id: 'create',  label: '✏️ Create'  },
          ] as const).map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                activeTab === id ? 'text-ql-accent border-b-2 border-ql-accent' : 'text-ql-3'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Library tab ── */}
        {activeTab === 'library' && (
          <>
            {/* Search */}
            <div className="px-4 pt-3 pb-1 shrink-0">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search meals…"
                className="w-full bg-ql-surface2 border border-ql rounded-2xl px-4 py-2.5 text-sm text-ql outline-none focus:border-ql-accent placeholder:text-ql-3"
              />
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 px-4 py-2.5 overflow-x-auto shrink-0 no-scrollbar">
              {allFilters.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    activeFilter === f
                      ? 'bg-ql-accent border-ql-accent text-white'
                      : 'bg-ql-surface2 border-ql text-ql-3'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Meal list */}
            <div className="overflow-y-auto flex-1 px-4 pb-8 flex flex-col gap-4">
              {filteredLib.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <p className="text-4xl">🍽️</p>
                  <p className="text-ql text-sm font-medium">
                    {savedMealLibrary.length === 0 ? 'Your library is empty' : 'No meals match this filter'}
                  </p>
                  <p className="text-ql-3 text-xs text-center">Use AI Suggestions to discover meals and save them here.</p>
                  <button onClick={() => setActiveTab('ai')}
                    className="mt-1 px-5 py-2.5 bg-ql-accent text-white text-sm font-semibold rounded-2xl">
                    ✨ Get Suggestions
                  </button>
                </div>
              ) : (
                visibleCategories.map(cat => {
                  const items = filteredLib.filter(m => m.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-ql-3 text-xs font-semibold uppercase tracking-wider">{cat}</p>
                        <button
                          onClick={() => {
                            if (activeFilter === cat) setActiveFilter('All');
                            else setActiveFilter(cat);
                          }}
                          className="text-ql-3 text-[10px] border border-ql rounded-lg px-2 py-0.5"
                        >
                          {activeFilter === cat ? 'Show all' : `Filter`}
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {items.map(meal => {
                          const justLogged = loggedToday.has(meal.id);
                          return (
                            <div
                              key={meal.id}
                              className="bg-ql-surface2 rounded-2xl border border-ql px-4 py-3 flex items-center gap-3"
                            >
                              <div
                                className="flex-1 min-w-0 cursor-pointer active:opacity-70 transition-opacity"
                                onClick={() => setSelectedMeal(meal)}
                              >
                                <p className="text-ql text-sm font-medium leading-snug">{meal.name}</p>
                                <p className="text-ql-3 text-[10px] tabular-nums mt-0.5">
                                  {meal.calories} kcal · {meal.protein}g P · {meal.carbs}g C · {meal.fat}g F
                                  {meal.sugar > 0 ? ` · ${meal.sugar}g S` : ''}
                                  {meal.micros && <span className="text-ql-accent ml-1">🧬</span>}
                                  {(meal.ingredients || meal.recipe) && <span className="text-ql-3 ml-1">· 📋</span>}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {justLogged
                                  ? <span className="text-emerald-400 text-xs font-medium">✓</span>
                                  : <button onClick={() => logLibraryMeal(meal)}
                                      className="px-3 py-1.5 bg-ql-accent text-white text-xs font-semibold rounded-xl">Log</button>
                                }
                                <button
                                  onClick={() => removeFromMealLibrary(meal.id)}
                                  className="px-2.5 py-1.5 text-red-400 text-xs font-semibold border border-red-500/30 rounded-xl bg-red-500/10 active:bg-red-500/20 transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ── AI Suggestions tab ── */}
        {activeTab === 'ai' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Prompt input */}
            <div className="px-4 pt-3 pb-3 shrink-0 border-b border-ql">
              <p className="text-ql-3 text-xs mb-2">Describe what you&apos;re looking for</p>
              <div className="flex gap-2">
                <input
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && getSuggestions()}
                  placeholder="e.g. high protein dinner, quick vegan lunch…"
                  className="flex-1 bg-ql-surface2 border border-ql rounded-2xl px-4 py-2.5 text-sm text-ql outline-none focus:border-ql-accent placeholder:text-ql-3"
                />
                <button
                  onClick={getSuggestions}
                  disabled={!aiPrompt.trim() || aiLoading}
                  className="px-4 py-2.5 bg-ql-accent disabled:opacity-40 text-white text-sm font-semibold rounded-2xl shrink-0 flex items-center gap-1"
                >
                  {aiLoading ? <span className="animate-spin text-base">⚙️</span> : '✨'}
                </button>
              </div>
              {/* Quick prompt chips */}
              <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
                {['High protein', 'Quick & easy', 'Low carb', 'Vegan', 'Bulk cook', 'Snack ideas'].map(chip => (
                  <button key={chip} onClick={() => setAiPrompt(chip)}
                    className="shrink-0 px-3 py-1 bg-ql-surface2 border border-ql rounded-full text-ql-3 text-[10px] font-medium">
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {aiError && (
              <div className="mx-4 mt-3 shrink-0 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-2.5 flex items-center justify-between">
                <p className="text-red-400 text-xs">{aiError}</p>
                <button onClick={() => setAiError(null)} className="text-red-400 text-xs ml-3">✕</button>
              </div>
            )}

            {/* Results */}
            <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-4 pb-8">
              {!aiMeals && !aiLoading && (
                <div className="flex flex-col items-center py-12 gap-3 text-center">
                  <p className="text-4xl">✨</p>
                  <p className="text-ql text-sm font-medium">Ask for anything</p>
                  <p className="text-ql-3 text-xs">Type what you&apos;re craving or need, then tap the button. Save suggestions to your library to reuse them.</p>
                </div>
              )}
              {aiLoading && (
                <div className="flex flex-col items-center py-12 gap-3">
                  <span className="text-3xl animate-spin">⚙️</span>
                  <p className="text-ql-3 text-sm">Getting suggestions…</p>
                </div>
              )}
              {aiMeals && (
                <>
                  <p className="text-ql-3 text-xs">
                    {aiMeals.length} suggestion{aiMeals.length !== 1 ? 's' : ''} · tap a meal to see full recipe · <span className="text-ql font-medium">Save</span> to add to library
                  </p>
                  {/* Render all meals grouped by category */}
                  {[...new Set(aiMeals.map(m => m.category))].map(cat => {
                    const items = aiMeals.map((m, i) => ({ meal: m, idx: i })).filter(({ meal }) => meal.category === cat);
                    if (items.length === 0) return null;
                    return (
                      <div key={cat}>
                        <p className="text-ql-3 text-xs font-semibold uppercase tracking-wider mb-2">{cat}</p>
                        <div className="flex flex-col gap-2">
                          {items.map(({ meal, idx }) => {
                            const inLib      = savedToLib.has(idx);
                            const isExpanded = expandedAiMeals.has(idx);
                            const hasDetail  = !!(meal.ingredients || meal.recipe);
                            return (
                              <div key={idx} className="bg-ql-surface2 rounded-2xl border border-ql overflow-hidden">
                                {/* Main row */}
                                <div className="px-4 py-3 flex items-center gap-3">
                                  <div
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => hasDetail && toggleAiExpand(idx)}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-ql text-sm font-medium leading-snug">{meal.name}</p>
                                      {hasDetail && (
                                        <span className="text-ql-3 text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                                      )}
                                    </div>
                                    <p className="text-ql-3 text-[10px] tabular-nums mt-0.5">
                                      {meal.calories} kcal · {meal.protein}g P · {meal.carbs}g C · {meal.fat}g F
                                      {(meal.sugar ?? 0) > 0 ? ` · ${meal.sugar}g S` : ''}
                                    </p>
                                  </div>
                                  <div className="shrink-0">
                                    {inLib
                                      ? <span className="text-ql-accent text-xs font-medium">✓ Saved</span>
                                      : <button onClick={() => saveAiToLibrary(meal, idx)}
                                          className="px-3 py-1.5 bg-ql-accent text-white text-xs font-semibold rounded-xl">Save</button>
                                    }
                                  </div>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && hasDetail && (
                                  <div className="border-t border-ql px-4 py-3 flex flex-col gap-3">
                                    {meal.ingredients && (
                                      <div>
                                        <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Ingredients</p>
                                        <p className="text-ql text-xs leading-relaxed whitespace-pre-wrap">{meal.ingredients}</p>
                                      </div>
                                    )}
                                    {meal.recipe && (
                                      <div>
                                        <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Recipe</p>
                                        <p className="text-ql text-xs leading-relaxed whitespace-pre-wrap">{meal.recipe}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Create Recipe tab ── */}
        {activeTab === 'create' && (
          <div className="overflow-y-auto flex-1 px-4 py-4 flex flex-col gap-4 pb-10">

            {/* Success banner */}
            {recipeSaved && (
              <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="text-emerald-400 text-base">✓</span>
                <p className="text-emerald-400 text-sm font-medium">Recipe saved to your library!</p>
              </div>
            )}

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <p className="text-ql-3 text-xs font-semibold uppercase tracking-wider">Recipe name</p>
              <input
                value={recipe.name}
                onChange={e => upRecipe('name', e.target.value)}
                placeholder="e.g. Homemade Chicken Curry"
                className="w-full bg-ql-surface2 border border-ql rounded-2xl px-4 py-3 text-ql text-sm font-medium outline-none focus:border-ql-accent placeholder:text-ql-3"
              />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <p className="text-ql-3 text-xs font-semibold uppercase tracking-wider">Category</p>
              <div className="flex flex-wrap gap-2">
                {(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Bulk Cook'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => upRecipe('category', cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      recipe.category === cat
                        ? 'bg-ql-accent border-ql-accent text-white'
                        : 'bg-ql-surface2 border-ql text-ql-3'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Macros */}
            <div className="flex flex-col gap-1.5">
              <p className="text-ql-3 text-xs font-semibold uppercase tracking-wider">Nutrition (per serving)</p>
              <div className="bg-ql-surface2 rounded-2xl border border-ql overflow-hidden divide-y divide-ql">
                {([
                  { key: 'calories',       label: 'Calories',        unit: 'kcal' },
                  { key: 'protein',        label: 'Protein',         unit: 'g'    },
                  { key: 'carbs',          label: 'Carbs',           unit: 'g'    },
                  { key: 'fat',            label: 'Fat (total)',      unit: 'g'    },
                  { key: 'saturatedFat',   label: 'Saturated Fat',   unit: 'g'    },
                  { key: 'unsaturatedFat', label: 'Unsaturated Fat', unit: 'g'    },
                  { key: 'sugar',          label: 'Sugar',           unit: 'g'    },
                ] as const).map(({ key, label, unit }) => (
                  <div key={key} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-ql text-sm flex-1">{label}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={recipe[key]}
                      onChange={e => upRecipe(key, e.target.value)}
                      placeholder="0"
                      className="w-24 bg-ql-input border border-ql rounded-xl px-3 py-1.5 text-sm text-ql outline-none focus:border-ql-accent text-right"
                    />
                    <span className="text-ql-3 text-xs w-8">{unit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ingredients */}
            <div className="flex flex-col gap-1.5">
              <p className="text-ql-3 text-xs font-semibold uppercase tracking-wider">Ingredients</p>
              <textarea
                value={recipe.ingredients}
                onChange={e => upRecipe('ingredients', e.target.value)}
                placeholder="e.g. 200g chicken breast, 150g basmati rice, coconut milk, onion, garlic, curry powder, olive oil…"
                rows={4}
                className="w-full bg-ql-surface2 border border-ql rounded-2xl px-4 py-3 text-sm text-ql outline-none focus:border-ql-accent resize-none placeholder:text-ql-3"
              />
            </div>

            {/* Method */}
            <div className="flex flex-col gap-1.5">
              <p className="text-ql-3 text-xs font-semibold uppercase tracking-wider">Full Recipe</p>
              <textarea
                value={recipe.method}
                onChange={e => upRecipe('method', e.target.value)}
                placeholder="1. Dice the chicken and season…&#10;2. Heat oil in a pan…"
                rows={5}
                className="w-full bg-ql-surface2 border border-ql rounded-2xl px-4 py-3 text-sm text-ql outline-none focus:border-ql-accent resize-none placeholder:text-ql-3"
              />
            </div>

            {/* AI estimate section */}
            <div className="bg-ql-surface2 border border-ql rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base">✨</span>
                <p className="text-ql text-sm font-semibold">Don&apos;t know the numbers?</p>
              </div>
              <p className="text-ql-3 text-xs">Fill in your ingredients above, then tap below — AI will estimate macros from them.</p>
              {recipeAiError && (
                <p className="text-red-400 text-xs">{recipeAiError}</p>
              )}
              <button
                onClick={estimateRecipeWithAI}
                disabled={(!recipe.ingredients.trim() && !recipe.name.trim()) || recipeLoading}
                className="w-full py-2.5 bg-ql-surface border border-ql-accent/50 text-ql-accent text-sm font-semibold rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                {recipeLoading
                  ? <><span className="animate-spin text-base">⚙️</span> Estimating…</>
                  : <><span>✨</span> Ask AI to estimate macros</>
                }
              </button>
            </div>

            {/* Save button */}
            <button
              onClick={saveRecipe}
              disabled={!recipeValid}
              className="w-full py-3.5 bg-ql-accent disabled:opacity-40 text-white text-sm font-semibold rounded-2xl active:scale-[0.98] transition-transform"
            >
              Save to Library
            </button>

            <div className="h-2" />
          </div>
        )}
      </div>

      {/* Meal detail sheet */}
      {selectedMeal && (
        <MealDetailSheet
          meal={selectedMeal}
          onClose={() => setSelectedMeal(null)}
          onLog={() => { logLibraryMeal(selectedMeal); setSelectedMeal(null); }}
          onDelete={() => { removeFromMealLibrary(selectedMeal.id); setSelectedMeal(null); }}
        />
      )}
    </div>
  );
}

// ─── Photo Food Sheet ─────────────────────────────────────────────────────────
function PhotoFoodSheet({ onClose, onLogged }: { onClose: () => void; onLogged: () => void }) {
  const { logMeal } = useGameStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageDataUrl, setImageDataUrl]     = useState<string | null>(null);
  const [imageBase64,  setImageBase64]      = useState<string | null>(null);
  const [mimeType,     setMimeType]         = useState('image/jpeg');
  const [loading,      setLoading]          = useState(false);
  const [preview,      setPreview]          = useState<AnalyzedFood | null>(null);
  const [error,        setError]            = useState<string | null>(null);

  const handleFile = (file: File) => {
    setPreview(null);
    setError(null);
    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setImageDataUrl(dataUrl);
      // Strip "data:image/...;base64," prefix to get raw base64
      const base64 = dataUrl.split(',')[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!imageBase64 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'analyze_food_image', context: { imageBase64, mimeType } }),
      });
      const data = await res.json();
      if (data.food) {
        setPreview(data.food);
      } else {
        setError(data.error ?? 'Could not analyse the photo — try a clearer image');
      }
    } catch {
      setError('Connection lost — check your API key');
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    if (!preview) return;
    logMeal(preview);
    onLogged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div className="bg-ql-surface rounded-t-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-ql-surface3" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ql shrink-0">
          <div>
            <h3 className="text-ql text-sm font-semibold">📷 Photo Food Log</h3>
            <p className="text-ql-3 text-[10px] mt-0.5">Take a photo and AI will analyse all macros &amp; vitamins</p>
          </div>
          <button onClick={onClose} className="text-ql-3 text-sm px-2">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4 pb-8">

          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {/* Camera / Gallery buttons */}
          {!imageDataUrl && (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  if (inputRef.current) {
                    inputRef.current.setAttribute('capture', 'environment');
                    inputRef.current.click();
                  }
                }}
                className="flex items-center justify-center gap-3 w-full py-6 bg-ql-accent/10 border-2 border-dashed border-ql-accent/40 rounded-3xl active:scale-[0.97] transition-transform"
              >
                <span className="text-3xl">📷</span>
                <div className="text-left">
                  <p className="text-ql text-sm font-semibold">Take a Photo</p>
                  <p className="text-ql-3 text-[10px]">Point camera at your meal</p>
                </div>
              </button>
              <button
                onClick={() => {
                  if (inputRef.current) {
                    inputRef.current.removeAttribute('capture');
                    inputRef.current.click();
                  }
                }}
                className="flex items-center justify-center gap-3 w-full py-4 bg-ql-surface2 border border-ql rounded-2xl active:scale-[0.97] transition-transform"
              >
                <span className="text-2xl">🖼️</span>
                <div className="text-left">
                  <p className="text-ql text-sm font-medium">Choose from Gallery</p>
                  <p className="text-ql-3 text-[10px]">Pick an existing photo</p>
                </div>
              </button>
            </div>
          )}

          {/* Image preview + re-take */}
          {imageDataUrl && (
            <div className="flex flex-col gap-3">
              <div className="relative rounded-2xl overflow-hidden border border-ql">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageDataUrl} alt="Food photo" className="w-full max-h-56 object-cover" />
                <button
                  onClick={() => { setImageDataUrl(null); setImageBase64(null); setPreview(null); setError(null); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white text-xs"
                >
                  ✕
                </button>
              </div>

              {!preview && !loading && (
                <button
                  onClick={analyze}
                  className="w-full py-3 bg-ql-accent text-white text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <span>✨</span> Analyse with AI
                </button>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center py-6 gap-3">
              <span className="text-3xl animate-spin">⚙️</span>
              <p className="text-ql-3 text-sm">Analysing your meal…</p>
              <p className="text-ql-3 text-[10px]">Identifying food, estimating macros &amp; vitamins</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 flex items-center justify-between">
              <p className="text-red-400 text-xs">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 text-xs ml-3">✕</button>
            </div>
          )}

          {/* Result preview */}
          {preview && (
            <div className="bg-ql-surface2 rounded-2xl border border-ql-accent/50 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-ql text-sm font-semibold leading-snug">{preview.name}</p>
                <button onClick={() => setPreview(null)} className="text-ql-3 text-sm shrink-0">✕</button>
              </div>

              {/* Macros grid */}
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: 'Cal',   value: preview.calories,   unit: 'kcal' },
                  { label: 'P',     value: preview.protein,    unit: 'g'    },
                  { label: 'C',     value: preview.carbs,      unit: 'g'    },
                  { label: 'F',     value: preview.fat,        unit: 'g'    },
                  { label: 'Sugar', value: preview.sugar ?? 0, unit: 'g'    },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="bg-ql-surface rounded-xl p-2 text-center border border-ql">
                    <div className="text-ql text-xs font-bold tabular-nums">{value}</div>
                    <div className="text-ql-3 text-[9px]">{unit}</div>
                    <div className="text-ql-3 text-[8px] font-medium">{label}</div>
                  </div>
                ))}
              </div>

              {/* Vitamins & minerals preview */}
              {preview.micros && (
                <div>
                  <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wider mb-1.5">🧬 Vitamins &amp; Minerals</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MICRO_DEFS.filter(d => (preview.micros[d.key] ?? 0) > 0).map(def => {
                      const val = preview.micros[def.key] ?? 0;
                      const pct = Math.min(100, Math.round((val / def.rda) * 100));
                      const met = pct >= 90;
                      return (
                        <span key={def.key}
                          className={`text-[10px] rounded-lg px-2 py-1 border ${met ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-ql-surface border-ql text-ql-3'}`}>
                          {def.emoji} {def.label} <span className={`font-medium ${met ? 'text-emerald-400' : 'text-ql'}`}>{pct}%</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={confirm}
                className="w-full py-2.5 bg-ql-accent text-white text-sm font-semibold rounded-xl">
                Log This
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Smart Food Log ────────────────────────────────────────────────────────────
interface AnalyzedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  micros: Micros;
}

function SmartFoodLog({ onLogged }: { onLogged: () => void }) {
  const { logMeal } = useGameStore();
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [preview,  setPreview]  = useState<AnalyzedFood | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const analyze = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setPreview(null);
    setError(null);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'analyze_food', context: { foodDescription: input.trim() } }),
      });
      const data = await res.json();
      if (data.food) {
        setPreview(data.food);
      } else {
        setError(data.error ?? 'Could not analyze food');
      }
    } catch {
      setError('Connection lost — check your API key');
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    if (!preview) return;
    logMeal(preview);
    setInput('');
    setPreview(null);
    onLogged();
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Input row */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && analyze()}
          placeholder="e.g. 2 scrambled eggs on toast..."
          disabled={loading}
          className="flex-1 bg-ql-surface2 rounded-2xl border border-ql focus:border-ql-accent px-4 py-3 text-sm text-ql outline-none transition-colors placeholder:text-ql-3 disabled:opacity-60"
        />
        <button
          onClick={analyze}
          disabled={!input.trim() || loading}
          className="px-4 py-3 bg-ql-accent disabled:opacity-40 text-white text-sm font-semibold rounded-2xl shrink-0 flex items-center gap-1.5"
        >
          {loading ? <span className="animate-spin text-base">⚙️</span> : '⚡'}
          {loading ? '' : 'AI'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-xs px-1">{error}</p>
      )}

      {/* Preview card */}
      {preview && (
        <div className="bg-ql-surface2 rounded-2xl border border-ql-accent/50 p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-ql text-sm font-semibold leading-snug">{preview.name}</p>
            <button onClick={() => setPreview(null)} className="text-ql-3 text-sm shrink-0">✕</button>
          </div>

          {/* Macros row */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Cal',   value: preview.calories,     unit: 'kcal' },
              { label: 'P',     value: preview.protein,      unit: 'g' },
              { label: 'C',     value: preview.carbs,        unit: 'g' },
              { label: 'F',     value: preview.fat,          unit: 'g' },
              { label: 'Sugar', value: preview.sugar ?? 0,   unit: 'g' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="bg-ql-surface rounded-xl p-2 text-center border border-ql">
                <div className="text-ql text-xs font-bold tabular-nums">{value}</div>
                <div className="text-ql-3 text-[9px]">{unit}</div>
                <div className="text-ql-3 text-[8px] font-medium">{label}</div>
              </div>
            ))}
          </div>

          {/* Top micros preview */}
          {preview.micros && (
            <div className="flex flex-wrap gap-1.5">
              {MICRO_DEFS.filter(d => (preview.micros[d.key] ?? 0) > 0).slice(0, 6).map(def => {
                const val = preview.micros[def.key] ?? 0;
                const pct = Math.min(100, Math.round((val / def.rda) * 100));
                return (
                  <span key={def.key} className="text-[10px] bg-ql-surface border border-ql rounded-lg px-2 py-1 text-ql-3">
                    {def.emoji} {def.label} <span className="text-ql font-medium">{pct}%</span>
                  </span>
                );
              })}
            </div>
          )}

          <button
            onClick={confirm}
            className="w-full py-2.5 bg-ql-accent text-white text-sm font-semibold rounded-xl"
          >
            Log This
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main NutritionPlan ────────────────────────────────────────────────────────

// ─── TDEE / nutrition target calculator ───────────────────────────────────────
function calcTargets(
  height: number, weight: number, age: number,
  gender: string, activityLevel: string, goals: string
): NutritionGoal {
  const fem = gender === 'feminine';
  const bmr = fem
    ? 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
    : 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);

  const mult: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  const tdee = Math.round(bmr * (mult[activityLevel] ?? 1.55));

  const loseFat   = goals.toLowerCase().includes('lose') || goals.toLowerCase().includes('fat');
  const buildMus  = goals.toLowerCase().includes('muscle') || goals.toLowerCase().includes('bulk');
  const calories  = loseFat ? tdee - 400 : buildMus ? tdee + 300 : tdee;

  const protein   = Math.round(weight * (buildMus ? 2.2 : loseFat ? 2.0 : 1.6));
  const fat       = Math.round((calories * 0.27) / 9);
  const carbs     = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));

  const sugar = Math.round(calories * 0.05 / 4); // ~5% of calories from free sugars (WHO guideline)
  return { calories, protein, carbs, fat, sugar };
}

export default function NutritionPlan() {
  const {
    nutritionGoal, mealLog, setNutritionGoal, deleteMeal,
    characterAppearance, savedNutritionPrefs, setSavedNutritionPrefs,
  } = useGameStore();
  const [showGoalSheet,  setShowGoalSheet]  = useState(false);
  const [showAddMeal,    setShowAddMeal]    = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestBanner,  setSuggestBanner]  = useState<NutritionGoal | null>(null);
  const [showHistory,    setShowHistory]    = useState(false);
  const [selectedDay,    setSelectedDay]    = useState<string | null>(null);
  const [showSavedMeals, setShowSavedMeals] = useState(false);
  const [showPhotoLog,   setShowPhotoLog]   = useState(false);

  const suggestTargets = () => {
    setSuggestLoading(true);
    // Small timeout so spinner shows, then calc instantly
    setTimeout(() => {
      const { height, startingWeight, age, gender, activityLevel } = characterAppearance;
      const goals = savedNutritionPrefs?.nutritionGoal ?? savedNutritionPrefs?.goal ?? '';
      const suggested = calcTargets(height, startingWeight, age, gender, activityLevel, goals);
      setSuggestBanner(suggested);
      setSuggestLoading(false);
    }, 300);
  };

  const today = todayStr();

  // Today's meals
  const todayMeals = mealLog.filter(m => m.date === today);

  // Today's micronutrient totals
  const microTotals: Micros = todayMeals.reduce((acc, m) => {
    if (!m.micros) return acc;
    const out: Micros = { ...acc };
    (Object.keys(m.micros) as (keyof Micros)[]).forEach(k => {
      out[k] = ((acc[k] ?? 0) + (m.micros![k] ?? 0)) as never;
    });
    return out;
  }, {} as Micros);
  const todayTotals = todayMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      saturatedFat: acc.saturatedFat + (m.saturatedFat ?? 0),
      unsaturatedFat: acc.unsaturatedFat + (m.unsaturatedFat ?? 0),
      sugar: acc.sugar + (m.sugar ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, saturatedFat: 0, unsaturatedFat: 0, sugar: 0 }
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="pt-1 flex items-start justify-between">
        <div>
          <h2 className="text-ql text-xl font-bold">Nutrition</h2>
          <p className="text-ql-3 text-sm">Track meals · fuel your quest</p>
        </div>
        <button
          onClick={() => setShowSavedMeals(true)}
          className="px-3 py-2 bg-ql-surface2 border border-ql hover:border-ql-accent text-ql text-sm font-medium rounded-2xl transition-colors flex items-center gap-1.5 mt-1"
        >
          🍽️ Saved Meals
        </button>
      </div>

      {/* Suggest targets banner */}
      {suggestBanner && (
        <div className="bg-ql-accent/10 border border-ql-accent/40 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-ql text-sm font-semibold">⚡ Suggested Targets</p>
              <p className="text-ql-3 text-[10px] mt-0.5">Based on your height, weight, age & activity level</p>
            </div>
            <button onClick={() => setSuggestBanner(null)} className="text-ql-3 text-sm">✕</button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'Cal',     value: suggestBanner.calories, unit: 'kcal' },
              { label: 'Protein', value: suggestBanner.protein,  unit: 'g' },
              { label: 'Carbs',   value: suggestBanner.carbs,    unit: 'g' },
              { label: 'Fat',     value: suggestBanner.fat,      unit: 'g' },
              { label: 'Sugar',   value: suggestBanner.sugar,    unit: 'g' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="bg-ql-surface rounded-xl p-2 text-center border border-ql">
                <div className="text-ql text-sm font-bold tabular-nums">{value}</div>
                <div className="text-ql-3 text-[10px]">{unit}</div>
                <div className="text-ql-3 text-[9px] font-medium mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setNutritionGoal(suggestBanner); setSuggestBanner(null); }}
            className="w-full py-2.5 bg-ql-accent text-white text-sm font-semibold rounded-xl"
          >
            Apply These Targets
          </button>
        </div>
      )}

      {/* Daily Goals card */}
      <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-ql text-sm font-semibold">Daily Targets</p>
          <div className="flex items-center gap-2">
            <button
              onClick={suggestTargets}
              disabled={suggestLoading}
              className="text-ql-accent text-xs font-medium border border-ql-accent/40 rounded-xl px-3 py-1.5 flex items-center gap-1 disabled:opacity-50"
            >
              {suggestLoading ? <span className="animate-spin">⚙️</span> : '⚡'} Suggest
            </button>
            <button
              onClick={() => setShowGoalSheet(true)}
              className="text-ql-3 text-xs font-medium border border-ql rounded-xl px-3 py-1.5"
            >
              Edit
            </button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { label: 'Cal',     value: nutritionGoal.calories, unit: 'kcal' },
            { label: 'Protein', value: nutritionGoal.protein,  unit: 'g' },
            { label: 'Carbs',   value: nutritionGoal.carbs,    unit: 'g' },
            { label: 'Fat',     value: nutritionGoal.fat,      unit: 'g' },
            { label: 'Sugar',   value: nutritionGoal.sugar ?? 50, unit: 'g' },
          ].map(({ label, value, unit }) => (
            <div key={label} className="bg-ql-surface2 rounded-xl p-2 text-center border border-ql">
              <div className="text-ql text-sm font-bold tabular-nums">{value}</div>
              <div className="text-ql-3 text-[10px]">{unit}</div>
              <div className="text-ql-3 text-[9px] font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's progress */}
      {(() => {
        const isOver = (val: number, target: number) => target > 0 && val / target > 1.05;
        const anyRed = isOver(todayTotals.calories, nutritionGoal.calories)
          || isOver(todayTotals.carbs, nutritionGoal.carbs)
          || isOver(todayTotals.fat, nutritionGoal.fat)
          || isOver(todayTotals.sugar, nutritionGoal.sugar ?? 50);
        const hasData = todayTotals.calories > 0;
        const calHit = nutritionGoal.calories > 0 && todayTotals.calories >= nutritionGoal.calories * 0.9;
        const statusLabel = !hasData ? null : anyRed ? 'Partial' : calHit ? 'Goal Complete' : null;
        return (
          <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-ql text-sm font-semibold">Today&apos;s Progress</p>
              <div className="flex items-center gap-2">
                {statusLabel && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${anyRed ? 'bg-amber-400/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    {statusLabel}
                  </span>
                )}
                <span className="text-ql-3 text-xs tabular-nums">
                  {todayTotals.calories} / {nutritionGoal.calories} kcal
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <MacroBar label="Calories" current={todayTotals.calories} target={nutritionGoal.calories}       color="bg-ql-accent" unit="kcal" />
              <MacroBar label="Protein"  current={todayTotals.protein}  target={nutritionGoal.protein}          color="bg-blue-400"  overIsGood />
              <MacroBar label="Carbs"    current={todayTotals.carbs}    target={nutritionGoal.carbs}            color="bg-amber-400" />
              <MacroBar label="Fat"      current={todayTotals.fat}      target={nutritionGoal.fat}              color="bg-emerald-500" />
              {(todayTotals.saturatedFat > 0 || todayTotals.unsaturatedFat > 0) && (
                <div className="flex gap-3 pl-1">
                  {todayTotals.saturatedFat > 0 && <span className="text-ql-3 text-[10px] tabular-nums">↳ Saturated: {todayTotals.saturatedFat}g</span>}
                  {todayTotals.unsaturatedFat > 0 && <span className="text-ql-3 text-[10px] tabular-nums">Unsaturated: {todayTotals.unsaturatedFat}g</span>}
                </div>
              )}
              <MacroBar label="Sugar"    current={todayTotals.sugar}    target={nutritionGoal.sugar ?? 50}      color="bg-pink-400" />
            </div>
          </div>
        );
      })()}

      {/* Vitamins & Minerals */}
      <VitaminsMineralsSection totals={microTotals} />

      {/* Today's meals */}
      <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-ql text-sm font-semibold">Today&apos;s Meals</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSavedMeals(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ql-surface2 border border-ql text-ql text-xs font-medium rounded-xl"
            >
              From Library
            </button>
            <button
              onClick={() => setShowAddMeal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ql-surface2 border border-ql text-ql text-xs font-medium rounded-xl"
            >
              Manual +
            </button>
          </div>
        </div>

        {/* AI Smart Log hidden — use GAINN AI floating assistant instead */}

        {todayMeals.length === 0 ? (
          <div className="bg-ql-surface2 rounded-2xl border border-dashed border-ql p-4 text-center">
            <p className="text-ql-3 text-sm">No meals logged today</p>
            <p className="text-ql-accent text-xs mt-1 font-medium">Type above to log with AI · track your nutrition</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todayMeals.map(meal => (
              <div key={meal.id} className="bg-ql-surface2 rounded-xl border border-ql px-3 py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-ql text-sm font-medium">{meal.name}</p>
                  <p className="text-ql-3 text-[10px] mt-0.5">
                    {meal.calories} kcal · P: {meal.protein}g · C: {meal.carbs}g · F: {meal.fat}g{(meal.sugar ?? 0) > 0 ? ` · S: ${meal.sugar}g` : ''}
                    {meal.micros && <span className="text-ql-accent"> · 🧬</span>}
                  </p>
                </div>
                <button
                  onClick={() => deleteMeal(meal.id)}
                  className="text-ql-3 hover:text-red-500 text-sm transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nutrition Calendar */}
      <NutritionCalendar
        mealLog={mealLog}
        nutritionGoal={nutritionGoal}
        onDayClick={setSelectedDay}
      />

      {showGoalSheet && (
        <GoalSheet goal={nutritionGoal} onSave={setNutritionGoal} onClose={() => setShowGoalSheet(false)} />
      )}
      {showAddMeal && <AddMealSheet onClose={() => setShowAddMeal(false)} />}
      {showHistory && (
        <NutritionHistorySheet
          mealLog={mealLog}
          nutritionGoal={nutritionGoal}
          onClose={() => setShowHistory(false)}
          onDelete={deleteMeal}
        />
      )}
      {selectedDay && (
        <DayDetailSheet
          date={selectedDay}
          meals={mealLog.filter(m => m.date === selectedDay)}
          nutritionGoal={nutritionGoal}
          onClose={() => setSelectedDay(null)}
          onDelete={deleteMeal}
        />
      )}
      {showSavedMeals && (
        <SavedMealsSheet onClose={() => setShowSavedMeals(false)} />
      )}
      {showPhotoLog && (
        <PhotoFoodSheet onClose={() => setShowPhotoLog(false)} onLogged={() => {}} />
      )}

      <AIAdvisor section="nutrition" />
    </div>
  );
}
