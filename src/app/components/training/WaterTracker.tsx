'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';

const QUICK_AMOUNTS = [150, 250, 330, 500];

function aiRecommend(weight: number, heightCm: number, gender: string, activity: string): number {
  // Base: 35 ml/kg for males, 31 ml/kg for females
  const base = gender === 'feminine' ? 31 : 35;
  let ml = base * weight;
  // Activity multiplier
  const mult: Record<string, number> = { sedentary: 0.9, light: 1.0, moderate: 1.1, active: 1.2, very_active: 1.35 };
  ml *= mult[activity] ?? 1.0;
  // Round to nearest 50
  return Math.round(ml / 50) * 50;
}

export default function WaterTracker() {
  const {
    waterLog, waterGoal, addWaterEntry, deleteWaterEntry, setWaterGoal,
    characterAppearance,
  } = useGameStore();

  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = waterLog.filter(e => e.date === today).sort((a, b) => a.id.localeCompare(b.id));
  const todayTotal   = todayEntries.reduce((s, e) => s + e.amount, 0);
  const pct          = Math.min(1, todayTotal / waterGoal);
  const goalMet      = todayTotal >= waterGoal;

  const [custom, setCustom]       = useState('');
  const [editGoal, setEditGoal]   = useState(false);
  const [goalInput, setGoalInput] = useState(String(waterGoal));

  const addAmount = (ml: number) => {
    if (ml > 0) addWaterEntry(today, ml);
  };

  const saveGoal = () => {
    const v = parseInt(goalInput);
    if (v > 0) setWaterGoal(v);
    setEditGoal(false);
  };

  const recommend = () => {
    const { startingWeight, height, gender, activityLevel } = characterAppearance;
    const rec = aiRecommend(startingWeight ?? 75, height ?? 175, gender, activityLevel ?? 'moderate');
    setGoalInput(String(rec));
    setWaterGoal(rec);
  };

  // Ring dimensions
  const R = 52, CX = 64, CY = 64, circ = 2 * Math.PI * R;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress ring + today summary */}
      <div className="bg-ql-surface rounded-2xl border border-ql p-4 flex items-center gap-5">
        {/* SVG ring */}
        <svg width={128} height={128} viewBox="0 0 128 128" style={{ flexShrink: 0 }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--ql-surface-3,#e8e8e8)" strokeWidth="10" />
          <circle cx={CX} cy={CY} r={R} fill="none"
            stroke={goalMet ? '#22c55e' : '#3b9eff'}
            strokeWidth="10"
            strokeDasharray={`${circ}`}
            strokeDashoffset={`${circ * (1 - pct)}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
          <text x={CX} y={CY - 6} textAnchor="middle" fontSize="16" fontWeight="800"
            fill="var(--ql-text,#111)">{todayTotal >= 1000 ? `${(todayTotal/1000).toFixed(1)}L` : `${todayTotal}`}</text>
          <text x={CX} y={CY + 10} textAnchor="middle" fontSize="9"
            fill="var(--ql-text-3,#aaa)">of {waterGoal >= 1000 ? `${(waterGoal/1000).toFixed(1)}L` : `${waterGoal}ml`}</text>
          {goalMet && (
            <text x={CX} y={CY + 24} textAnchor="middle" fontSize="9" fontWeight="700" fill="#22c55e">Goal hit ✓</text>
          )}
        </svg>

        {/* Right side info */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div>
            <p className="text-ql text-sm font-bold">{Math.round(pct * 100)}% of daily goal</p>
            <p className="text-ql-3 text-xs mt-0.5">{todayEntries.length} drink{todayEntries.length !== 1 ? 's' : ''} logged today</p>
          </div>

          {/* Goal row */}
          {editGoal ? (
            <div className="flex gap-1.5 items-center">
              <input
                type="number" value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveGoal()}
                className="w-20 bg-ql-surface2 border border-ql rounded-lg px-2 py-1 text-xs text-ql outline-none"
                placeholder="ml"
              />
              <span className="text-ql-3 text-xs">ml</span>
              <button onClick={saveGoal} className="text-xs px-2 py-1 bg-ql-accent text-white rounded-lg font-semibold">Save</button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <button onClick={() => { setGoalInput(String(waterGoal)); setEditGoal(true); }}
                className="text-xs px-2.5 py-1 border border-ql rounded-lg text-ql-3 hover:text-ql transition-colors">
                Set goal
              </button>
              <button onClick={recommend}
                className="text-xs px-2.5 py-1 border border-ql-accent/50 rounded-lg text-ql-accent font-semibold hover:bg-ql-accent/10 transition-colors">
                ✨ AI recommend
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick-add buttons */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map(ml => (
          <button key={ml} onClick={() => addAmount(ml)}
            className="bg-ql-surface border border-ql rounded-xl py-2.5 text-center text-ql text-sm font-semibold hover:border-ql-accent/50 transition-colors active:scale-95">
            +{ml}ml
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="flex gap-2">
        <input
          type="number" value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { addAmount(parseInt(custom)); setCustom(''); } }}
          placeholder="Custom amount (ml)…"
          className="flex-1 bg-ql-surface border border-ql rounded-xl px-4 py-2.5 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
        />
        <button
          onClick={() => { addAmount(parseInt(custom)); setCustom(''); }}
          className="px-4 py-2.5 bg-ql-accent text-white rounded-xl text-sm font-semibold"
        >
          Add
        </button>
      </div>

      {/* Today's log */}
      {todayEntries.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-ql text-sm font-semibold">Today&apos;s log</p>
          <div className="bg-ql-surface rounded-2xl border border-ql overflow-hidden divide-y divide-ql/40">
            {[...todayEntries].reverse().map(entry => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">💧</span>
                  <span className="text-ql text-sm font-medium">{entry.amount} ml</span>
                </div>
                <button onClick={() => deleteWaterEntry(entry.id)}
                  className="text-ql-3 hover:text-red-400 text-sm transition-colors px-1">✕</button>
              </div>
            ))}
          </div>
          <p className="text-ql-3 text-xs text-right">Total: {todayTotal} ml</p>
        </div>
      )}
    </div>
  );
}
