'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Theme, ActivityLevel } from '@/types';

const CURRENCIES = [
  { country: 'United Kingdom', flag: '🇬🇧', symbol: '£' },
  { country: 'United States',  flag: '🇺🇸', symbol: '$' },
  { country: 'Euro Zone',      flag: '🇪🇺', symbol: '€' },
  { country: 'Australia',      flag: '🇦🇺', symbol: 'A$' },
  { country: 'Canada',         flag: '🇨🇦', symbol: 'C$' },
  { country: 'Japan',          flag: '🇯🇵', symbol: '¥' },
  { country: 'Switzerland',    flag: '🇨🇭', symbol: 'Fr' },
  { country: 'Norway',         flag: '🇳🇴', symbol: 'kr' },
  { country: 'Sweden',         flag: '🇸🇪', symbol: 'kr' },
  { country: 'New Zealand',    flag: '🇳🇿', symbol: 'NZ$' },
  { country: 'South Africa',   flag: '🇿🇦', symbol: 'R' },
  { country: 'India',          flag: '🇮🇳', symbol: '₹' },
  { country: 'Brazil',         flag: '🇧🇷', symbol: 'R$' },
  { country: 'Mexico',         flag: '🇲🇽', symbol: '$' },
  { country: 'Singapore',      flag: '🇸🇬', symbol: 'S$' },
  { country: 'UAE',            flag: '🇦🇪', symbol: 'د.إ' },
  { country: 'Poland',         flag: '🇵🇱', symbol: 'zł' },
  { country: 'Hong Kong',      flag: '🇭🇰', symbol: 'HK$' },
  { country: 'South Korea',    flag: '🇰🇷', symbol: '₩' },
  { country: 'Denmark',        flag: '🇩🇰', symbol: 'kr' },
];

const STEP_GOALS = [
  { id: 'save_money',     label: 'Save Money',      emoji: '💰' },
  { id: 'get_fit',        label: 'Get Fit',          emoji: '🏃' },
  { id: 'quit_vices',     label: 'Cut Bad Habits',  emoji: '🚫' },
  { id: 'wake_early',     label: 'Wake Earlier',    emoji: '🌅' },
  { id: 'build_strength', label: 'Build Strength',  emoji: '💪' },
  { id: 'track_life',     label: 'Track Everything',emoji: '📊' },
];

const THEMES: { id: Theme; name: string; desc: string; bg: string; surface: string; accent: string; text: string }[] = [
  {
    id: 'dark',
    name: 'Dark',
    desc: 'Deep navy, easy on the eyes',
    bg: '#08080f',
    surface: '#13131f',
    accent: '#7c3aed',
    text: '#f0f0f8',
  },
  {
    id: 'white',
    name: 'Light',
    desc: 'Clean and minimal',
    bg: '#f5f5f7',
    surface: '#ffffff',
    accent: '#7c3aed',
    text: '#1d1d1f',
  },
  {
    id: 'pink',
    name: 'Pink',
    desc: 'Soft rose pastels',
    bg: '#fdf2f7',
    surface: '#ffffff',
    accent: '#db2777',
    text: '#3b0a20',
  },
  {
    id: 'blue',
    name: 'Blue',
    desc: 'Cool pastel blue',
    bg: '#f0f6ff',
    surface: '#ffffff',
    accent: '#2563eb',
    text: '#0f2a5e',
  },
  {
    id: 'green',
    name: 'Forest',
    desc: 'Calm pastel green',
    bg: '#f0fdf5',
    surface: '#ffffff',
    accent: '#16a34a',
    text: '#052e16',
  },
];

const ACTIVITY_OPTIONS: { id: ActivityLevel; label: string; desc: string; emoji: string }[] = [
  { id: 'sedentary',   label: 'Sedentary',       desc: 'Desk job, little exercise',           emoji: '🛋️' },
  { id: 'light',       label: 'Lightly Active',  desc: '1–3 workouts/week',                   emoji: '🚶' },
  { id: 'moderate',    label: 'Moderately Active',desc: '3–5 workouts/week',                  emoji: '🏃' },
  { id: 'active',      label: 'Very Active',     desc: '6–7 workouts/week',                   emoji: '💪' },
  { id: 'very_active', label: 'Athlete',         desc: 'Twice daily or physical job',         emoji: '🏆' },
];

