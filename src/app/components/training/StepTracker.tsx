'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Detailed chart helpers (exported for Stats tab) ─────────────────────────
export type StepBar = { label: string; value: number; isToday: boolean; showLabel: boolean };
export type StepPeriod = 'W' | 'M' | '6M' | 'Y';

export function buildDailyBars(stepsByDate: Record<string,number>, days: number): StepBar[] {
  const today = toDateStr(new Date());
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    const ds = toDateStr(d);
    const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    // For 30-day view: show date number every 7 days; for 7-day: show every day
    const showLabel = days <= 7 ? true : i % 7 === 0 || i === days - 1;
    const label = days <= 7 ? DOW[d.getDay()] : String(d.getDate());
    return { label, value: stepsByDate[ds] ?? 0, isToday: ds === today, showLabel };
  });
}

export function buildWeeklyBars(stepsByDate: Record<string,number>, weeks: number): StepBar[] {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return Array.from({ length: weeks }, (_, wi) => {
    const daysAgo = (weeks - 1 - wi) * 7;
    let total = 0, count = 0;
    for (let j = 0; j < 7; j++) {
      const d = new Date(); d.setDate(d.getDate() - daysAgo - (6 - j));
      const val = stepsByDate[toDateStr(d)] ?? 0;
      if (val > 0) { total += val; count++; }
    }
    const anchor = new Date(); anchor.setDate(anchor.getDate() - daysAgo);
    const showLabel = anchor.getDate() <= 7;
    return { label: MONTHS[anchor.getMonth()], value: count ? Math.round(total / count) : 0, isToday: false, showLabel };
  });
}

export function buildMonthlyBars(stepsByDate: Record<string,number>, months: number): StepBar[] {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return Array.from({ length: months }, (_, mi) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (months - 1 - mi));
    const year = d.getFullYear(); const month = d.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let total = 0, count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const val = stepsByDate[ds] ?? 0;
      if (val > 0) { total += val; count++; }
    }
    return { label: MONTHS[month], value: count ? Math.round(total / count) : 0, isToday: false, showLabel: true };
  });
}

