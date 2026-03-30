'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { checkUsernameAvailable } from '@/lib/friends';
import type { Theme } from '@/types';

// ── Weight unit helpers ────────────────────────────────────────────────────────
function kgToStLbs(kg: number): { st: number; lbs: number } {
  const totalLbs = kg * 2.20462;
  const st = Math.floor(totalLbs / 14);
  const lbs = Math.round(totalLbs % 14);
  return { st, lbs };
}
function stLbsToKg(st: number, lbs: number): number {
  return Math.round(((st * 14) + lbs) / 2.20462 * 10) / 10;
}
function kgToLbs(kg: number): number { return Math.round(kg * 2.20462); }
function lbsToKg(lbs: number): number { return Math.round(lbs / 2.20462 * 10) / 10; }

// ── Image resize helper ────────────────────────────────────────────────────────
function resizeImageToBase64(file: File, size = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const min = Math.min(img.width, img.height);
      const sx  = (img.width  - min) / 2;
      const sy  = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const THEMES: { id: Theme; label: string; bg: string; accent: string; surface: string }[] = [
  { id: 'dark',  label: 'Dark',    bg: '#13131f', accent: '#7c3aed', surface: '#1e1e2e' },
  { id: 'white', label: 'Light',   bg: '#f5f5f7', accent: '#6d28d9', surface: '#ffffff' },
  { id: 'pink',  label: 'Pink',    bg: '#fce4f0', accent: '#db2777', surface: '#fff0f7' },
  { id: 'blue',  label: 'Blue',    bg: '#dbeafe', accent: '#2563eb', surface: '#eff6ff' },
  { id: 'green', label: 'Green',   bg: '#dcfce7', accent: '#16a34a', surface: '#f0fdf4' },
];

// ── Theme Picker ─────────────────────────────────────────────────────────────
function ThemeCarousel({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-ql text-sm font-semibold">Colour Scheme</p>
      <div className="flex gap-2">
        {THEMES.map(t => {
          const isActive = t.id === theme;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="flex-1 flex flex-col items-center gap-1.5 rounded-2xl py-3 px-1 transition-all duration-200"
              style={{
                backgroundColor: t.bg,
                border: isActive ? `2px solid ${t.accent}` : '2px solid transparent',
                boxShadow: isActive ? `0 0 0 2px ${t.accent}55` : '0 2px 8px rgba(0,0,0,0.12)',
              }}
            >
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.accent }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.surface }} />
              </div>
              <span className="text-[10px] font-semibold leading-none" style={{ color: isActive ? t.accent : t.accent + 'aa' }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
  { id: 'vices',     label: 'Finance',  icon: '💰' },
  { id: 'training',  label: 'Habits',   icon: '✅' },
  { id: 'gym',       label: 'Exercise', icon: '🏃' },
];

const ALL_SECTIONS: { id: string; label: string; icon: string; desc: string }[] = [
  { id: 'food',       label: 'Food',       icon: '🥗', desc: 'Meal logging & nutrition plans'    },
  { id: 'hydration',  label: 'Hydration',  icon: '💧', desc: 'Daily water tracking'              },
  { id: 'sleep',      label: 'Sleep',      icon: '🌙', desc: 'Sleep log & bedtime tracking'      },
  { id: 'wake',       label: 'Wake Up',    icon: '🌅', desc: 'Morning check-in & wake quest'     },
  { id: 'snapshot',   label: 'Weekly Snapshot', icon: '📊', desc: 'Weekly overview on the home page' },
  { id: 'calendar',   label: 'Calendar',   icon: '📅', desc: 'Events & scheduling'               },
  { id: 'vices',      label: 'Vices',      icon: '🚫', desc: 'Bad habit tracker'                 },
  { id: 'finance',    label: 'Finance',    icon: '💰', desc: 'Budget & spending tracker'         },
  { id: 'habits',     label: 'Habits',     icon: '✅', desc: 'Daily habit tracking'              },
  { id: 'gym',        label: 'Exercise',   icon: '🏃', desc: 'Workout plans & activity tracking' },
  { id: 'plans',      label: 'Plans',      icon: '🏋️', desc: 'Workout plans inside Exercise'     },
  { id: 'steps',      label: 'Steps',      icon: '👟', desc: 'Daily step counting'               },
  { id: 'stats',      label: 'Stats',      icon: '📊', desc: 'Performance stats & metrics'       },
  { id: 'track',      label: 'GPS Track',  icon: '🗺️', desc: 'GPS activity recording'            },
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
    aiIntensity, setAiIntensity,
    financialMode, setFinancialMode,
    hiddenSections, toggleHiddenSection,
    hiddenStats, toggleHiddenStat,
    userName, setUserName,
    profilePicUrl, setProfilePicUrl,
    weightUnit, setWeightUnit,
    currencySymbol, setCurrencySymbol,
    savingsGoal, setSavingsGoal,
    gpsTrackingEnabled, setGpsTrackingEnabled,
    characterAppearance, setCharacterAppearance,
    disabledSections, toggleDisabledSection,
    clockFormat, setClockFormat,
    gymExperience, setGymExperience,
    runExperience, setRunExperience,
    bodyCompositionLog,
  } = useGameStore();

  const handleSignOut = async () => {
    const { signOut } = await import('firebase/auth');
    const { auth } = await import('@/lib/firebase');
    await signOut(auth);
  };

  const [portalLoading, setPortalLoading] = useState(false);
  const handleManageSubscription = async () => {
    const { auth } = await import('@/lib/firebase');
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    setPortalLoading(true);
    try {
      const res  = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      console.log('[portal] response:', JSON.stringify(data));
      if (data.url) window.location.href = data.url;
      else alert(`Portal error: ${data.error || 'No URL returned'}`);
    } catch (e) {
      console.error('[portal] error:', e);
      alert(`Portal error: ${e}`);
    }
    setPortalLoading(false);
  };

  const picRef = useRef<HTMLInputElement>(null);

  const [nameVal,      setNameVal]      = useState(userName);
  const [nameError,    setNameError]    = useState('');
  const [nameChecking, setNameChecking] = useState(false);
  const [symVal,       setSymVal]       = useState(currencySymbol);
  const [goalVal,      setGoalVal]      = useState(String(savingsGoal));
  const [ageVal,       setAgeVal]       = useState(String(characterAppearance.age ?? ''));
  const [heightVal,    setHeightVal]    = useState(String(characterAppearance.height ?? ''));

  // Weight displayed in chosen unit
  // Weight displayed in chosen unit
  const initWeight = (() => {
    const kg = characterAppearance.startingWeight ?? 0;
    if (weightUnit === 'st_lbs') { const { st, lbs } = kgToStLbs(kg); return { st: String(st), lbs: String(lbs) }; }
    if (weightUnit === 'lbs') return { singleLbs: String(kgToLbs(kg)) };
    return { kg: String(kg) };
  })();
  const [weightKgVal,     setWeightKgVal]     = useState(initWeight.kg ?? '');
  const [weightStVal,     setWeightStVal]     = useState(initWeight.st ?? '');
  const [weightLbsVal,    setWeightLbsVal]    = useState(initWeight.lbs ?? '');
  const [weightSingleLbs, setWeightSingleLbs] = useState(initWeight.singleLbs ?? '');

  const saveWeight = () => {
    if (weightUnit === 'kg') {
      const v = parseFloat(weightKgVal);
      if (!isNaN(v) && v > 0) setCharacterAppearance({ ...characterAppearance, startingWeight: v });
    } else if (weightUnit === 'lbs') {
      const v = parseInt(weightSingleLbs);
      if (!isNaN(v) && v > 0) setCharacterAppearance({ ...characterAppearance, startingWeight: lbsToKg(v) });
    } else {
      const st = parseInt(weightStVal); const lbs = parseInt(weightLbsVal);
      if (!isNaN(st) && !isNaN(lbs)) setCharacterAppearance({ ...characterAppearance, startingWeight: stLbsToKg(st, lbs) });
    }
  };

  const handleNameSave = async () => {
    const trimmed = nameVal.trim();
    if (!trimmed || trimmed === userName) { setUserName(trimmed); return; }
    setNameChecking(true); setNameError('');
    const { auth } = await import('@/lib/firebase');
    const uid = auth.currentUser?.uid ?? '';
    const available = await checkUsernameAvailable(trimmed, uid);
    setNameChecking(false);
    if (!available) { setNameError('Username already taken — try another'); return; }
    setUserName(trimmed);
  };

  const handlePicUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const dataUrl = await resizeImageToBase64(file, 200);
      setProfilePicUrl(dataUrl);
    } catch { /* ignore */ }
  };

  const handleSectionToggle = (id: string, isFinance: boolean, hidden: boolean) => {
    if (isFinance) {
      if (hidden) {
        if (disabledSections.includes('finance')) toggleDisabledSection('finance');
        if (disabledSections.includes('vices')) toggleDisabledSection('vices');
        if (hiddenSections.includes('vices')) toggleHiddenSection('vices');
      } else {
        toggleHiddenSection('vices');
      }
    } else {
      toggleHiddenSection(id);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-ql text-xl font-bold">Settings</h2>
        <p className="text-ql-3 text-xs mt-0.5">Customise your GAINN experience</p>
      </div>

      {/* ── Colour Scheme — swipe carousel ─────────────────────── */}
      <ThemeCarousel theme={theme} setTheme={setTheme} />

      {/* ── Sections ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-ql text-sm font-semibold">Sections</p>
          <p className="text-ql-3 text-xs mt-0.5">Turn off sections you don't want to see</p>
        </div>
        <div className="bg-ql-surface rounded-2xl border border-ql overflow-hidden">
          {ALL_SECTIONS.map((s, i) => {
            const disabled = disabledSections.includes(s.id);
            return (
              <div
                key={s.id}
                onClick={() => toggleDisabledSection(s.id)}
                className={`flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-ql-surface2 transition-colors ${i < ALL_SECTIONS.length - 1 ? 'border-b border-ql' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{s.icon}</span>
                  <div className="text-left">
                    <span className={`text-sm font-medium ${disabled ? 'text-ql-3 line-through' : 'text-ql'}`}>{s.label}</span>
                    <p className="text-ql-3 text-[10px] mt-0.5">{s.desc}</p>
                  </div>
                </div>
                <Toggle on={!disabled} onToggle={() => toggleDisabledSection(s.id)} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Visible Sections ─────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-ql text-sm font-semibold">Visible Sections</p>
          <p className="text-ql-3 text-xs mt-0.5">Choose which tabs appear in the navigation bar</p>
        </div>
        <div className="bg-ql-surface rounded-2xl border border-ql overflow-hidden">
          {TOGGLEABLE_SECTIONS.map((s, i) => {
            // Finance tab is actually hidden if EITHER hiddenSections OR both disabledSections block it
            const isFinance = s.id === 'vices';
            const hidden = isFinance
              ? hiddenSections.includes('vices') || (disabledSections.includes('finance') && disabledSections.includes('vices'))
              : hiddenSections.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => handleSectionToggle(s.id, isFinance, hidden)}
                className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-ql-surface2 ${i < TOGGLEABLE_SECTIONS.length - 1 ? 'border-b border-ql' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{s.icon}</span>
                  <span className={`text-sm font-medium ${hidden ? 'text-ql-3 line-through' : 'text-ql'}`}>{s.label}</span>
                </div>
                <Toggle on={!hidden} onToggle={() => handleSectionToggle(s.id, isFinance, hidden)} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Profile ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <p className="text-ql text-sm font-semibold">Profile</p>

        {/* Avatar */}
        <button
          onClick={() => picRef.current?.click()}
          className="self-start flex items-center gap-3 bg-ql-surface border border-ql rounded-2xl px-4 py-3 hover:bg-ql-surface2 transition-colors"
        >
          {profilePicUrl
            ? <img src={profilePicUrl} alt="Profile" className="w-14 h-14 rounded-full object-cover" />
            : <div className="w-14 h-14 rounded-full bg-ql-surface2 border border-ql flex items-center justify-center text-2xl">👤</div>
          }
          <div className="text-left">
            <p className="text-ql text-sm font-semibold">{profilePicUrl ? 'Change photo' : 'Add profile photo'}</p>
            <p className="text-ql-3 text-xs mt-0.5">Tap to upload</p>
          </div>
        </button>
        <input ref={picRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handlePicUpload(f); e.target.value = ''; }} />

        <div className="bg-ql-surface rounded-2xl border border-ql overflow-hidden">
          {/* Username */}
          <div className="flex flex-col px-4 py-3.5 border-b border-ql gap-1">
            <div className="flex items-center gap-4">
              <span className="text-ql-3 text-sm w-24 shrink-0">Username</span>
              <input
                value={nameVal}
                onChange={e => { setNameVal(e.target.value); setNameError(''); }}
                onBlur={handleNameSave}
                onKeyDown={e => { if (e.key === 'Enter') { handleNameSave(); (e.target as HTMLInputElement).blur(); }}}
                placeholder="Choose a username"
                className="flex-1 bg-transparent text-ql text-sm outline-none text-right"
              />
              {nameChecking && <span className="text-ql-3 text-xs shrink-0">Checking…</span>}
            </div>
            {nameError && <p className="text-red-400 text-xs text-right">{nameError}</p>}
            <p className="text-ql-3 text-[10px]">Usernames must be unique across all GAINN users</p>
          </div>

          {/* Currency */}
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

          {/* Clock format */}
          <div className="flex items-center px-4 py-3.5 border-b border-ql gap-4">
            <span className="text-ql-3 text-sm w-24 shrink-0">Clock</span>
            <div className="flex-1 flex justify-end">
              <div className="flex gap-1 bg-ql-surface2 rounded-lg p-0.5 border border-ql">
                {(['12h', '24h'] as const).map(f => (
                  <button key={f} onClick={() => setClockFormat(f)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${clockFormat === f ? 'bg-ql-accent text-white' : 'text-ql-3'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Weight unit */}
          <div className="flex items-center px-4 py-3.5 border-b border-ql gap-4">
            <span className="text-ql-3 text-sm w-24 shrink-0">Weight unit</span>
            <div className="flex-1 flex justify-end">
              <div className="flex gap-1 bg-ql-surface2 rounded-lg p-0.5 border border-ql">
                {(['kg', 'lbs', 'st_lbs'] as const).map(u => (
                  <button key={u} onClick={() => {
                    const kg = characterAppearance.startingWeight ?? 0;
                    if (u === 'st_lbs') { const { st, lbs } = kgToStLbs(kg); setWeightStVal(String(st)); setWeightLbsVal(String(lbs)); }
                    else if (u === 'lbs') { setWeightSingleLbs(String(kgToLbs(kg))); }
                    else { setWeightKgVal(String(kg)); }
                    setWeightUnit(u);
                  }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${weightUnit === u ? 'bg-ql-accent text-white' : 'text-ql-3'}`}>
                    {u === 'kg' ? 'kg' : u === 'lbs' ? 'lbs' : 'st & lbs'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Savings target */}
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

          {/* Age */}
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

          {/* Weight */}
          <div className="flex items-center px-4 py-3.5 border-b border-ql gap-4">
            <span className="text-ql-3 text-sm w-24 shrink-0">Weight</span>
            {weightUnit === 'kg' ? (
              <input type="number" value={weightKgVal}
                onChange={e => setWeightKgVal(e.target.value)}
                onBlur={saveWeight}
                onKeyDown={e => { if (e.key === 'Enter') { saveWeight(); (e.target as HTMLInputElement).blur(); }}}
                placeholder="80"
                className="flex-1 bg-transparent text-ql text-sm outline-none text-right" />
            ) : weightUnit === 'lbs' ? (
              <div className="flex-1 flex items-center justify-end gap-2">
                <input type="number" value={weightSingleLbs}
                  onChange={e => setWeightSingleLbs(e.target.value)}
                  onBlur={saveWeight}
                  onKeyDown={e => { if (e.key === 'Enter') { saveWeight(); (e.target as HTMLInputElement).blur(); }}}
                  placeholder="176"
                  className="flex-1 bg-transparent text-ql text-sm outline-none text-right" />
                <span className="text-ql-3 text-xs">lbs</span>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-end gap-2">
                <input type="number" value={weightStVal}
                  onChange={e => setWeightStVal(e.target.value)}
                  onBlur={saveWeight}
                  placeholder="12"
                  className="w-14 bg-transparent text-ql text-sm outline-none text-right" />
                <span className="text-ql-3 text-xs">st</span>
                <input type="number" value={weightLbsVal}
                  onChange={e => setWeightLbsVal(e.target.value)}
                  onBlur={saveWeight}
                  placeholder="8"
                  className="w-10 bg-transparent text-ql text-sm outline-none text-right" />
                <span className="text-ql-3 text-xs">lbs</span>
              </div>
            )}
          </div>

          {/* Body Fat % */}
          {(() => {
            const latest = [...bodyCompositionLog].sort((a, b) => b.date.localeCompare(a.date))[0];
            const bfMid = latest && latest.bodyFatLow != null && latest.bodyFatHigh != null
              ? Math.round((latest.bodyFatLow + latest.bodyFatHigh) / 2)
              : null;
            return (
              <div className="px-4 py-3.5 border-b border-ql flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-ql-3 text-sm">Body Fat %</span>
                  {bfMid != null ? (
                    <span className="text-ql text-sm font-semibold tabular-nums">{bfMid}%</span>
                  ) : (
                    <span className="text-ql-3 text-xs">N/A</span>
                  )}
                </div>
                {bfMid != null ? (
                  <>
                    <input
                      type="range"
                      min={3}
                      max={50}
                      value={bfMid}
                      readOnly
                      className="ql-slider w-full pointer-events-none"
                      style={{ '--slider-pct': `${((bfMid - 3) / 47) * 100}%` } as React.CSSProperties}
                    />
                    <div className="flex justify-between text-[10px] text-ql-3">
                      <span>3% (Elite)</span>
                      <span>{latest!.bodyFatLow}–{latest!.bodyFatHigh}% range</span>
                      <span>50%</span>
                    </div>
                    <p className="text-ql-3 text-[11px]">From your last body scan · {latest!.date}</p>
                  </>
                ) : (
                  <p className="text-ql-3 text-[11px] leading-relaxed">
                    No body fat data yet. Ask GAINN AI — tap the chat icon and say &quot;do a body scan&quot; to get an estimate.
                  </p>
                )}
              </div>
            );
          })()}

          {/* Height */}
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
      {/* ── GAINN AI ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <p className="text-ql text-sm font-semibold">GAINN AI</p>
        <div className="bg-ql-surface rounded-2xl border border-ql p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-ql text-sm font-medium">Coaching Style</p>
              <p className="text-ql-3 text-xs mt-0.5">
                {aiIntensity <= 20 ? '🤗 Supportive'
                  : aiIntensity <= 40 ? '😊 Encouraging'
                  : aiIntensity <= 60 ? '⚖️ Balanced'
                  : aiIntensity <= 80 ? '💪 Tough Love'
                  : '🎖️ Drill Sergeant'}
              </p>
            </div>
            <span className="text-ql-3 text-xs tabular-nums">{aiIntensity}</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={aiIntensity}
            onChange={e => setAiIntensity(Number(e.target.value))}
            className="ql-slider w-full"
            style={{ '--slider-pct': `${((aiIntensity - 1) / 99) * 100}%` } as React.CSSProperties}
          />
          <div className="flex justify-between text-[10px] text-ql-3">
            <span>Supportive</span>
            <span>Balanced</span>
            <span>Drill Sergeant</span>
          </div>
          <p className="text-ql-3 text-[11px] leading-relaxed">
            {aiIntensity <= 20 ? 'Gentle and non-judgmental. Celebrates small wins, no pressure.'
              : aiIntensity <= 40 ? 'Positive and motivating. Gentle nudges when you miss days.'
              : aiIntensity <= 60 ? 'Honest and direct. Mix of encouragement and accountability.'
              : aiIntensity <= 80 ? 'Pushes hard. Calls out missed goals. No excuses, but still kind.'
              : 'Maximum intensity. Military-style accountability. Zero tolerance for excuses.'}
          </p>
        </div>
      </div>

      {/* ── Training Background ─────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <p className="text-ql text-sm font-semibold">Training Background</p>
        <div className="bg-ql-surface rounded-2xl border border-ql overflow-hidden">
          {/* Gym experience */}
          {(() => {
            const gymOpts = ['Brand new', '< 6 months', '6–12 months', '1–2 years', '2–4 years', '4+ years'];
            const gymIdx = Math.max(0, gymOpts.indexOf(gymExperience));
            return (
              <div className="px-4 py-3.5 border-b border-ql">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-ql text-sm font-medium">🏋️ Gym Experience</p>
                  <span className="text-ql-accent text-xs font-semibold">{gymOpts[gymIdx]}</span>
                </div>
                <input type="range" min={0} max={gymOpts.length - 1} step={1} value={gymIdx}
                  onChange={e => setGymExperience(gymOpts[Number(e.target.value)])}
                  className="ql-slider w-full"
                  style={{ '--slider-pct': `${(gymIdx / (gymOpts.length - 1)) * 100}%` } as React.CSSProperties}
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-ql-3 text-[10px]">Brand new</span>
                  <span className="text-ql-3 text-[10px]">4+ years</span>
                </div>
              </div>
            );
          })()}
          {/* Running experience */}
          {(() => {
            const runOpts = ['Never run', '< 6 months', '6–12 months', '1–2 years', '2–4 years', '4+ years'];
            const runIdx = Math.max(0, runOpts.indexOf(runExperience));
            return (
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-ql text-sm font-medium">🏃 Running Experience</p>
                  <span className="text-ql-accent text-xs font-semibold">{runOpts[runIdx]}</span>
                </div>
                <input type="range" min={0} max={runOpts.length - 1} step={1} value={runIdx}
                  onChange={e => setRunExperience(runOpts[Number(e.target.value)])}
                  className="ql-slider w-full"
                  style={{ '--slider-pct': `${(runIdx / (runOpts.length - 1)) * 100}%` } as React.CSSProperties}
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-ql-3 text-[10px]">Never run</span>
                  <span className="text-ql-3 text-[10px]">4+ years</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Account ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <p className="text-ql text-sm font-semibold">Account</p>
        <div className="bg-ql-surface rounded-2xl border border-ql overflow-hidden">
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-ql-surface2 transition-colors border-b border-ql"
          >
            <div>
              <span className="text-ql text-sm font-medium">Manage Subscription</span>
              <p className="text-ql-3 text-[11px] mt-0.5">Cancel anytime — access continues until end of billing period</p>
            </div>
            <span className="text-ql-3 text-base">{portalLoading ? '…' : '→'}</span>
          </button>
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