export default function OnboardingFlow() {
  const { setUserName, setCurrencySymbol, setSavingsGoal, setWakeTarget, setBedTime, setStepGoal, setHasOnboarded, setTheme, setCharacterAppearance } = useGameStore();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [savingsInput, setSavingsInput] = useState('500');
  const [wakeInput, setWakeInput] = useState('07:00');
  const [bedInput,  setBedInput]  = useState('23:00');
  const [stepInput, setStepInput] = useState('10000');
  const [showMore,  setShowMore]  = useState(false);
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [selectedTheme, setSelectedTheme] = useState<Theme>('dark');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  // Body stats step
  const [heightVal, setHeightVal] = useState('175');
  const [weightVal, setWeightVal] = useState('75');
  const [ageVal,    setAgeVal]    = useState('25');
  const [activity,  setActivity]  = useState<ActivityLevel>('moderate');

  const TOTAL_STEPS = 5;

  const goTo = (next: number) => {
    if (animating) return;
    setDirection(next > step ? 'forward' : 'back');
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 180);
  };

  const finish = () => {
    setUserName(name.trim() || 'Hero');
    setCurrencySymbol(currency.symbol);
    const val = parseFloat(savingsInput);
    if (!isNaN(val) && val > 0) setSavingsGoal(val);
    setWakeTarget(wakeInput);
    setBedTime(bedInput);
    const steps = parseInt(stepInput);
    if (!isNaN(steps) && steps > 0) setStepGoal(steps);
    setTheme(selectedTheme);
    setCharacterAppearance({
      height: parseInt(heightVal) || 175,
      startingWeight: parseInt(weightVal) || 75,
      age: parseInt(ageVal) || 25,
      activityLevel: activity,
    });
    setHasOnboarded();
  };

  const toggleGoal = (id: string) =>
    setGoals((g) => g.includes(id) ? g.filter((x) => x !== id) : [...g, id]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      data-theme="dark"
      style={{
        colorScheme: 'dark',
        backgroundColor: step === 4 ? THEMES.find((t) => t.id === selectedTheme)?.bg ?? '#08080f' : '#08080f',
        transition: 'background-color 0.4s ease',
      }}
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-white/5">
        <div
          className="h-full bg-white/30 transition-all duration-500"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-2 pt-6 pb-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === step ? 'w-5 h-1.5 bg-white' : i < step ? 'w-1.5 h-1.5 bg-white/40' : 'w-1.5 h-1.5 bg-white/15'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div
        className="flex-1 flex flex-col px-6 pt-8 pb-6 max-w-sm mx-auto w-full overflow-y-auto"
        style={{
          opacity: animating ? 0 : 1,
          transform: animating
            ? `translateX(${direction === 'forward' ? '20px' : '-20px'})`
            : 'translateX(0)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}
      >
        {/* Step 0 — Account */}
        {step === 0 && (
          <>
            <div className="text-5xl mb-6">👋</div>
            <h1 className="text-white text-3xl font-bold mb-2">Welcome, Hero</h1>
            <p className="text-white/50 text-sm mb-8">
              QuestLog AI turns your real life into an RPG. Let's get you set up.
            </p>

            <label className="text-white/60 text-xs font-medium mb-2 block">Your name</label>
            <input
              type="text"
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && goTo(1)}
              autoFocus
              className="w-full bg-white/8 border border-white/10 rounded-2xl px-4 py-4 text-white text-lg outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
            />

            <div className="mt-4 mb-8">
              <label className="text-white/60 text-xs font-medium mb-3 block">What are you here for?</label>
              <div className="grid grid-cols-2 gap-2">
                {STEP_GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleGoal(g.id)}
                    className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl border text-left transition-all ${
                      goals.includes(g.id)
                        ? 'bg-white/15 border-white/30 text-white'
                        : 'bg-white/5 border-white/8 text-white/50'
                    }`}
                  >
                    <span className="text-xl">{g.emoji}</span>
                    <span className="text-xs font-medium">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto">
              <button
                onClick={() => goTo(1)}
                className="w-full py-4 bg-white text-[#08080f] font-bold rounded-2xl text-base transition-opacity hover:opacity-90"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 1 — Goals */}
        {step === 1 && (
          <>
            <div className="text-5xl mb-6">🎯</div>
            <h1 className="text-white text-3xl font-bold mb-2">
              Set Your Goals{name ? `, ${name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-white/50 text-sm mb-8">
              These give you targets to track on your home screen.
            </p>

            <div className="flex flex-col gap-4 mb-8">
              <div>
                <label className="text-white/60 text-xs font-medium mb-2 block">
                  Yearly savings target
                </label>
                <div className="flex items-center bg-white/8 border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/30 transition-colors">
                  <span className="text-white/40 text-lg pl-4 pr-1">£</span>
                  <input
                    type="number"
                    placeholder="500"
                    value={savingsInput}
                    onChange={(e) => setSavingsInput(e.target.value)}
                    className="flex-1 bg-transparent py-4 pr-4 text-white text-lg outline-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <p className="text-white/30 text-xs mt-1.5">We'll track money saved from skipping vices</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 text-xs font-medium mb-2 block">Wake time</label>
                  <input
                    type="time"
                    value={wakeInput}
                    onChange={(e) => setWakeInput(e.target.value)}
                    className="w-full bg-white/8 border border-white/10 rounded-2xl px-4 py-4 text-white text-lg outline-none focus:border-white/30 transition-colors"
                    style={{ colorScheme: 'dark' }}
                  />
                  <p className="text-white/30 text-xs mt-1.5">Check in each morning</p>
                </div>
                <div>
                  <label className="text-white/60 text-xs font-medium mb-2 block">Bedtime</label>
                  <input
                    type="time"
                    value={bedInput}
                    onChange={(e) => setBedInput(e.target.value)}
                    className="w-full bg-white/8 border border-white/10 rounded-2xl px-4 py-4 text-white text-lg outline-none focus:border-white/30 transition-colors"
                    style={{ colorScheme: 'dark' }}
                  />
                  <p className="text-white/30 text-xs mt-1.5">Target sleep time</p>
                </div>
              </div>
            </div>

            {/* More section */}
            <button
              onClick={() => setShowMore(m => !m)}
              className="flex items-center gap-2 text-white/40 text-sm font-medium mb-2"
            >
              <span>{showMore ? '▲' : '▼'}</span>
              <span>More options</span>
            </button>

            {showMore && (
              <div className="flex flex-col gap-4 mb-8 border border-white/10 rounded-2xl p-4 bg-white/5">
                <div>
                  <label className="text-white/60 text-xs font-medium mb-2 block">Daily step goal</label>
                  <div className="flex items-center bg-white/8 border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/30 transition-colors">
                    <span className="text-white/40 text-base pl-4 pr-2">👟</span>
                    <input
                      type="number"
                      placeholder="10000"
                      value={stepInput}
                      onChange={(e) => setStepInput(e.target.value)}
                      className="flex-1 bg-transparent py-3.5 pr-4 text-white text-lg outline-none"
                      style={{ colorScheme: 'dark' }}
                    />
                    <span className="text-white/30 text-sm pr-4">steps</span>
                  </div>
                </div>
              </div>
            )}


            <div className="mt-auto flex gap-3">
              <button onClick={() => goTo(0)} className="px-5 py-4 bg-white/8 text-white/60 font-medium rounded-2xl text-sm">
                Back
              </button>
              <button
                onClick={() => goTo(2)}
                className="flex-1 py-4 bg-white text-[#08080f] font-bold rounded-2xl text-base hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
            </div>
          </>
        )}

          {/* Step 2 — Body & Activity */}
        {step === 2 && (
          <>
            <div className="text-5xl mb-6">📏</div>
            <h1 className="text-white text-3xl font-bold mb-2">About You</h1>
            <p className="text-white/50 text-sm mb-6">
              Used to suggest personalised calorie and macro targets.
            </p>

            <div className="flex flex-col gap-4 mb-4">
              {/* Height / Weight / Age */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Height', unit: 'cm', val: heightVal, set: setHeightVal, min: 140, max: 220 },
                  { label: 'Weight', unit: 'kg', val: weightVal, set: setWeightVal, min: 30,  max: 200 },
                  { label: 'Age',    unit: 'yr', val: ageVal,    set: setAgeVal,    min: 13,  max: 90  },
                ].map(({ label, unit, val, set, min, max }) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <label className="text-white/50 text-xs font-medium">{label}</label>
                    <div className="flex flex-col items-center bg-white/8 border border-white/10 rounded-2xl py-2 gap-1">
                      <button
                        onClick={() => set(String(Math.min(max, (parseInt(val) || 0) + 1)))}
                        className="text-white/40 text-lg w-full text-center leading-none py-1"
                      >▲</button>
                      <div className="text-center">
                        <span className="text-white text-xl font-bold tabular-nums">{val}</span>
                        <span className="text-white/40 text-[10px] block">{unit}</span>
                      </div>
                      <button
                        onClick={() => set(String(Math.max(min, (parseInt(val) || 0) - 1)))}
                        className="text-white/40 text-lg w-full text-center leading-none py-1"
                      >▼</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Activity Level */}
              <div>
                <label className="text-white/50 text-xs font-medium mb-2 block">Activity Level</label>
                <div className="flex flex-col gap-2">
                  {ACTIVITY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setActivity(opt.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
                        activity === opt.id
                          ? 'bg-white/15 border-white/30'
                          : 'bg-white/5 border-white/8'
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{opt.label}</p>
                        <p className="text-white/40 text-xs">{opt.desc}</p>
                      </div>
                      {activity === opt.id && <span className="text-white text-sm">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto flex gap-3 pt-2">
              <button onClick={() => goTo(1)} className="px-5 py-4 bg-white/8 text-white/60 font-medium rounded-2xl text-sm">
                Back
              </button>
              <button
                onClick={() => goTo(3)}
                className="flex-1 py-4 bg-white text-[#08080f] font-bold rounded-2xl text-base hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 3 — Country / Currency */}
        {step === 3 && (
          <>
            <div className="text-5xl mb-6">🌍</div>
            <h1 className="text-white text-3xl font-bold mb-2">Your Location</h1>
            <p className="text-white/50 text-sm mb-6">
              We'll display your savings in your local currency.
            </p>

            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              <div className="grid grid-cols-1 gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={`${c.country}-${c.symbol}`}
                    onClick={() => setCurrency(c)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left ${
                      currency.country === c.country
                        ? 'bg-white/15 border-white/30'
                        : 'bg-white/5 border-white/8 hover:bg-white/8'
                    }`}
                  >
                    <span className="text-2xl">{c.flag}</span>
                    <span className="text-white text-sm font-medium flex-1">{c.country}</span>
                    <span className={`text-sm font-bold tabular-nums ${currency.country === c.country ? 'text-white' : 'text-white/40'}`}>
                      {c.symbol}
                    </span>
                    {currency.country === c.country && <span className="text-white text-sm">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button onClick={() => goTo(2)} className="px-5 py-4 bg-white/8 text-white/60 font-medium rounded-2xl text-sm">
                Back
              </button>
              <button
                onClick={() => goTo(4)}
                className="flex-1 py-4 bg-white text-[#08080f] font-bold rounded-2xl text-base hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 4 — Colour scheme */}
        {step === 4 && (() => {
          const active = THEMES.find((t) => t.id === selectedTheme)!;
          const isDark = selectedTheme === 'dark';
          const headingColor = isDark ? '#ffffff' : active.text;
          const subColor = isDark ? 'rgba(255,255,255,0.5)' : `${active.text}99`;
          const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : `${active.accent}22`;
          const cardActiveBorder = isDark ? 'rgba(255,255,255,0.4)' : active.accent;
          const cardActiveBg = isDark ? 'rgba(255,255,255,0.10)' : `${active.accent}14`;
          const btnBg = isDark ? '#ffffff' : active.text;
          const btnText = isDark ? '#08080f' : '#ffffff';
          const backBg = isDark ? 'rgba(255,255,255,0.08)' : `${active.text}12`;
          const backText = isDark ? 'rgba(255,255,255,0.6)' : `${active.text}99`;

          return (
            <>
              <div className="text-5xl mb-6">🎨</div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: headingColor }}>Pick Your Theme</h1>
              <p className="text-sm mb-6" style={{ color: subColor }}>
                Choose a look that feels like you. You can change it anytime.
              </p>

              <div className="flex flex-col gap-3 flex-1">
                {THEMES.map((t) => {
                  const isActive = selectedTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTheme(t.id)}
                      className="flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all text-left"
                      style={{
                        borderColor: isActive ? cardActiveBorder : cardBorder,
                        background: isActive ? cardActiveBg : 'transparent',
                      }}
                    >
                      {/* Mini preview */}
                      <div
                        className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden"
                        style={{ background: t.bg, border: `1.5px solid rgba(128,128,128,0.2)` }}
                      >
                        <div className="w-full h-full flex flex-col p-1.5 gap-1">
                          <div className="rounded-md flex-1" style={{ background: t.surface, opacity: 0.9 }} />
                          <div className="flex gap-1">
                            <div className="rounded h-1.5 flex-1" style={{ background: t.accent }} />
                            <div className="rounded h-1.5 w-4" style={{ background: t.text, opacity: 0.2 }} />
                          </div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: headingColor }}>{t.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: subColor }}>{t.desc}</p>
                      </div>

                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                        style={{
                          borderColor: isActive ? cardActiveBorder : cardBorder,
                          background: isActive ? cardActiveBorder : 'transparent',
                        }}
                      >
                        {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => goTo(3)}
                  className="px-5 py-4 font-medium rounded-2xl text-sm"
                  style={{ background: backBg, color: backText }}
                >
                  Back
                </button>
                <button
                  onClick={finish}
                  className="flex-1 py-4 font-bold rounded-2xl text-base hover:opacity-90 transition-opacity"
                  style={{ background: btnBg, color: btnText }}
                >
                  Start Quest →
                </button>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
