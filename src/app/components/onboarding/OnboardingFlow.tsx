'use client';

import { useState, useMemo, useEffect } from 'react';
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

const GOALS = [
  { id: 'save_money',     label: 'Save Money',       emoji: '💰', desc: 'Track savings & cut spending' },
  { id: 'get_fit',        label: 'Get Fit',           emoji: '🏃', desc: 'Steps, workouts & calories' },
  { id: 'quit_vices',     label: 'Cut Bad Habits',   emoji: '🚫', desc: 'Reduce vices & save money' },
  { id: 'wake_early',     label: 'Wake Earlier',     emoji: '🌅', desc: 'Build a morning routine' },
  { id: 'build_strength', label: 'Build Strength',   emoji: '💪', desc: 'Gym plans & body stats' },
  { id: 'nutrition',      label: 'Eat Better',        emoji: '🥗', desc: 'Lose weight & track food' },
  { id: 'track_life',     label: 'Track Everything', emoji: '📊', desc: 'Full life dashboard' },
];

const NUTRITION_GOALS = [
  { id: 'lose_weight',    label: 'Lose Weight',         emoji: '⚖️',  desc: 'Calorie tracking & targets' },
  { id: 'eat_healthier',  label: 'Eat Healthier',       emoji: '🥦',  desc: 'Better food choices daily' },
  { id: 'track_macros',   label: 'Track Macros',        emoji: '📊',  desc: 'Protein, carbs & fat goals' },
  { id: 'drink_more',     label: 'Drink More Water',    emoji: '💧',  desc: 'Daily hydration tracking' },
  { id: 'build_muscle',   label: 'Build Muscle',        emoji: '💪',  desc: 'High protein diet support' },
  { id: 'meal_plan',      label: 'Plan My Meals',       emoji: '📋',  desc: 'Weekly meal planning' },
];

const THEMES: { id: Theme; name: string; desc: string; bg: string; surface: string; accent: string; text: string }[] = [
  { id: 'dark',  name: 'Dark',   desc: 'Deep navy, easy on the eyes', bg: '#08080f', surface: '#13131f', accent: '#7c3aed', text: '#f0f0f8' },
  { id: 'white', name: 'Light',  desc: 'Clean and minimal',           bg: '#f5f5f7', surface: '#ffffff', accent: '#7c3aed', text: '#1d1d1f' },
  { id: 'pink',  name: 'Pink',   desc: 'Soft rose pastels',           bg: '#fdf2f7', surface: '#ffffff', accent: '#db2777', text: '#3b0a20' },
  { id: 'blue',  name: 'Blue',   desc: 'Cool pastel blue',            bg: '#f0f6ff', surface: '#ffffff', accent: '#2563eb', text: '#0f2a5e' },
  { id: 'green', name: 'Forest', desc: 'Calm pastel green',           bg: '#f0fdf5', surface: '#ffffff', accent: '#16a34a', text: '#052e16' },
];

const ACTIVITY_OPTIONS: { id: ActivityLevel; label: string; desc: string; emoji: string }[] = [
  { id: 'sedentary',   label: 'Sedentary',         desc: 'Desk job, little exercise',    emoji: '🛋️' },
  { id: 'light',       label: 'Lightly Active',    desc: '1–3 workouts/week',            emoji: '🚶' },
  { id: 'moderate',    label: 'Moderately Active', desc: '3–5 workouts/week',            emoji: '🏃' },
  { id: 'active',      label: 'Very Active',       desc: '6–7 workouts/week',            emoji: '💪' },
  { id: 'very_active', label: 'Athlete',           desc: 'Twice daily or physical job',  emoji: '🏆' },
];

type StepId = 'welcome' | 'money' | 'sleep' | 'fitness' | 'gym_exp' | 'run_exp' | 'nutrition' | 'theme' | 'sections' | 'coaching' | 'feedback' | 'gainn_ai' | 'terms';

const ONBOARDING_SECTIONS: { id: string; label: string; icon: string; desc: string }[] = [
  { id: 'food',       label: 'Food',       icon: '🥗', desc: 'Meal logging & nutrition'         },
  { id: 'hydration',  label: 'Hydration',  icon: '💧', desc: 'Daily water tracking'             },
  { id: 'sleep',      label: 'Sleep',      icon: '🌙', desc: 'Sleep log & bedtime tracker'      },
  { id: 'wake',       label: 'Wake Up',    icon: '🌅', desc: 'Morning check-in & wake quest'    },
  { id: 'calendar',   label: 'Calendar',   icon: '📅', desc: 'Events & scheduling'              },
  { id: 'vices',      label: 'Vices',      icon: '🚫', desc: 'Bad habit tracker'                },
  { id: 'finance',    label: 'Finance',    icon: '💰', desc: 'Budget & spending tracker'        },
  { id: 'habits',     label: 'Habits',     icon: '✅', desc: 'Daily habit tracking'             },
  { id: 'plans',      label: 'Plans',      icon: '🏋️', desc: 'Workout plans & programmes'       },
  { id: 'steps',      label: 'Steps',      icon: '👟', desc: 'Daily step counting'              },
  { id: 'stats',      label: 'Stats',      icon: '📊', desc: 'Performance stats & metrics'      },
  { id: 'track',      label: 'GPS Track',  icon: '🗺️', desc: 'GPS activity recording'           },
];

