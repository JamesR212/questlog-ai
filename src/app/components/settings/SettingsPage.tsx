'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Theme } from '@/types';

const THEMES: { id: Theme; label: string; bg: string; accent: string; surface: string }[] = [
  { id: 'dark',  label: 'Dark',    bg: '#13131f', accent: '#7c3aed', surface: '#1e1e2e' },
  { id: 'white', label: 'Light',   bg: '#f5f5f7', accent: '#6d28d9', surface: '#ffffff' },
  { id: 'pink',  label: 'Pink',    bg: '#fce4f0', accent: '#db2777', surface: '#fff0f7' },
  { id: 'blue',  label: 'Blue',    bg: '#dbeafe', accent: '#2563eb', surface: '#eff6ff' },
  { id: 'green', label: 'Green',   bg: '#dcfce7', accent: '#16a34a', surface: '#f0fdf4' },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle(); }}
      className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${on ? 'bg-ql-accent' : 'bg-ql-surface3'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${on ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );
}

const TOGGLEABLE_SECTIONS = [
  { id: 'nutrition', label: 'Food',     icon: '🥗' },
  { id: 'calendar',  label: 'Calendar', icon: '📅' },
  { id: 'vices',     label: 'Vices',    icon: '🍺' },
  { id: 'habits',    label: 'Habits',   icon: '✅' },
  { id: 'gym',       label: 'Fitness',  icon: '💪' },
];

const TOGGLEABLE_STATS = [
  { id: 'STR',  label: 'Strength',  icon: '⚔️' },
  { id: 'CON',  label: 'Endurance', icon: '🛡️' },
  { id: 'DEX',  label: 'Agility',   icon: '🏹' },
  { id: 'GOLD', label: 'Gold',      icon: '💰' },
];