export function StepsChart({ bars, goal }: { bars: StepBar[]; goal: number }) {
  const W = 340, H = 140, PAD_L = 8, PAD_R = 44, PAD_T = 8, PAD_B = 20;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const maxVal = Math.max(goal * 1.1, ...bars.map(b => b.value), 1);
  const tickStep = 5000;
  const ticks = Array.from({ length: Math.ceil(maxVal / tickStep) + 1 }, (_, i) => i * tickStep).filter(t => t <= maxVal * 1.05);
  const yPct = (v: number) => 1 - v / maxVal;
  const barW  = Math.max(2, (chartW / bars.length) * 0.7);
  const gap   = chartW / bars.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      {ticks.map(t => {
        const y = PAD_T + yPct(t) * chartH;
        return (
          <g key={t}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--ql-surface-3)" strokeWidth="0.5" strokeDasharray="3 3" />
            <text x={W - PAD_R + 4} y={y + 3} fill="var(--ql-fg-3)" fontSize="8" textAnchor="start">
              {t >= 1000 ? `${t/1000}k` : t}
            </text>
          </g>
        );
      })}
      {(() => {
        const y = PAD_T + yPct(goal) * chartH;
        return <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="#22c55e" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />;
      })()}
      {bars.map((b, i) => {
        const x     = PAD_L + i * gap + (gap - barW) / 2;
        const bh    = Math.max(b.value > 0 ? 2 : 0, yPct(0) * chartH - yPct(b.value) * chartH);
        const by    = PAD_T + yPct(b.value) * chartH;
        const color = b.isToday ? '#7c3aed' : b.value >= goal ? '#22c55e' : '#4a9eff';
        return (
          <g key={i}>
            <rect x={x} y={by} width={barW} height={bh} rx="1.5" fill={color} opacity={b.value === 0 ? 0.25 : 1} />
            {b.value === 0 && <rect x={x} y={PAD_T + chartH - 2} width={barW} height={2} rx="1" fill={color} opacity={0.3} />}
            {b.showLabel && (
              <text x={x + barW / 2} y={H - 3} fill="var(--ql-fg-3)" fontSize="8" textAnchor="middle">{b.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return toDateStr(d);
  });
}

export function dayLabel(dateStr: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = new Date(dateStr + 'T00:00:00');
  return days[d.getDay()];
}

// ── Animated ring ─────────────────────────────────────────────────────────────
function StepRing({ steps, goal }: { steps: number; goal: number }) {
  const pct     = Math.min(1, steps / goal);
  const r       = 44;
  const circ    = 2 * Math.PI * r;
  const dash    = pct * circ;
  const color   = pct >= 1 ? '#22c55e' : pct >= 0.5 ? '#7c3aed' : '#a78bfa';

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg width="128" height="128" viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--ql-surface-3)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-ql text-xl font-bold tabular-nums">{steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : steps}</span>
        <span className="text-ql-3 text-[10px]">steps</span>
        {pct >= 1 && <span className="text-[10px] text-green-400 font-bold mt-0.5">Goal!</span>}
      </div>
    </div>
  );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
export function StepBars({ dates, stepsByDate, goal }: { dates: string[]; stepsByDate: Record<string, number>; goal: number }) {
  const maxVal = Math.max(goal, ...dates.map(d => stepsByDate[d] ?? 0), 1);
  const today  = toDateStr(new Date());

  return (
    <div className="flex items-end gap-1.5 h-20">
      {dates.map(date => {
        const val   = stepsByDate[date] ?? 0;
        const hPct  = val / maxVal;
        const isToday = date === today;
        const hit   = val >= goal;
        return (
          <div key={date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center" style={{ height: 56 }}>
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${hit ? 'bg-green-500' : isToday ? 'bg-ql-accent' : 'bg-ql-surface3'}`}
                style={{ height: `${Math.max(hPct * 56, val > 0 ? 4 : 0)}px` }}
              />
            </div>
            <span className={`text-[9px] ${isToday ? 'text-ql-accent font-bold' : 'text-ql-3'}`}>{dayLabel(date)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StepTracker({ belowStats }: { belowStats?: React.ReactNode } = {}) {
  const {
    stepLog, stepGoal, googleFitTokens,
    logSteps, setStepGoal, setGoogleFitTokens,
  } = useGameStore();

  const today   = toDateStr(new Date());
  const dates   = getLast7Days();
  const todayEntry = stepLog.find(e => e.date === today);
  const todaySteps = todayEntry?.steps ?? 0;

  const stepsByDate: Record<string, number> = {};
  for (const e of stepLog) stepsByDate[e.date] = e.steps;

  const [manualVal,  setManualVal]  = useState('');
  const [goalEdit,   setGoalEdit]   = useState(false);
  const [goalInput,  setGoalInput]  = useState(String(stepGoal));
  const [syncing,    setSyncing]    = useState(false);
  const [syncError,  setSyncError]  = useState('');
  const [connecting, setConnecting] = useState(false);

  const googleFitConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_FIT_AVAILABLE;

  // ── Pick up Google Fit tokens from OAuth redirect ──────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const access  = params.get('gfit_access');
    const refresh = params.get('gfit_refresh');
    const expiry  = params.get('gfit_expiry');
    if (access && refresh && expiry) {
      setGoogleFitTokens({ accessToken: access, refreshToken: refresh, expiresAt: Number(expiry) });
      // Clean URL
      const clean = new URL(window.location.href);
      clean.searchParams.delete('gfit_access');
      clean.searchParams.delete('gfit_refresh');
      clean.searchParams.delete('gfit_expiry');
      window.history.replaceState({}, '', clean.toString());
    }
  }, [setGoogleFitTokens]);

  // ── Connect Google Fit ─────────────────────────────────────────────────────
  const connectGoogleFit = async () => {
    setConnecting(true);
    try {
      const res  = await fetch('/api/health/google-fit/auth');
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
      else setSyncError(data.error ?? 'Setup required — see instructions below.');
    } finally {
      setConnecting(false);
    }
  };

  // ── Sync from Google Fit ───────────────────────────────────────────────────
  const syncSteps = useCallback(async () => {
    if (!googleFitTokens) return;
    setSyncing(true);
    setSyncError('');
    try {
      const res = await fetch('/api/health/google-fit/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken:  googleFitTokens.accessToken,
          refreshToken: googleFitTokens.refreshToken,
          expiresAt:    googleFitTokens.expiresAt,
          dates,
        }),
      });
      const data = await res.json() as {
        results?: { date: string; steps: number }[];
        error?: string;
        newAccessToken?: string;
        newExpiresAt?: number;
      };
      if (data.error === 'token_expired') {
        setGoogleFitTokens(null);
        setSyncError('Session expired — reconnect Google Fit.');
        return;
      }
      if (data.error) { setSyncError(data.error); return; }
      for (const { date, steps } of data.results ?? []) {
        logSteps(date, steps, 'google_fit');
      }
      if (data.newAccessToken && data.newExpiresAt) {
        setGoogleFitTokens({ ...googleFitTokens, accessToken: data.newAccessToken, expiresAt: data.newExpiresAt });
      }
    } catch (e) {
      setSyncError(String(e));
    } finally {
      setSyncing(false);
    }
  }, [googleFitTokens, dates, logSteps, setGoogleFitTokens]);

  // ── Manual log ────────────────────────────────────────────────────────────
  const submitManual = () => {
    const n = parseInt(manualVal, 10);
    if (!isNaN(n) && n >= 0) {
      logSteps(today, n, 'manual');
      setManualVal('');
    }
  };

  // ── Goal ──────────────────────────────────────────────────────────────────
  const saveGoal = () => {
    const n = parseInt(goalInput, 10);
    if (!isNaN(n) && n > 0) { setStepGoal(n); setGoalEdit(false); }
  };

  const rewardTier = todaySteps >= 15000 ? 3 : todaySteps >= 10000 ? 2 : todaySteps >= 5000 ? 1 : 0;
  const REWARD_LABELS = ['', '+1 DEX +5 XP', '+2 DEX +1 CON +10 XP', '+3 DEX +2 CON +15 XP'];

  // Detailed chart state
  const [period, setPeriod] = useState<StepPeriod>('W');
  const PERIODS: StepPeriod[] = ['W', 'M', '6M', 'Y'];
  const PERIOD_LABELS: Record<StepPeriod, string> = { W: 'Week', M: 'Month', '6M': '6 Months', Y: 'Year' };

  const chartBars = (() => {
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

  const activeBars = chartBars.filter(b => b.value > 0);
  const avg = activeBars.length ? Math.round(activeBars.reduce((s, b) => s + b.value, 0) / activeBars.length) : 0;
  const goalHit = chartBars.filter(b => b.value >= stepGoal).length;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Today's steps ── */}
      <div className="bg-ql-surface rounded-2xl border border-ql p-4 flex flex-col items-center gap-3">
        <div className="w-full flex items-center justify-between">
          <p className="text-ql text-sm font-semibold">Today</p>
          <button onClick={() => setGoalEdit(g => !g)} className="text-ql-3 text-xs border border-ql rounded-xl px-2 py-1">
            Goal: {stepGoal.toLocaleString()}
          </button>
        </div>

        {goalEdit && (
          <div className="w-full flex gap-2">
            <input
              type="number"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveGoal()}
              className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-ql text-sm outline-none"
            />
            <button onClick={saveGoal} className="px-4 py-2 bg-ql-accent text-white text-sm font-semibold rounded-xl">Save</button>
          </div>
        )}

        <StepRing steps={todaySteps} goal={stepGoal} />

        {rewardTier > 0 && todayEntry?.rewarded && (
          <div className="flex items-center gap-1.5 bg-ql-accent/10 border border-ql-accent/30 rounded-xl px-3 py-1.5">
            <span className="text-xs">✅</span>
            <span className="text-ql-accent text-xs font-semibold">{REWARD_LABELS[rewardTier]} earned today</span>
          </div>
        )}

        {/* Milestone chips */}
        <div className="flex gap-2 w-full">
          {[
            { steps: 5000,  label: '5k',  reward: '+1 DEX' },
            { steps: 10000, label: '10k', reward: '+2 DEX' },
            { steps: 15000, label: '15k', reward: '+3 DEX' },
          ].map(m => {
            const hit = todaySteps >= m.steps;
            return (
              <div key={m.steps} className={`flex-1 text-center py-1.5 rounded-xl border text-[10px] font-semibold transition-all ${hit ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-ql text-ql-3'}`}>
                <div>{m.label}</div>
                <div className="opacity-70">{m.reward}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Manual entry ── */}
      <div className="bg-ql-surface rounded-2xl border border-ql p-4">
        <p className="text-ql text-sm font-semibold mb-3">Log Steps Manually</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={manualVal}
            onChange={e => setManualVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitManual()}
            placeholder="e.g. 8500"
            className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3 py-2.5 text-ql text-sm outline-none"
          />
          <button
            onClick={submitManual}
            disabled={!manualVal}
            className="px-4 py-2 bg-ql-accent disabled:opacity-40 text-white text-sm font-semibold rounded-xl"
          >
            Log
          </button>
        </div>
        <p className="text-ql-3 text-[11px] mt-2">
          Check your phone's Health / Fitness app and enter today's total.
        </p>
      </div>

      {/* ── Detailed chart ── */}
      <div className="bg-ql-surface rounded-2xl border border-ql p-4">
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
        <StepsChart bars={chartBars} goal={stepGoal} />

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

        {/* Summary tiles */}
        <div className="flex gap-2 mt-4">
          <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
            <p className="text-ql text-sm font-bold tabular-nums">{todaySteps.toLocaleString()}</p>
            <p className="text-ql-3 text-[10px]">Today</p>
          </div>
          <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
            <p className="text-ql text-sm font-bold">{goalHit}/{chartBars.length}</p>
            <p className="text-ql-3 text-[10px]">Goals hit ({PERIOD_LABELS[period]})</p>
          </div>
          <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex-1 text-center">
            <p className="text-ql text-sm font-bold tabular-nums">{stepLog.length}</p>
            <p className="text-ql-3 text-[10px]">Days logged</p>
          </div>
        </div>
      </div>

      {belowStats}

      {/* ── History ── */}
      {stepLog.length > 0 && (
        <div className="bg-ql-surface rounded-2xl border border-ql p-4">
          <p className="text-ql text-sm font-semibold mb-3">Recent History</p>
          <div className="flex flex-col gap-2">
            {[...stepLog]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 10)
              .map(e => (
                <div key={e.id} className="flex items-center justify-between py-1 border-b border-ql last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-ql-3 text-xs w-20">{e.date}</span>
                    <span className="text-[10px] text-ql-3">{e.source === 'google_fit' ? '🤖' : '✏️'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold tabular-nums ${e.steps >= stepGoal ? 'text-green-400' : 'text-ql'}`}>
                      {e.steps.toLocaleString()}
                    </span>
                    {e.rewarded && <span className="text-[10px] text-ql-accent">+stats</span>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Google Fit sync ── */}
      <div className="bg-ql-surface rounded-2xl border border-ql p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🤖</span>
          <p className="text-ql text-sm font-semibold">Google Fit Sync</p>
          <span className="text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded-full font-medium ml-auto">Android</span>
        </div>
        <p className="text-ql-3 text-[11px] mb-3">
          Auto-import your daily steps from Google Fit — no typing needed.
        </p>

        {!googleFitTokens ? (
          <button
            onClick={connectGoogleFit}
            disabled={connecting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {connecting ? 'Opening…' : '🔗 Connect Google Fit'}
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
              <span>✅</span>
              <span>Google Fit connected</span>
              <button onClick={() => setGoogleFitTokens(null)} className="ml-auto text-ql-3 underline text-[10px]">Disconnect</button>
            </div>
            <button
              onClick={syncSteps}
              disabled={syncing}
              className="w-full py-2.5 bg-ql-accent hover:bg-ql-accent-h disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {syncing ? '⟳ Syncing…' : '⟳ Sync Last 7 Days'}
            </button>
          </div>
        )}

        {syncError && <p className="text-red-400 text-[11px] mt-2">{syncError}</p>}

        {!googleFitTokens && (
          <details className="mt-3">
            <summary className="text-ql-3 text-[11px] cursor-pointer">Setup instructions ›</summary>
            <div className="mt-2 text-ql-3 text-[11px] leading-relaxed space-y-1">
              <p>1. Go to <strong className="text-ql">console.cloud.google.com</strong></p>
              <p>2. Create a project → Enable <strong className="text-ql">Fitness API</strong></p>
              <p>3. Create <strong className="text-ql">OAuth 2.0 credentials</strong> (Web application)</p>
              <p>4. Add redirect URI: <code className="bg-ql-surface2 px-1 rounded text-ql">http://localhost:3000/api/health/google-fit/callback</code></p>
              <p>5. Add to <code className="bg-ql-surface2 px-1 rounded text-ql">.env.local</code>:</p>
              <pre className="bg-ql-surface2 rounded-lg p-2 text-[10px] mt-1 overflow-x-auto">
{`GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_URL=http://localhost:3000`}
              </pre>
              <p className="mt-1">6. Restart the dev server, then tap Connect.</p>
            </div>
          </details>
        )}
      </div>

      {/* ── Apple Health note ── */}
      <div className="bg-ql-surface rounded-2xl border border-ql p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🍎</span>
          <p className="text-ql text-sm font-semibold">Apple Health</p>
          <span className="text-[10px] bg-ql-surface3 text-ql-3 px-1.5 py-0.5 rounded-full font-medium ml-auto">iOS</span>
        </div>
        <p className="text-ql-3 text-[11px] leading-relaxed">
          Apple locks Health data to native iOS apps — Safari and web apps can't access it directly. Check your steps in the Health app and enter manually, or use our built in GPS tracker system.
        </p>
      </div>
    </div>
  );
}