export default function OnboardingFlow() {
  const { setUserName, setCurrencySymbol, setSavingsGoal, setWakeTarget, setBedTime, setStepGoal, setHasOnboarded, setTheme, setCharacterAppearance, setFinancialMode, setDisabledSections, setPrimaryGoals, logWeight, setAiIntensity, setGymExperience, setRunExperience } = useGameStore();

  const [stepIndex,         setStepIndex]         = useState(0);
  const [name,              setName]              = useState('');
  const [goals,             setGoals]             = useState<string[]>([]);
  const [savingsInput,      setSavingsInput]      = useState('500');
  const [currency,          setCurrency]          = useState(CURRENCIES[0]);
  const [wakeInput,         setWakeInput]         = useState('07:00');
  const [bedInput,          setBedInput]          = useState('23:00');
  const [stepInput,         setStepInput]         = useState('10000');
  const [heightVal,         setHeightVal]         = useState('175');
  const [weightVal,         setWeightVal]         = useState('75');
  const [ageVal,            setAgeVal]            = useState('25');
  const [activity,          setActivity]          = useState<ActivityLevel>('moderate');
  const [weightUnit,        setWeightUnit]        = useState<'kg' | 'lbs' | 'st_lbs'>('kg');
  const [weightLbsPart,     setWeightLbsPart]     = useState('0');
  const [selectedTheme,     setSelectedTheme]     = useState<Theme>('dark');
  const [disabledOnboarding, setDisabledOnboarding] = useState<string[]>([]);
  const [direction,         setDirection]         = useState<'forward' | 'back'>('forward');
  const [animating,         setAnimating]         = useState(false);
  const [countdown,         setCountdown]         = useState(5);
  const [termsAccepted,     setTermsAccepted]     = useState(false);
  const [nutritionGoals,    setNutritionGoals]    = useState<string[]>([]);
  const [gymExp,            setGymExp]            = useState('');
  const [runExp,            setRunExp]            = useState('');

  // Compute dynamic steps based on selected goals
  const steps: StepId[] = useMemo(() => {
    const list: StepId[] = ['welcome'];
    if (goals.includes('save_money')) list.push('money');
    if (goals.includes('wake_early')) list.push('sleep');
    if (goals.includes('get_fit') || goals.includes('build_strength') || goals.includes('track_life')) list.push('fitness');
    if (goals.includes('build_strength') || goals.includes('track_life')) list.push('gym_exp');
    if (goals.includes('get_fit') || goals.includes('track_life')) list.push('run_exp');
    if (goals.includes('nutrition')) list.push('nutrition');
    list.push('theme');
    list.push('sections');
    list.push('coaching');
    list.push('feedback');
    list.push('gainn_ai');
    list.push('terms');
    return list;
  }, [goals]);

  const currentStep = steps[stepIndex];
  const totalSteps  = steps.length;

  const goNext = () => {
    if (animating) return;
    if (stepIndex < steps.length - 1) {
      setDirection('forward');
      setAnimating(true);
      setTimeout(() => { setStepIndex(i => i + 1); setAnimating(false); }, 180);
    }
  };

  const goBack = () => {
    if (animating || stepIndex === 0) return;
    setDirection('back');
    setAnimating(true);
    setTimeout(() => { setStepIndex(i => i - 1); setAnimating(false); }, 180);
  };

  // When goals change on welcome step, reset stepIndex to 0 so steps array recomputes correctly
  const toggleGoal = (id: string) =>
    setGoals(g => g.includes(id) ? g.filter(x => x !== id) : [...g, id]);

  const finish = () => {
    setUserName(name.trim() || 'Hero');
    setCurrencySymbol(currency.symbol);
    const val = parseFloat(savingsInput);
    if (!isNaN(val) && val > 0) setSavingsGoal(val);
    setWakeTarget(wakeInput);
    setBedTime(bedInput);
    const s = parseInt(stepInput);
    if (!isNaN(s) && s > 0) setStepGoal(s);
    setTheme(selectedTheme);
    if (!goals.includes('save_money') && !goals.includes('quit_vices')) setFinancialMode(false);
    if (disabledOnboarding.length > 0) setDisabledSections(disabledOnboarding);
    const rawWeight = parseFloat(weightVal) || 75;
    const weightKg  = weightUnit === 'lbs' ? Math.round(rawWeight * 0.453592)
                    : weightUnit === 'st_lbs' ? Math.round(((rawWeight * 14) + (parseInt(weightLbsPart) || 0)) / 2.20462 * 10) / 10
                    : rawWeight;
    setCharacterAppearance({ height: parseInt(heightVal) || 175, startingWeight: weightKg, age: parseInt(ageVal) || 25, activityLevel: activity });
    // Map goal IDs to readable labels for AI context
    const GOAL_LABELS: Record<string, string> = {
      get_fit:        'Get Fitter',
      build_strength: 'Build Muscle',
      save_money:     'Save Money',
      quit_vices:     'Cut Bad Habits',
      wake_early:     'Sleep Better',
      track_life:     'Track My Life',
      nutrition:      'Eat Better',
    };
    setPrimaryGoals(goals.map(g => GOAL_LABELS[g] ?? g));
    if (gymExp) setGymExperience(gymExp);
    if (runExp) setRunExperience(runExp);
    // Log starting weight as the first data point
    const today = new Date().toISOString().slice(0, 10);
    if (weightKg > 0) logWeight(today, weightKg);
    setHasOnboarded();
  };

  // ── Auto-disable sections based on goals when sections step is reached ──
  useEffect(() => {
    if (currentStep !== 'sections') return;
    // Map each section to which goals enable it
    const SECTION_GOALS: Record<string, string[]> = {
      food:      ['nutrition', 'track_life'],
      hydration: ['nutrition', 'get_fit', 'track_life'],
      sleep:     ['wake_early', 'track_life'],
      wake:      ['wake_early', 'track_life'],
      calendar:  ['get_fit', 'build_strength', 'wake_early', 'track_life', 'save_money'],
      vices:     ['quit_vices', 'save_money', 'track_life'],
      finance:   ['save_money', 'quit_vices', 'track_life'],
      habits:    ['get_fit', 'build_strength', 'wake_early', 'quit_vices', 'track_life'],
      plans:     ['get_fit', 'build_strength', 'track_life'],
      steps:     ['get_fit', 'track_life'],
      stats:     ['get_fit', 'build_strength', 'track_life'],
      track:     ['get_fit', 'build_strength', 'track_life'],
    };
    const autoDisabled = ONBOARDING_SECTIONS
      .filter(s => !SECTION_GOALS[s.id]?.some(g => goals.includes(g)))
      .map(s => s.id);
    setDisabledOnboarding(autoDisabled);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // ── Countdown on feedback step (just enables the button, doesn't auto-advance) ──
  useEffect(() => {
    if (currentStep !== 'feedback') return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStep]);

  const isDark = selectedTheme === 'dark';
  const activeTheme = THEMES.find(t => t.id === selectedTheme)!;
  const bgColor = currentStep === 'theme'
    ? (isDark ? '#08080f' : activeTheme.bg)
    : '#08080f';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      data-theme="dark"
      style={{ colorScheme: 'dark', backgroundColor: bgColor, transition: 'background-color 0.4s ease' }}
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-white/5">
        <div className="h-full bg-white/30 transition-all duration-500" style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }} />
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-2 pt-6 pb-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`rounded-full transition-all duration-300 ${i === stepIndex ? 'w-5 h-1.5 bg-white' : i < stepIndex ? 'w-1.5 h-1.5 bg-white/40' : 'w-1.5 h-1.5 bg-white/15'}`} />
        ))}
      </div>

      {/* Content */}
      <div
        className="flex-1 flex flex-col px-6 pt-8 pb-6 max-w-sm mx-auto w-full overflow-y-auto"
        style={{
          opacity: animating ? 0 : 1,
          transform: animating ? `translateX(${direction === 'forward' ? '20px' : '-20px'})` : 'translateX(0)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}
      >

        {/* ── Welcome ── */}
        {currentStep === 'welcome' && (
          <>
            <div className="text-5xl mb-6">👋</div>
            <h1 className="text-white text-3xl font-bold mb-2">Welcome, Hero</h1>
            <p className="text-white/50 text-sm mb-8">GAINN works around you — your goals, your routine, your way. Let's get you set up.</p>

            <label className="text-white/60 text-xs font-medium mb-2 block">Your name</label>
            <input
              type="text"
              placeholder="e.g. Alex"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goNext()}
              autoFocus
              className="w-full bg-white/8 border border-white/10 rounded-2xl px-4 py-4 text-white text-lg outline-none focus:border-white/30 transition-colors placeholder:text-white/20 mb-6"
            />

            <label className="text-white/60 text-xs font-medium mb-3 block">What are you here for? <span className="text-white/30">(pick all that apply)</span></label>
            <div className="grid grid-cols-2 gap-2 mb-8">
              {GOALS.map(g => (
                <button
                  key={g.id}
                  onClick={() => toggleGoal(g.id)}
                  className={`flex flex-col gap-1 px-3 py-3 rounded-2xl border text-left transition-all ${goals.includes(g.id) ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/8'}`}
                >
                  <span className="text-xl">{g.emoji}</span>
                  <span className={`text-xs font-semibold ${goals.includes(g.id) ? 'text-white' : 'text-white/60'}`}>{g.label}</span>
                  <span className="text-white/30 text-[10px] leading-tight">{g.desc}</span>
                </button>
              ))}
            </div>

            <div className="mt-auto">
              <button onClick={goNext} className="w-full py-4 bg-[#16a34a] text-white font-bold rounded-2xl text-base hover:opacity-90 transition-opacity">
                {goals.length === 0 ? 'Skip & Continue' : `Continue →`}
              </button>
            </div>
          </>
        )}

        {/* ── Money ── */}
        {currentStep === 'money' && (
          <>
            <div className="text-5xl mb-6">💰</div>
            <h1 className="text-white text-3xl font-bold mb-2">Savings Goal</h1>
            <p className="text-white/50 text-sm mb-8">Set a yearly target — we'll track every vice you skip as money saved.</p>

            <div className="flex flex-col gap-4 mb-8">
              <div>
                <label className="text-white/60 text-xs font-medium mb-2 block">Yearly savings target</label>
                <div className="flex items-center bg-white/8 border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/30 transition-colors">
                  <span className="text-white/40 text-lg pl-4 pr-1">{currency.symbol}</span>
                  <input
                    type="number"
                    placeholder="500"
                    value={savingsInput}
                    onChange={e => setSavingsInput(e.target.value)}
                    className="flex-1 bg-transparent py-4 pr-4 text-white text-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-white/60 text-xs font-medium mb-2 block">Currency</label>
                <div className="max-h-56 overflow-y-auto flex flex-col gap-1.5 pr-1">
                  {CURRENCIES.map(c => (
                    <button
                      key={`${c.country}-${c.symbol}`}
                      onClick={() => setCurrency(c)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${currency.country === c.country ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/8'}`}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <span className={`text-sm flex-1 ${currency.country === c.country ? 'text-white font-medium' : 'text-white/50'}`}>{c.country}</span>
                      <span className={`text-sm font-bold tabular-nums ${currency.country === c.country ? 'text-white' : 'text-white/30'}`}>{c.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto flex gap-3">
              <button onClick={goBack} className="px-5 py-4 bg-white/8 text-white/60 font-medium rounded-2xl text-sm">Back</button>
              <button onClick={goNext} className="flex-1 py-4 bg-[#16a34a] text-white font-bold rounded-2xl text-base hover:opacity-90 transition-opacity">Continue</button>
            </div>
          </>
        )}

        {/* ── Sleep ── */}
        {currentStep === 'sleep' && (
          <>
            <div className="text-5xl mb-6">🌅</div>
            <h1 className="text-white text-3xl font-bold mb-2">Sleep Routine</h1>
            <p className="text-white/50 text-sm mb-8">Set your wake and bedtime targets to build a consistent sleep routine.</p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div>
                <label className="text-white/60 text-xs font-medium mb-2 block">Wake time</label>
                <input
                  type="time"
                  value={wakeInput}
                  onChange={e => setWakeInput(e.target.value)}
                  className="w-full bg-white/8 border border-white/10 rounded-xl px-3 text-white outline-none focus:border-white/30 transition-colors"
                  style={{ colorScheme: 'dark', height: 40, fontSize: 15, WebkitAppearance: 'none', appearance: 'none' }}
                />
                <p className="text-white/30 text-xs mt-1.5">Check in each morning</p>
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-2 block">Bedtime</label>
                <input
                  type="time"
                  value={bedInput}
                  onChange={e => setBedInput(e.target.value)}
                  className="w-full bg-white/8 border border-white/10 rounded-xl px-3 text-white outline-none focus:border-white/30 transition-colors"
                  style={{ colorScheme: 'dark', height: 40, fontSize: 15, WebkitAppearance: 'none', appearance: 'none' }}
                />
                <p className="text-white/30 text-xs mt-1.5">Target sleep time</p>
              </div>
            </div>

            <div className="mt-auto flex gap-3">
              <button onClick={goBack} className="px-5 py-4 bg-white/8 text-white/60 font-medium rounded-2xl text-sm">Back</button>
              <button onClick={goNext} className="flex-1 py-4 bg-[#16a34a] text-white font-bold rounded-2xl text-base hover:opacity-90 transition-opacity">Continue</button>
            </div>
          </>
        )}

        {/* ── Fitness ── */}
        {currentStep === 'fitness' && (
          <>
            <div className="text-5xl mb-6">💪</div>
            <h1 className="text-white text-3xl font-bold mb-2">About You</h1>
            <p className="text-white/50 text-sm mb-6">Used to personalise calorie targets and fitness goals.</p>

            <div className="flex flex-col gap-4 mb-4">
              {/* Step goal */}
              <div>
                <label className="text-white/60 text-xs font-medium mb-2 block">Daily step goal</label>
                <div className="flex items-center bg-white/8 border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/30 transition-colors">
                  <span className="text-white/40 text-base pl-4 pr-2">👟</span>
                  <input
                    type="number"
                    placeholder="10000"
                    value={stepInput}
                    onChange={e => setStepInput(e.target.value)}
                    className="flex-1 bg-transparent py-3.5 text-white text-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{ colorScheme: 'dark' }}
                  />
                  <span className="text-white/30 text-sm pr-4 shrink-0">steps</span>
                </div>
              </div>

              {/* Unit toggle */}
              <div className="flex items-center justify-between">
                <label className="text-white/50 text-xs font-medium">Weight unit</label>
                <div className="flex bg-white/8 rounded-xl overflow-hidden border border-white/10">
                  {(['kg', 'lbs', 'st_lbs'] as const).map(u => (
                    <button key={u} onClick={() => setWeightUnit(u)}
                      className={`px-3 py-1.5 text-xs font-semibold transition-colors ${weightUnit === u ? 'bg-[#16a34a] text-white' : 'text-white/40'}`}
                    >{u === 'st_lbs' ? 'st & lbs' : u}</button>
                  ))}
                </div>
              </div>

              {/* Height / Weight / Age */}
              <div className={`grid gap-3 ${weightUnit === 'st_lbs' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {[
                  { label: 'Height', unit: 'cm',  val: heightVal, set: setHeightVal, min: 140, max: 220 },
                  { label: weightUnit === 'st_lbs' ? 'Stone' : 'Weight', unit: weightUnit === 'st_lbs' ? 'st' : weightUnit, val: weightVal, set: setWeightVal, min: weightUnit === 'kg' ? 30 : weightUnit === 'lbs' ? 66 : 5, max: weightUnit === 'kg' ? 200 : weightUnit === 'lbs' ? 440 : 32 },
                  ...(weightUnit === 'st_lbs' ? [{ label: 'Pounds', unit: 'lbs', val: weightLbsPart, set: setWeightLbsPart, min: 0, max: 13 }] : []),
                  { label: 'Age',    unit: 'yr',   val: ageVal,    set: setAgeVal,    min: 13,  max: 90  },
                ].map(({ label, unit, val, set, min, max }) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <label className="text-white/50 text-xs font-medium">{label}</label>
                    <div className="flex flex-col items-center bg-white/8 border border-white/10 rounded-2xl py-2 gap-1">
                      <button onClick={() => set(String(Math.min(max, (parseInt(val) || 0) + 1)))} className="text-white text-lg w-full text-center leading-none py-1">▲</button>
                      <div className="text-center">
                        <input
                          type="number"
                          value={val}
                          onChange={e => set(e.target.value)}
                          onBlur={e => { const n = parseInt(e.target.value); set(String(isNaN(n) ? min : Math.min(max, Math.max(min, n)))); }}
                          className="bg-transparent text-white text-xl font-bold tabular-nums text-center outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          style={{ fontSize: 20 }}
                        />
                        <span className="text-white/40 text-[10px] block">{unit}</span>
                      </div>
                      <button onClick={() => set(String(Math.max(min, (parseInt(val) || 0) - 1)))} className="text-white text-lg w-full text-center leading-none py-1">▼</button>
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
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${activity === opt.id ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/8'}`}
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
              <button onClick={goBack} className="px-5 py-4 bg-white/8 text-white/60 font-medium rounded-2xl text-sm">Back</button>
              <button onClick={goNext} className="flex-1 py-4 bg-[#16a34a] text-white font-bold rounded-2xl text-base hover:opacity-90 transition-opacity">Continue</button>
            </div>
          </>
        )}

        {/* ── Gym Experience ── */}
        {currentStep === 'gym_exp' && (() => {
          const options = [
            { id: 'Brand new',   emoji: '🆕', desc: 'Never trained with weights before' },
            { id: '< 6 months',  emoji: '🌱', desc: 'Just getting started' },
            { id: '6–12 months', emoji: '📈', desc: 'Getting the hang of it' },
            { id: '1–2 years',   emoji: '💪', desc: 'Solid foundation built' },
            { id: '2–4 years',   emoji: '🏋️', desc: 'Experienced lifter' },
            { id: '4+ years',    emoji: '🏆', desc: 'Advanced — knows the craft' },
          ];
          return (
            <>
              <div className="text-5xl mb-6">🏋️</div>
              <h1 className="text-white text-3xl font-bold mb-2">Gym Background</h1>
              <p className="text-white/50 text-sm mb-6">How long have you been training with weights? This helps GAINN build the right plan for your level.</p>
              <div className="flex flex-col gap-2 flex-1">
                {options.map(o => (
                  <button key={o.id} onClick={() => { setGymExp(o.id); goNext(); }}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${gymExp === o.id ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/8'}`}
                  >
                    <span className="text-2xl">{o.emoji}</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-semibold">{o.id}</p>
                      <p className="text-white/40 text-xs">{o.desc}</p>
                    </div>
                    {gymExp === o.id && <span className="text-white text-sm">✓</span>}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={goBack} className="px-5 py-4 bg-white/8 text-white/60 font-medium rounded-2xl text-sm">Back</button>
                <button onClick={goNext} className="flex-1 py-4 bg-white/10 text-white/50 font-bold rounded-2xl text-base">Skip</button>
              </div>
            </>
          );
        })()}

        {/* ── Running Experience ── */}
        {currentStep === 'run_exp' && (() => {
          const options = [
            { id: 'Never run',   emoji: '🆕', desc: 'Haven\'t really run before' },
            { id: '< 6 months',  emoji: '🌱', desc: 'Just starting out' },
            { id: '6–12 months', emoji: '📈', desc: 'Running regularly' },
            { id: '1–2 years',   emoji: '🏃', desc: 'Comfortable with distance' },
            { id: '2–4 years',   emoji: '⚡', desc: 'Working on pace & endurance' },
            { id: '4+ years',    emoji: '🏆', desc: 'Experienced runner' },
          ];
          return (
            <>
              <div className="text-5xl mb-6">🏃</div>
              <h1 className="text-white text-3xl font-bold mb-2">Running Background</h1>
              <p className="text-white/50 text-sm mb-6">How long have you been running? Helps GAINN pitch your cardio plans at the right level.</p>
              <div className="flex flex-col gap-2 flex-1">
                {options.map(o => (
                  <button key={o.id} onClick={() => { setRunExp(o.id); goNext(); }}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${runExp === o.id ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/8'}`}
                  >
                    <span className="text-2xl">{o.emoji}</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-semibold">{o.id}</p>
                      <p className="text-white/40 text-xs">{o.desc}</p>
                    </div>
                    {runExp === o.id && <span className="text-white text-sm">✓</span>}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={goBack} className="px-5 py-4 bg-white/8 text-white/60 font-medium rounded-2xl text-sm">Back</button>
                <button onClick={goNext} className="flex-1 py-4 bg-white/10 text-white/50 font-bold rounded-2xl text-base">Skip</button>
              </div>
            </>
          );
        })()}

        {/* ── Nutrition ── */}
        {currentStep === 'nutrition' && (
          <>
            <div className="text-5xl mb-6">🥗</div>
            <h1 className="text-white text-3xl font-bold mb-2">Eating Goals</h1>
            <p className="text-white/50 text-sm mb-8">What does eating better look like for you? Pick all that apply.</p>

            <div className="grid grid-cols-2 gap-2 mb-8">
              {NUTRITION_GOALS.map(g => (
                <button
                  key={g.id}
                  onClick={() => setNutritionGoals(prev => prev.includes(g.id) ? prev.filter(x => x !== g.id) : [...prev, g.id])}
                  className={`flex flex-col gap-1 px-3 py-3 rounded-2xl border text-left transition-all ${nutritionGoals.includes(g.id) ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/8'}`}
                >
                  <span className="text-xl">{g.emoji}</span>
                  <span className={`text-xs font-semibold ${nutritionGoals.includes(g.id) ? 'text-white' : 'text-white/60'}`}>{g.label}</span>
                  <span className="text-white/30 text-[10px] leading-tight">{g.desc}</span>
                </button>
              ))}
            </div>

            <div className="mt-auto flex gap-3">
              <button onClick={goBack} className="px-5 py-4 bg-white/8 text-white/60 font-medium rounded-2xl text-sm">Back</button>
              <button onClick={goNext} className="flex-1 py-4 bg-[#16a34a] text-white font-bold rounded-2xl text-base hover:opacity-90 transition-opacity">Continue</button>
            </div>
          </>
        )}

        {/* ── Theme ── */}
        {currentStep === 'theme' && (() => {
          const headingColor = isDark ? '#ffffff' : activeTheme.text;
          const subColor     = isDark ? 'rgba(255,255,255,0.5)' : `${activeTheme.text}99`;
          const cardBorder   = isDark ? 'rgba(255,255,255,0.08)' : `${activeTheme.accent}22`;
          const cardActiveBorder = isDark ? 'rgba(255,255,255,0.4)' : activeTheme.accent;
          const cardActiveBg = isDark ? 'rgba(255,255,255,0.10)' : `${activeTheme.accent}14`;
          const btnBg   = isDark ? '#ffffff' : activeTheme.text;
          const btnText = isDark ? '#08080f' : '#ffffff';
          const backBg   = isDark ? 'rgba(255,255,255,0.08)' : `${activeTheme.text}12`;
          const backText = isDark ? 'rgba(255,255,255,0.6)' : `${activeTheme.text}99`;

          return (
            <>
              <div className="text-5xl mb-6">🎨</div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: headingColor }}>Pick Your Theme</h1>
              <p className="text-sm mb-6" style={{ color: subColor }}>Choose a look that feels like you. You can change it anytime.</p>

              <div className="flex flex-col gap-3 flex-1">
                {THEMES.map(t => {
                  const isActive = selectedTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTheme(t.id)}
                      className="flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all text-left"
                      style={{ borderColor: isActive ? cardActiveBorder : cardBorder, background: isActive ? cardActiveBg : 'transparent' }}
                    >
                      <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: t.bg, border: '1.5px solid rgba(128,128,128,0.2)' }}>
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
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all" style={{ borderColor: isActive ? cardActiveBorder : cardBorder, background: isActive ? cardActiveBorder : 'transparent' }}>
                        {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 flex gap-3">
                <button onClick={goBack} className="px-5 py-4 font-medium rounded-2xl text-sm" style={{ background: backBg, color: backText }}>Back</button>
                <button onClick={goNext} className="flex-1 py-4 font-bold rounded-2xl text-base hover:opacity-90 transition-opacity" style={{ background: btnBg, color: btnText }}>
                  Start Quest →
                </button>
              </div>
            </>
          );
        })()}

        {/* ── Sections ── */}
        {currentStep === 'sections' && (
          <>
            <div className="text-5xl mb-4">🎛️</div>
            <h1 className="text-white text-3xl font-bold mb-2">Your Sections</h1>
            <p className="text-white/50 text-sm mb-6">Turn off anything you don't need. You can always change this in Settings.</p>

            <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
              {ONBOARDING_SECTIONS.map(s => {
                const isOff = disabledOnboarding.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => setDisabledOnboarding(prev =>
                      isOff ? prev.filter(x => x !== s.id) : [...prev, s.id]
                    )}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${
                      isOff ? 'bg-white/3 border-white/8 opacity-50' : 'bg-white/8 border-white/20'
                    }`}
                  >
                    <span className="text-xl w-7 text-center">{s.icon}</span>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${isOff ? 'text-white/40 line-through' : 'text-white'}`}>{s.label}</p>
                      <p className="text-white/30 text-[10px]">{s.desc}</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${isOff ? 'bg-white/10' : 'bg-[#16a34a]'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isOff ? 'translate-x-0.5 opacity-40' : 'translate-x-5'}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-3">
              <button onClick={goBack} className="px-5 py-4 bg-white/8 text-white/60 font-medium rounded-2xl text-sm">Back</button>
              <button onClick={goNext} className="flex-1 py-4 bg-[#16a34a] text-white font-bold rounded-2xl text-base hover:opacity-90 transition-opacity">Continue</button>
            </div>
          </>
        )}

        {/* ── Coaching Style slide ── */}
        {currentStep === 'coaching' && (
          <>
            <div className="text-5xl mb-4">🤖</div>
            <h1 className="text-white text-3xl font-bold mb-2">How should GAINN coach you?</h1>
            <p className="text-white/60 text-sm mb-6">You can change this anytime in Settings</p>
            <div className="flex flex-col gap-3 w-full">
              {[
                { icon: '🤗', label: 'Go Easy', desc: 'Gentle, non-judgmental. Celebrates every small win.', value: 20 },
                { icon: '⚖️', label: 'Balanced', desc: 'Honest and encouraging. The right mix of push and support.', value: 50 },
                { icon: '🎖️', label: 'Drill Sergeant', desc: 'Maximum intensity. No excuses. Military-style accountability.', value: 90 },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setAiIntensity(opt.value); goNext(); }}
                  className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.98]"
                >
                  <span className="text-3xl shrink-0">{opt.icon}</span>
                  <div>
                    <p className="text-white font-bold text-base">{opt.label}</p>
                    <p className="text-white/60 text-xs mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Terms & Disclaimer slide ── */}
        {currentStep === 'terms' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-5">
            <div className="text-5xl">📋</div>
            <h2 className="text-2xl font-black text-white leading-tight">Before you begin</h2>
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-5 text-left flex flex-col gap-3">
              <p className="text-white/80 text-sm font-semibold">GAINN Disclaimer</p>
              <p className="text-white/50 text-xs leading-relaxed">
                GAINN provides AI-generated suggestions for fitness, nutrition, finance, and wellness. This content is for <strong className="text-white/70">informational purposes only</strong> and is <strong className="text-white/70">not a substitute</strong> for professional medical, dietary, financial, or fitness advice.
              </p>
              <p className="text-white/50 text-xs leading-relaxed">
                AI features are powered by Google Gemini and other third-party services. GAINN is not responsible for the accuracy, completeness, or outcomes of any AI-generated content. Always consult a qualified professional before making decisions about your health or finances.
              </p>
              <p className="text-white/50 text-xs leading-relaxed">
                By continuing, you agree that GAINN and its developers shall not be held liable for any loss, injury, or damage arising from your use of this app or its AI features.
              </p>
            </div>

            {/* Checkbox */}
            <button
              onClick={() => setTermsAccepted(v => !v)}
              className="flex items-center gap-3 max-w-sm w-full"
            >
              <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${termsAccepted ? 'bg-white border-white' : 'border-white/30 bg-transparent'}`}>
                {termsAccepted && <span className="text-black text-xs font-black">✓</span>}
              </div>
              <span className="text-white/60 text-xs text-left leading-relaxed">
                I understand and agree to these terms
              </span>
            </button>

            <button
              onClick={finish}
              disabled={!termsAccepted}
              className="px-10 py-3.5 rounded-2xl font-bold text-sm transition-all mt-1"
              style={{
                background: termsAccepted ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: termsAccepted ? 'white' : 'rgba(255,255,255,0.2)',
                border: `2px solid ${termsAccepted ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                cursor: termsAccepted ? 'pointer' : 'default',
              }}
            >
              Let&apos;s Go →
            </button>
          </div>
        )}

        {/* ── GAINN AI showcase slide ── */}
        {currentStep === 'gainn_ai' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-0 overflow-hidden">
            {/* Glowing orb */}
            <div style={{ animation: 'fadeSlideUp 1s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}>
              <div style={{
                width: 96, height: 96, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, rgba(124,58,237,0.08) 70%, transparent 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
                animation: 'glowPulse 3.5s ease-in-out infinite',
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28,
                }}>✦</div>
              </div>
            </div>

            {/* Label */}
            <div style={{ animation: 'fadeSlideUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}>
              <p className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: '#7c3aed' }}>Meet Your AI</p>
              <h2 className="text-3xl font-black text-white leading-tight mb-3">
                Ask <span className="text-white">G</span><span style={{ color: '#16a34a' }}>AI</span><span className="text-white">NN</span>
              </h2>
              <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto mb-7">
                The intelligence at the centre of everything. Always there, always personal.
              </p>
            </div>

            {/* Feature rows */}
            <div className="w-full max-w-xs flex flex-col gap-2.5 mb-8">
              {[
                { icon: '💬', label: 'Any question',          delay: '0.35s' },
                { icon: '📋', label: 'Log anything',          delay: '0.48s' },
                { icon: '🗺️', label: 'Build a plan',          delay: '0.61s' },
                { icon: '📊', label: 'Understand your data',  delay: '0.74s' },
              ].map(item => (
                <div key={item.label}
                  style={{ animation: `fadeSlideUp 0.8s cubic-bezier(0.16,1,0.3,1) ${item.delay} both` }}
                >
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '10px 14px', width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                    <div className="flex items-center gap-3">
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'rgba(124,58,237,0.15)',
                        border: '1px solid rgba(124,58,237,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0,
                      }}>{item.icon}</div>
                      <span className="text-white/80 text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ color: '#7c3aed', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', whiteSpace: 'nowrap' }}>
                      Ask GAINN AI
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Closing line + button */}
            <div style={{ animation: 'fadeSlideUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.9s both' }} className="flex flex-col items-center gap-4">
              <p className="text-xl font-black text-white">
                This is your <span style={{ color: '#7c3aed' }}>G</span><span style={{ color: '#16a34a' }}>AI</span><span style={{ color: '#7c3aed' }}>NN</span><span style={{ color: '#7c3aed' }}>.</span>
              </p>
              <button onClick={goNext}
                className="px-10 py-3.5 rounded-2xl font-bold text-sm text-white transition-all"
                style={{ background: '#16a34a', border: '2px solid #16a34a' }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Feedback slide ── */}
        {currentStep === 'feedback' && (() => {
          const r = 28;
          const circ = 2 * Math.PI * r;
          const progress = countdown / 5;
          return (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-6">
              <div className="text-5xl">💬</div>
              <h2 className="text-2xl font-black text-white leading-tight">
                Your voice matters to us
              </h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                We're building GAINN for you — and we genuinely want to hear about your experience. Whether it's something you love, something that could be better, or a feature you'd like to see added, we want to know.
              </p>
              <p className="text-white/40 text-xs leading-relaxed max-w-xs">
                Head to the <strong className="text-white/60">Community</strong> tab anytime to share feedback directly with our team.
              </p>

              {/* Circle countdown + Continue button */}
              <div className="flex flex-col items-center gap-4 mt-2">
                <svg width="64" height="64" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <circle
                    cx="36" cy="36" r={r}
                    fill="none"
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - progress)}
                    transform="rotate(-90 36 36)"
                    style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                  />
                  <text x="36" y="42" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="18" fontWeight="bold">{countdown > 0 ? countdown : '✓'}</text>
                </svg>
                <button
                  onClick={goNext}
                  disabled={countdown > 0}
                  className="px-10 py-3.5 rounded-2xl font-bold text-sm transition-all"
                  style={{
                    background: countdown === 0 ? '#16a34a' : 'transparent',
                    color: countdown === 0 ? 'white' : 'rgba(255,255,255,0.2)',
                    border: `2px solid ${countdown === 0 ? '#16a34a' : 'rgba(255,255,255,0.1)'}`,
                    cursor: countdown === 0 ? 'pointer' : 'default',
                  }}
                >
                  Continue →
                </button>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