export default function SettingsPage() {
  const {
    theme, setTheme,
    competitionMode, setCompetitionMode,
    financialMode, setFinancialMode,
    hiddenSections, toggleHiddenSection,
    hiddenStats, toggleHiddenStat,
    userName, setUserName,
    currencySymbol, setCurrencySymbol,
    savingsGoal, setSavingsGoal,
    gpsTrackingEnabled, setGpsTrackingEnabled,
    characterAppearance, setCharacterAppearance,
  } = useGameStore();

  const handleSignOut = async () => {
    const { signOut } = await import('firebase/auth');
    const { auth } = await import('@/lib/firebase');
    await signOut(auth);
  };

  const [nameVal,   setNameVal]   = useState(userName);
  const [symVal,    setSymVal]    = useState(currencySymbol);
  const [goalVal,   setGoalVal]   = useState(String(savingsGoal));
  const [ageVal,    setAgeVal]    = useState(String(characterAppearance.age ?? ''));
  const [weightVal, setWeightVal] = useState(String(characterAppearance.startingWeight ?? ''));
  const [heightVal, setHeightVal] = useState(String(characterAppearance.height ?? ''));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-ql text-xl font-bold">Settings</h2>
        <p className="text-ql-3 text-xs mt-0.5">Customise your GAINN experience</p>
      </div>

      {/* ── Colour Scheme ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <p className="text-ql text-sm font-semibold">Colour Scheme</p>
        <div className="grid grid-cols-5 gap-2">
          {THEMES.map(t => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="flex flex-col items-center gap-2"
              >
                {/* Swatch */}
                <div
                  className="w-full aspect-square rounded-2xl border-2 transition-all duration-200 flex flex-col overflow-hidden"
                  style={{
                    backgroundColor: t.bg,
                    borderColor: active ? t.accent : 'transparent',
                    boxShadow: active ? `0 0 0 2px ${t.accent}55` : 'none',
                  }}
                >
                  {/* Mini UI preview */}
                  <div className="flex-1 flex items-end px-1.5 pb-1.5 gap-1">
                    <div className="flex-1 h-3 rounded-md" style={{ backgroundColor: t.surface }} />
                    <div className="w-2 h-3 rounded-md" style={{ backgroundColor: t.accent }} />
                  </div>
                  <div className="h-3 mx-1 mb-1 rounded-md" style={{ backgroundColor: t.accent, opacity: 0.3 }} />
                </div>
                <span className={`text-[10px] font-semibold ${active ? 'text-ql-accent' : 'text-ql-3'}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Competition Mode ─────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <p className="text-ql text-sm font-semibold">Mode</p>
        <div className="bg-ql-surface rounded-2xl border border-ql overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4 border-b border-ql">
            <div>
              <p className="text-ql text-sm font-semibold">Competition Mode</p>
              <p className="text-ql-3 text-xs mt-0.5 leading-relaxed">
                {competitionMode
                  ? '🔥 Streak counter on — keep the chain going'
                  : '🧘 Chill mode — track progress without streak pressure'}
              </p>
            </div>
            <Toggle on={competitionMode} onToggle={() => setCompetitionMode(!competitionMode)} />
          </div>
          <div className="flex items-center justify-between px-4 py-4 border-b border-ql">
            <div>
              <p className="text-ql text-sm font-semibold">Financial Mode</p>
              <p className="text-ql-3 text-xs mt-0.5 leading-relaxed">
                {financialMode
                  ? '💳 Budget tracking visible on home & nav'
                  : '💤 Financial features hidden from main view'}
              </p>
            </div>
            <Toggle on={financialMode} onToggle={() => setFinancialMode(!financialMode)} />
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-ql text-sm font-semibold">GPS Activity Tracking</p>
              <p className="text-ql-3 text-xs mt-0.5 leading-relaxed">
                {gpsTrackingEnabled
                  ? '🗺️ Track runs, rides & walks with GPS'
                  : '📍 Enable to record outdoor activities'}
              </p>
            </div>
            <Toggle on={gpsTrackingEnabled} onToggle={() => setGpsTrackingEnabled(!gpsTrackingEnabled)} />
          </div>
        </div>
      </div>

      {/* ── Passive mode visibility (only when competition mode off) ── */}
      {!competitionMode && (
        <>
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-ql text-sm font-semibold">Visible Sections</p>
              <p className="text-ql-3 text-xs mt-0.5">Choose which tabs appear in passive mode</p>
            </div>
            <div className="bg-ql-surface rounded-2xl border border-ql overflow-hidden">
              {TOGGLEABLE_SECTIONS.map((s, i) => {
                const hidden = hiddenSections.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleHiddenSection(s.id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-ql-surface2 ${i < TOGGLEABLE_SECTIONS.length - 1 ? 'border-b border-ql' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{s.icon}</span>
                      <span className={`text-sm font-medium ${hidden ? 'text-ql-3 line-through' : 'text-ql'}`}>{s.label}</span>
                    </div>
                    <Toggle on={!hidden} onToggle={() => toggleHiddenSection(s.id)} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div>
              <p className="text-ql text-sm font-semibold">Visible Stats</p>
              <p className="text-ql-3 text-xs mt-0.5">Choose which RPG stats appear on your dashboard</p>
            </div>
            <div className="bg-ql-surface rounded-2xl border border-ql overflow-hidden">
              {TOGGLEABLE_STATS.map((s, i) => {
                const hidden = hiddenStats.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleHiddenStat(s.id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-ql-surface2 ${i < TOGGLEABLE_STATS.length - 1 ? 'border-b border-ql' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{s.icon}</span>
                      <span className={`text-sm font-medium ${hidden ? 'text-ql-3 line-through' : 'text-ql'}`}>{s.label}</span>
                    </div>
                    <Toggle on={!hidden} onToggle={() => toggleHiddenStat(s.id)} />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Profile ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <p className="text-ql text-sm font-semibold">Profile</p>
        <div className="bg-ql-surface rounded-2xl border border-ql overflow-hidden">
          <div className="flex items-center px-4 py-3.5 border-b border-ql gap-4">
            <span className="text-ql-3 text-sm w-24 shrink-0">Your name</span>
            <input
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={() => setUserName(nameVal)}
              placeholder="Enter your name"
              className="flex-1 bg-transparent text-ql text-sm outline-none text-right"
            />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-ql gap-4">
            <span className="text-ql-3 text-sm w-24 shrink-0">Currency</span>
            <input
              value={symVal}
              onChange={e => setSymVal(e.target.value)}
              onBlur={() => setCurrencySymbol(symVal)}
              placeholder="£"
              className="flex-1 bg-transparent text-ql text-sm outline-none text-right"
            />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-ql gap-4">
            <span className="text-ql-3 text-sm w-24 shrink-0">Savings target</span>
            <input
              type="number"
              value={goalVal}
              onChange={e => setGoalVal(e.target.value)}
              onBlur={() => { const v = parseFloat(goalVal); if (!isNaN(v) && v > 0) setSavingsGoal(v); }}
              onKeyDown={e => { if (e.key === 'Enter') { const v = parseFloat(goalVal); if (!isNaN(v) && v > 0) setSavingsGoal(v); (e.target as HTMLInputElement).blur(); }}}
              placeholder="1000"
              className="flex-1 bg-transparent text-ql text-sm outline-none text-right"
            />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-ql gap-4">
            <span className="text-ql-3 text-sm w-24 shrink-0">Age</span>
            <input
              type="number"
              value={ageVal}
              onChange={e => setAgeVal(e.target.value)}
              onBlur={() => { const v = parseInt(ageVal); if (!isNaN(v) && v > 0) setCharacterAppearance({ ...characterAppearance, age: v }); }}
              onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(ageVal); if (!isNaN(v) && v > 0) setCharacterAppearance({ ...characterAppearance, age: v }); (e.target as HTMLInputElement).blur(); }}}
              placeholder="25"
              className="flex-1 bg-transparent text-ql text-sm outline-none text-right"
            />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-ql gap-4">
            <span className="text-ql-3 text-sm w-24 shrink-0">Weight (kg)</span>
            <input
              type="number"
              value={weightVal}
              onChange={e => setWeightVal(e.target.value)}
              onBlur={() => { const v = parseFloat(weightVal); if (!isNaN(v) && v > 0) setCharacterAppearance({ ...characterAppearance, startingWeight: v }); }}
              onKeyDown={e => { if (e.key === 'Enter') { const v = parseFloat(weightVal); if (!isNaN(v) && v > 0) setCharacterAppearance({ ...characterAppearance, startingWeight: v }); (e.target as HTMLInputElement).blur(); }}}
              placeholder="80"
              className="flex-1 bg-transparent text-ql text-sm outline-none text-right"
            />
          </div>
          <div className="flex items-center px-4 py-3.5 gap-4">
            <span className="text-ql-3 text-sm w-24 shrink-0">Height (cm)</span>
            <input
              type="number"
              value={heightVal}
              onChange={e => setHeightVal(e.target.value)}
              onBlur={() => { const v = parseInt(heightVal); if (!isNaN(v) && v > 0) setCharacterAppearance({ ...characterAppearance, height: v }); }}
              onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(heightVal); if (!isNaN(v) && v > 0) setCharacterAppearance({ ...characterAppearance, height: v }); (e.target as HTMLInputElement).blur(); }}}
              placeholder="175"
              className="flex-1 bg-transparent text-ql text-sm outline-none text-right"
            />
          </div>
        </div>
      </div>
      {/* ── Account ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <p className="text-ql text-sm font-semibold">Account</p>
        <div className="bg-ql-surface rounded-2xl border border-ql overflow-hidden">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-4 py-3.5 text-red-400 hover:bg-ql-surface2 transition-colors"
          >
            <span className="text-sm font-medium">Sign Out</span>
            <span className="text-base">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
