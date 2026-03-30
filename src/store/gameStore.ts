'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CharacterStats,
  CalendarEvent,
  ViceEntry,
  ViceDef,
  GymEntry,
  GymPlan,
  GymSession,
  WakeQuest,
  Exercise,
  ActiveSection,
  Theme,
  CharacterAppearance,
  ActivityLevel,
  HabitDef,
  HabitEntry,
  NutritionGoal,
  MealEntry,
  SavedMealItem,
  SleepEntry,
  PerformanceStat,
  PerformanceEntry,
  Outfit,
  StepEntry,
  GoogleFitTokens,
  Subscription,
  BudgetItem,
  SpendingEntry,
  PaycheckEntry,
  WeightEntry,
  BodyCompositionEntry,
} from '@/types';

interface GameStore {
  stats: CharacterStats;
  calendarEvents: CalendarEvent[];
  vices: ViceEntry[];
  viceDefs: ViceDef[];
  gymLog: GymEntry[];
  gymPlans: GymPlan[];
  gymSessions: GymSession[];
  habitDefs: HabitDef[];
  habitLog: HabitEntry[];
  wakeQuest: WakeQuest;
  bedTime: string;
  savingsGoal: number;
  activeSection: ActiveSection;
  theme: Theme;
  showLevelUp: boolean;
  levelUpMessage: string;
  userName: string;
  profilePicUrl: string;
  weightUnit: 'kg' | 'st_lbs' | 'lbs';
  currencySymbol: string;
  hasOnboarded: boolean;
  gainnIntroSeen: boolean;
  setGainnIntroSeen: () => void;
  accountCreatedDate: string | null;
  financialMode: boolean;
  hiddenSections: string[];
  hiddenStats: string[];
  disabledSections: string[];
  setDisabledSections: (sections: string[]) => void;
  toggleDisabledSection: (section: string) => void;
  clockFormat: '12h' | '24h';
  setClockFormat: (f: '12h' | '24h') => void;
  tokensSpent: number;
  tokensPerEarn: number;
  tokenRedemptions: { id: string; label: string; emoji: string; cost: number; date: string }[];
  customRewards: { id: string; label: string; emoji: string; cost: number }[];
  hiddenPresetRewardIds: string[];
  characterAppearance: CharacterAppearance;
  nutritionGoal: NutritionGoal;
  mealLog: MealEntry[];
  savedGymPrefs: Record<string, string> | null;
  savedNutritionPrefs: Record<string, string> | null;
  savedMealLibrary: SavedMealItem[];
  sleepLog: SleepEntry[];
  performanceStats: PerformanceStat[];
  performanceLog: PerformanceEntry[];
  primaryGoals: string[];       // e.g. ["Build Muscle", "Lose Fat"]
  weightLog: WeightEntry[];     // timestamped weight measurements
  bodyCompositionLog: BodyCompositionEntry[];

  trainingTab: 'habits' | 'plans' | 'performance' | 'steps';
  nutritionTab: 'food' | 'drink';
  setActiveSection: (section: ActiveSection) => void;
  setTrainingTab: (tab: 'habits' | 'plans' | 'performance' | 'steps') => void;
  setNutritionTab: (tab: 'food' | 'drink') => void;
  setTheme: (theme: Theme) => void;
  setSavingsGoal: (goal: number) => void;
  setUserName: (name: string) => void;
  setProfilePicUrl: (url: string) => void;
  setWeightUnit: (unit: 'kg' | 'st_lbs' | 'lbs') => void;
  setCurrencySymbol: (symbol: string) => void;
  setHasOnboarded: () => void;
  aiIntensity: number;
  setAiIntensity: (v: number) => void;
  gymExperience: string;
  setGymExperience: (v: string) => void;
  runExperience: string;
  setRunExperience: (v: string) => void;
  setFinancialMode: (on: boolean) => void;
  toggleHiddenSection: (section: string) => void;
  toggleHiddenStat: (stat: string) => void;
  redeemTokens: (cost: number, label: string, emoji: string) => boolean;
  setTokensPerEarn: (n: number) => void;
  addCustomReward: (reward: Omit<{ id: string; label: string; emoji: string; cost: number }, 'id'>) => void;
  removeCustomReward: (id: string) => void;
  hidePresetReward: (id: string) => void;
  showPresetReward: (id: string) => void;
  updateViceRate: (id: string, goldRate: number) => void;
  addCustomVice: (def: Omit<ViceDef, 'id' | 'builtIn'>) => void;
  removeCustomVice: (id: string) => void;
  addGymPlan: (plan: Omit<GymPlan, 'id' | 'createdAt'>) => string;
  updateGymPlan: (id: string, patch: Partial<GymPlan>) => void;
  removeGymPlan: (id: string) => void;
  logGymSession: (planId: string) => void;
  removeGymSession: (sessionId: string) => void;
  addHabit: (def: Omit<HabitDef, 'id' | 'createdAt'>) => string;
  updateHabit: (id: string, patch: Partial<HabitDef>) => void;
  removeHabit: (id: string) => void;
  logHabit: (habitId: string, date: string) => void;
  unlogHabit: (habitId: string, date: string) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateCalendarEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  logVice: (viceDefId: string, count: number) => void;
  addGymEntry: (exercises: Exercise[]) => void;
  setWakeTarget: (time: string) => void;
  setBedTime: (time: string) => void;
  checkInWake: (actualTime: string, date?: string) => void;
  logSleep: (date: string, onTime: boolean) => void;
  deleteSleepEntry: (id: string) => void;
  deleteWakeCheckIn: (id: string) => void;
  dismissLevelUp: () => void;
  setCharacterAppearance: (appearance: Partial<CharacterAppearance>) => void;
  setNutritionGoal: (goal: NutritionGoal) => void;
  logMeal: (meal: Omit<MealEntry, 'id' | 'date'>, date?: string) => void;
  deleteMeal: (id: string) => void;
  setSavedGymPrefs: (prefs: Record<string, string>) => void;
  setSavedNutritionPrefs: (prefs: Record<string, string>) => void;
  setActivityLevel: (level: ActivityLevel) => void;
  setPrimaryGoals: (goals: string[]) => void;
  logWeight: (date: string, weight: number) => void;
  logBodyComposition: (entry: Omit<BodyCompositionEntry, 'id'>) => void;
  addToMealLibrary: (meal: Omit<SavedMealItem, 'id'>) => void;
  removeFromMealLibrary: (id: string) => void;
  addPerformanceStat: (stat: Omit<PerformanceStat, 'id'> & { id?: string }) => void;
  removePerformanceStat: (id: string) => void;
  logPerformanceEntry: (entry: Omit<PerformanceEntry, 'id'>) => void;
  deletePerformanceEntry: (id: string) => void;
  unlockedOutfits: Outfit[];
  purchaseOutfit: (id: Outfit) => boolean; // returns false if insufficient gold
  stepLog: StepEntry[];
  stepGoal: number;
  snapshotHiddenBuiltins: string[];  // built-in row IDs that are toggled off
  snapshotAddedOptional: string[];   // habit IDs + '__nutrition__' that are opted in
  setSnapshotHiddenBuiltins: (ids: string[]) => void;
  setSnapshotAddedOptional: (ids: string[]) => void;
  detailCellOverrides: Record<string, 'done' | 'late' | 'missed' | 'unscheduled'>;  // key: `${rowId}_${date}`
  setDetailCellOverride: (key: string, value: 'done' | 'late' | 'missed' | 'unscheduled' | null) => void;
  googleFitTokens: GoogleFitTokens | null;
  logSteps: (date: string, steps: number, source: 'manual' | 'google_fit') => void;
  deleteStep: (id: string) => void;
  setStepGoal: (goal: number) => void;
  floorsGoal: number;
  setFloorsGoal: (goal: number) => void;
  setGoogleFitTokens: (tokens: GoogleFitTokens | null) => void;
  subscriptions: Subscription[];
  paycheckIncome: number;
  paycheckFrequency: 'weekly' | 'monthly' | 'annual';
  incomeMode: 'salary' | 'variable';
  paycheckLog: PaycheckEntry[];
  addSubscription: (sub: Omit<Subscription, 'id'>) => void;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;
  setPaycheckIncome: (income: number) => void;
  setPaycheckFrequency: (freq: 'weekly' | 'monthly' | 'annual') => void;
  setIncomeMode: (mode: 'salary' | 'variable') => void;
  addPaycheckEntry: (entry: Omit<PaycheckEntry, 'id'>) => void;
  removePaycheckEntry: (id: string) => void;
  budgetItems: BudgetItem[];
  addBudgetItem: (item: Omit<BudgetItem, 'id'>) => void;
  removeBudgetItem: (id: string) => void;
  updateBudgetItem: (id: string, patch: Partial<BudgetItem>) => void;
  spendingLog: SpendingEntry[];
  addSpendingEntry: (entry: Omit<SpendingEntry, 'id'>) => void;
  removeSpendingEntry: (id: string) => void;

  // Location sharing (Social globe)
  shareLocation: boolean;
  setShareLocation: (v: boolean) => void;

  // GPS Activity Tracking
  gpsTrackingEnabled: boolean;
  setGpsTrackingEnabled: (v: boolean) => void;
  gpsActivities: GpsActivity[];
  addGpsActivity: (a: GpsActivity) => void;
  deleteGpsActivity: (id: string) => void;

  // Water intake tracking
  waterLog: WaterEntry[];
  waterGoal: number;
  addWaterEntry: (date: string, amount: number, label?: string) => void;
  deleteWaterEntry: (id: string) => void;
  setWaterGoal: (goal: number) => void;

  // Login streak
  loginStreak: number;
  lastOpenedDate: string | null;
  recordAppOpen: () => void;
}

export interface WaterEntry {
  id: string;
  date: string;   // YYYY-MM-DD
  amount: number; // ml
  label?: string; // optional drink name (e.g. "Matcha", "Coffee")
}

export interface GpsActivity {
  id: string;
  type: 'run' | 'cycle' | 'walk' | 'other';
  activityName?: string;    // custom label for 'other' type (e.g. "Pilates", "Hiking")
  startTime: string;
  duration: number;         // seconds
  distance: number;         // km
  coords: { lat: number; lng: number; alt?: number }[];
  elevationGain?: number;   // metres of total ascent
  floorsClimbed?: number;   // elevationGain / 3.048
  caloriesBurned?: number;  // AI-estimated or GPS-computed kcal
}

const DEFAULT_VICE_DEFS: ViceDef[] = [
  { id: 'pints', name: 'Pints',      icon: '🍺', goldRate: 6,   builtIn: true },
  { id: 'cigs',  name: 'Cigarettes', icon: '🚬', goldRate: 0.5, builtIn: true },
  { id: 'junk',  name: 'Takeaway',   icon: '🍔', goldRate: 4,   builtIn: true },
];

const STAT_GAINS = {
  gym:         { str: 3, con: 2, dex: 1 },
  wake_ontime: { con: 2, dex: 3, gold: 5 },
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

// Fitness-related keyword detection for cross-sync
const FITNESS_KEYWORDS = ['gym', 'fitness', 'yoga', 'workout', 'exercise', 'training', 'run', 'lift', 'weights', 'cardio', 'hiit', 'swim', 'cycle', 'bike', 'pilates', 'crossfit', 'sport', 'class'];
function isFitnessHabit(name: string, emoji: string): boolean {
  const text = (name + ' ' + emoji).toLowerCase();
  return FITNESS_KEYWORDS.some(k => text.includes(k));
}

// Infer sensible stat config from an activity name/emoji
export function inferStatConfig(name: string, emoji?: string): Omit<PerformanceStat, 'id' | 'name'> {
  const n = name.toLowerCase();
  if (/run|running|jog|jogging|\b5k\b|\b10k\b|marathon/.test(n))
    return { emoji: emoji ?? '🏃', color: '#34c759', unit: 'km',       higherIsBetter: true,  hasSecondary: true,  secondaryUnit: 'min', secondaryLabel: 'Time' };
  if (/cycl|cycling|bike|bicycle|biking/.test(n))
    return { emoji: emoji ?? '🚴', color: '#007aff', unit: 'km',       higherIsBetter: true,  hasSecondary: true,  secondaryUnit: 'min', secondaryLabel: 'Time' };
  if (/swim|swimming/.test(n))
    return { emoji: emoji ?? '🏊', color: '#5ac8fa', unit: 'm',        higherIsBetter: true,  hasSecondary: true,  secondaryUnit: 'min', secondaryLabel: 'Time' };
  if (/walk|walking|hik|hiking/.test(n))
    return { emoji: emoji ?? '🚶', color: '#ff9500', unit: 'km',       higherIsBetter: true,  hasSecondary: true,  secondaryUnit: 'min', secondaryLabel: 'Time' };
  if (/row|rowing/.test(n))
    return { emoji: emoji ?? '🚣', color: '#5ac8fa', unit: 'm',        higherIsBetter: true,  hasSecondary: true,  secondaryUnit: 'min', secondaryLabel: 'Time' };
  if (/gym|lift|weight|bench|squat|deadlift|press|curl|pull.?up|push.?up|dip|lunge|strength|resistance|crossfit|hiit|circuit/.test(n))
    return { emoji: emoji ?? '🏋️', color: '#ff3b30', unit: 'kg',       higherIsBetter: true,  hasSecondary: false };
  if (/read|reading|study|studying|book|learn|journal|journaling/.test(n))
    return { emoji: emoji ?? '📖', color: '#ff9500', unit: 'min',      higherIsBetter: true,  hasSecondary: false };
  if (/meditat|mindful|breathe|breathing/.test(n))
    return { emoji: emoji ?? '🧘', color: '#af52de', unit: 'min',      higherIsBetter: true,  hasSecondary: false };
  if (/water|hydrat|drink water/.test(n))
    return { emoji: emoji ?? '💧', color: '#5ac8fa', unit: 'ml',       higherIsBetter: true,  hasSecondary: false };
  if (/cold.?shower|cold.?bath|ice.?bath/.test(n))
    return { emoji: emoji ?? '🚿', color: '#007aff', unit: 'sessions', higherIsBetter: true,  hasSecondary: false };
  if (/alcohol|no.?alcohol|drink|beer|wine|spirit|pint|sober/.test(n))
    return { emoji: emoji ?? '🚫', color: '#ff9500', unit: 'sessions', higherIsBetter: true,  hasSecondary: false };
  if (/yoga|pilates|stretch|sauna|boxing|martial|mma|bjj|jiu.?jitsu|wrestling|fitness|cardio|workout|training|exercise/.test(n))
    return { emoji: emoji ?? '🧘', color: '#af52de', unit: 'min',      higherIsBetter: true,  hasSecondary: false };
  // Default: session count
  return { emoji: emoji ?? '⭐', color: '#4a6fa5', unit: 'sessions',   higherIsBetter: true,  hasSecondary: false };
}

// Check if a habit is due on a given date string (YYYY-MM-DD)
function habitDueOn(habit: import('@/types').HabitDef, ds: string): boolean {
  const dow = new Date(ds + 'T00:00:00').getDay();
  if (habit.scheduleType === 'fortnightly') {
    const getMonday = (d: Date) => { const dd = new Date(d); dd.setDate(dd.getDate() - (dd.getDay() === 0 ? 6 : dd.getDay() - 1)); dd.setHours(0,0,0,0); return dd; };
    const weeks = Math.round((getMonday(new Date(ds + 'T00:00:00')).getTime() - getMonday(new Date(habit.createdAt)).getTime()) / (7*24*60*60*1000));
    return weeks % 2 === 0 ? habit.scheduleDays.includes(dow) : (habit.scheduleWeekBDays ?? []).includes(dow);
  }
  return (habit.scheduleDays ?? []).includes(dow);
}

function tryLevelUp(stats: CharacterStats, extra?: Partial<CharacterStats>): CharacterStats {
  const s = { ...stats, ...extra };
  if (s.xp >= s.xpToNext) {
    return { ...s, level: s.level + 1, xp: s.xp - s.xpToNext, xpToNext: Math.floor(s.xpToNext * 1.5) };
  }
  return s;
}

// ── Experience auto-progression ────────────────────────────────────────────
const GYM_EXP_LEVELS  = ['Brand new', '< 6 months', '6–12 months', '1–2 years', '2–4 years', '4+ years'];
const RUN_EXP_LEVELS  = ['Never run', '< 6 months', '6–12 months', '1–2 years', '2–4 years', '4+ years'];
// Thresholds: minimum sessions to reach each level index
const GYM_THRESHOLDS  = [0, 5, 20, 50, 110, 200];
const RUN_THRESHOLDS  = [0, 4, 15, 35, 80, 150];

export function computeGymExpLevel(sessionCount: number): string {
  let idx = 0;
  for (let i = GYM_THRESHOLDS.length - 1; i >= 0; i--) {
    if (sessionCount >= GYM_THRESHOLDS[i]) { idx = i; break; }
  }
  return GYM_EXP_LEVELS[idx];
}

export function computeRunExpLevel(runCount: number): string {
  let idx = 0;
  for (let i = RUN_THRESHOLDS.length - 1; i >= 0; i--) {
    if (runCount >= RUN_THRESHOLDS[i]) { idx = i; break; }
  }
  return RUN_EXP_LEVELS[idx];
}

// Returns upgraded level only if higher than current; never downgrades
function maybeProgressGymExp(current: string, newSessionCount: number): string {
  const computed = computeGymExpLevel(newSessionCount);
  const curIdx = GYM_EXP_LEVELS.indexOf(current);
  const newIdx = GYM_EXP_LEVELS.indexOf(computed);
  return newIdx > curIdx ? computed : current;
}

function maybeProgressRunExp(current: string, newRunCount: number): string {
  const computed = computeRunExpLevel(newRunCount);
  const curIdx = RUN_EXP_LEVELS.indexOf(current);
  const newIdx = RUN_EXP_LEVELS.indexOf(computed);
  return newIdx > curIdx ? computed : current;
}

const defaultStats: CharacterStats = {
  str: 10, con: 10, dex: 10, gold: 50, level: 1, xp: 0, xpToNext: 100,
};

const INITIAL_STATE = {
  stats: defaultStats,
  calendarEvents: [],
  vices: [],
  viceDefs: DEFAULT_VICE_DEFS,
  gymLog: [],
  gymPlans: [],
  gymSessions: [],
  habitDefs: [],
  habitLog: [],
  wakeQuest: { targetTime: '07:00', checkIns: [] },
  bedTime: '23:00',
  savingsGoal: 500,
  activeSection: 'dashboard',
  trainingTab: 'habits',
  nutritionTab: 'food',
  theme: 'dark',
  showLevelUp: false,
  levelUpMessage: '',
  userName: '',
  profilePicUrl: '',
  weightUnit: 'kg',
  currencySymbol: '£',
  hasOnboarded: false,
  gainnIntroSeen: false,
  accountCreatedDate: null,
  aiIntensity: 50,
  gymExperience: '',
  runExperience: '',
  financialMode: true,
  hiddenSections: [],
  hiddenStats: [],
  disabledSections: [],
  clockFormat: (typeof navigator !== 'undefined' && navigator.language === 'en-US') ? '12h' : '24h',
  tokensSpent: 0,
  tokensPerEarn: 3,
  tokenRedemptions: [],
  customRewards: [],
  hiddenPresetRewardIds: [],
  characterAppearance: {
    race: 'human',
    gender: 'masculine',
    skinTone: '#ffe0bd',
    hairStyle: 0,
    hairColor: '#8b5230',
    eyeColor: '#3d7a2b',
    beardStyle: 0,
    outfit: 'default',
    outfitColor: '#2a1848',
    age: 25,
    startingWeight: 80,
    height: 175,
    activityLevel: 'moderate',
    hasCreated: false,
  },
  nutritionGoal: { calories: 2000, protein: 150, carbs: 200, fat: 65, sugar: 50 },
  mealLog: [],
  savedGymPrefs: null,
  savedNutritionPrefs: null,
  savedMealLibrary: [],
  sleepLog: [],
  performanceStats: [
    { id: 'builtin-steps', name: 'Daily Steps', emoji: '👟', color: '#4a9eff', unit: 'steps', higherIsBetter: true, hasSecondary: false },
  ],
  performanceLog: [],
  primaryGoals: [],
  weightLog: [],
  bodyCompositionLog: [],
  unlockedOutfits: [],
  stepLog: [],
  stepGoal: 10000,
  floorsGoal: 10,
  waterLog: [],
  waterGoal: 2000,
  loginStreak: 0,
  lastOpenedDate: null,
  snapshotHiddenBuiltins: [],
  snapshotAddedOptional: [],
  detailCellOverrides: {},
  googleFitTokens: null,
  subscriptions: [],
  paycheckIncome: 0,
  paycheckFrequency: 'monthly',
  incomeMode: 'salary',
  paycheckLog: [],
  budgetItems: [],
  spendingLog: [],
  gpsTrackingEnabled: true,
  gpsActivities: [],
};

export function resetGameStore() {
  useGameStore.persist.clearStorage();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useGameStore.setState(INITIAL_STATE as any);
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      stats: defaultStats,
      calendarEvents: [],
      vices: [],
      viceDefs: DEFAULT_VICE_DEFS,
      gymLog: [],
      gymPlans: [],
      gymSessions: [],
      habitDefs: [],
      habitLog: [],
      wakeQuest: { targetTime: '07:00', checkIns: [] },
      bedTime: '23:00',
      savingsGoal: 500,
      activeSection: 'dashboard',
      trainingTab: 'habits',
      nutritionTab: 'food',
      theme: 'dark',
      showLevelUp: false,
      levelUpMessage: '',
      userName: '',
      profilePicUrl: '',
      weightUnit: 'kg',
      currencySymbol: '£',
      hasOnboarded: false,
      gainnIntroSeen: false,
      accountCreatedDate: null,
      aiIntensity: 50,
      gymExperience: '',
      runExperience: '',
      financialMode: true,
      hiddenSections: [],
      hiddenStats: [],
      disabledSections: [],
      clockFormat: (typeof navigator !== 'undefined' && navigator.language === 'en-US') ? '12h' : '24h',
      tokensSpent: 0,
      tokensPerEarn: 3,
      tokenRedemptions: [],
      customRewards: [],
      hiddenPresetRewardIds: [],
      characterAppearance: {
        race: 'human',
        gender: 'masculine',
        skinTone: '#ffe0bd',
        hairStyle: 0,
        hairColor: '#8b5230',
        eyeColor: '#3d7a2b',
        beardStyle: 0,
        outfit: 'default',
        outfitColor: '#2a1848',
        age: 25,
        startingWeight: 80,
        height: 175,
        activityLevel: 'moderate',
        hasCreated: false,
      },
      nutritionGoal: { calories: 2000, protein: 150, carbs: 200, fat: 65, sugar: 50 },
      mealLog: [],
      savedGymPrefs: null,
      savedNutritionPrefs: null,
      savedMealLibrary: [],
      sleepLog: [],
      performanceStats: [
        { id: 'builtin-steps', name: 'Daily Steps', emoji: '👟', color: '#4a9eff', unit: 'steps', higherIsBetter: true, hasSecondary: false },
      ],
      performanceLog: [],
      primaryGoals: [],
      weightLog: [],
      bodyCompositionLog: [],
      unlockedOutfits: [],
      stepLog: [],
      stepGoal: 10000,
      floorsGoal: 10,
      waterLog: [],
      waterGoal: 2000,
      loginStreak: 0,
      lastOpenedDate: null,
      snapshotHiddenBuiltins: [],
      snapshotAddedOptional: [],
      detailCellOverrides: {},
      googleFitTokens: null,
      subscriptions: [],
      paycheckIncome: 0,
      paycheckFrequency: 'monthly',
      incomeMode: 'salary',
      paycheckLog: [],
      budgetItems: [],
      spendingLog: [],

      setActiveSection: (section) => set({ activeSection: section }),
      setTrainingTab:  (tab) => set({ trainingTab: tab }),
      setNutritionTab: (tab) => set({ nutritionTab: tab }),
      setTheme: (theme) => set({ theme }),
      setSavingsGoal: (goal) => set({ savingsGoal: goal }),
      setUserName: (name) => set({ userName: name }),
      setProfilePicUrl: (url) => set({ profilePicUrl: url }),
      setWeightUnit: (unit) => set({ weightUnit: unit }),
      setCurrencySymbol: (symbol) => set({ currencySymbol: symbol }),
      setHasOnboarded: () => set((state) => ({
        hasOnboarded: true,
        accountCreatedDate: state.accountCreatedDate ?? new Date().toISOString().slice(0, 10),
      })),
      setGainnIntroSeen: () => set({ gainnIntroSeen: true }),
      setAiIntensity: (v) => set({ aiIntensity: Math.max(1, Math.min(100, v)) }),
      setGymExperience: (v) => set({ gymExperience: v }),
      setRunExperience: (v) => set({ runExperience: v }),
      setFinancialMode: (on) => set({ financialMode: on }),
      setDisabledSections: (sections) => set({ disabledSections: sections }),
      toggleDisabledSection: (section) =>
        set((state) => ({
          disabledSections: state.disabledSections.includes(section)
            ? state.disabledSections.filter((s) => s !== section)
            : [...state.disabledSections, section],
        })),
      setClockFormat: (f) => set({ clockFormat: f }),

      toggleHiddenSection: (section) =>
        set((state) => ({
          hiddenSections: state.hiddenSections.includes(section)
            ? state.hiddenSections.filter((s) => s !== section)
            : [...state.hiddenSections, section],
        })),

      toggleHiddenStat: (stat) =>
        set((state) => ({
          hiddenStats: state.hiddenStats.includes(stat)
            ? state.hiddenStats.filter((s) => s !== stat)
            : [...state.hiddenStats, stat],
        })),

      setTokensPerEarn: (n) => set({ tokensPerEarn: Math.max(1, n) }),

      redeemTokens: (cost, label, emoji) => {
        let success = false;
        set((state) => {
          const tokensEarned = Math.floor(state.vices.length / state.tokensPerEarn);
          const available = tokensEarned - state.tokensSpent;
          if (available < cost) return {};
          success = true;
          return {
            tokensSpent: state.tokensSpent + cost,
            tokenRedemptions: [
              ...state.tokenRedemptions,
              { id: generateId(), label, emoji, cost, date: new Date().toISOString() },
            ],
          };
        });
        return success;
      },

      addCustomReward: (reward) =>
        set((state) => ({
          customRewards: [...state.customRewards, { ...reward, id: generateId() }],
        })),

      removeCustomReward: (id) =>
        set((state) => ({
          customRewards: state.customRewards.filter((r) => r.id !== id),
        })),

      hidePresetReward: (id) =>
        set((state) => ({
          hiddenPresetRewardIds: state.hiddenPresetRewardIds.includes(id) ? state.hiddenPresetRewardIds : [...state.hiddenPresetRewardIds, id],
        })),

      showPresetReward: (id) =>
        set((state) => ({
          hiddenPresetRewardIds: state.hiddenPresetRewardIds.filter((r) => r !== id),
        })),

      updateViceRate: (id, goldRate) =>
        set((state) => ({
          viceDefs: state.viceDefs.map((d) => d.id === id ? { ...d, goldRate } : d),
        })),

      addCustomVice: (def) =>
        set((state) => ({
          viceDefs: [...state.viceDefs, { ...def, id: generateId(), builtIn: false }],
        })),

      removeCustomVice: (id) =>
        set((state) => ({
          viceDefs: state.viceDefs.filter((d) => d.id !== id),
        })),

      addGymPlan: (plan) => {
        const id = generateId();
        const autoStat: PerformanceStat | null = plan.linkedStatId ? null : {
          id: generateId(), name: plan.name,
          ...inferStatConfig(plan.name, plan.emoji),
        };
        const linkedStatId = plan.linkedStatId ?? autoStat?.id;
        set((state) => ({
          gymPlans: [...state.gymPlans, { ...plan, id, linkedStatId, createdAt: new Date().toISOString() }],
          performanceStats: autoStat ? [...state.performanceStats, autoStat] : state.performanceStats,
        }));
        return id;
      },

      updateGymPlan: (id, patch) =>
        set((state) => ({
          gymPlans: state.gymPlans.map((p) => p.id === id ? { ...p, ...patch } : p),
        })),

      removeGymPlan: (id) =>
        set((state) => {
          const plan = state.gymPlans.find(p => p.id === id);
          const linkedHabitId = plan?.linkedHabitId;
          const linkedStatId  = plan?.linkedStatId;
          const today = new Date().toISOString().slice(0, 10);
          return {
            gymPlans:        state.gymPlans.filter((p) => p.id !== id),
            gymSessions:     state.gymSessions.filter((s) => s.planId !== id),
            habitDefs:       linkedHabitId ? state.habitDefs.filter(h => h.id !== linkedHabitId) : state.habitDefs,
            habitLog:        linkedHabitId ? state.habitLog.filter(e => e.habitId !== linkedHabitId) : state.habitLog,
            performanceStats: linkedStatId ? state.performanceStats.filter(s => s.id !== linkedStatId) : state.performanceStats,
            performanceLog:  linkedStatId ? state.performanceLog.filter(e => e.statId !== linkedStatId) : state.performanceLog,
            // Remove future calendar events linked to this plan; keep past ones as a log.
            // Match by planId OR by title (for older events created before planId was added).
            calendarEvents: state.calendarEvents.filter(e => {
              if (e.date <= today) return true;
              if (e.planId === id) return false;
              if (!e.planId && e.title === plan?.name) return false;
              return true;
            }),
          };
        }),

      logGymSession: (planId) =>
        set((state) => {
          // Prevent double-logging the same plan on the same day
          const todayPrefix = new Date().toISOString().slice(0, 10);
          if (state.gymSessions.some(s => s.planId === planId && s.date.slice(0, 10) === todayPrefix)) return state;
          const session: GymSession = { id: generateId(), planId, date: new Date().toISOString() };
          const newStats = tryLevelUp(state.stats, {
            str: state.stats.str + 3,
            con: state.stats.con + 2,
            dex: state.stats.dex + 1,
            xp:  state.stats.xp  + 75,
          });

          // Auto-complete any fitness-related habits scheduled for today
          const todayDs = new Date().toISOString().slice(0, 10);
          const autoEntries: import('@/types').HabitEntry[] = state.habitDefs
            .filter(h =>
              isFitnessHabit(h.name, h.emoji) &&
              habitDueOn(h, todayDs) &&
              !state.habitLog.some(e => e.habitId === h.id && e.date === todayDs)
            )
            .map(h => ({ id: generateId(), habitId: h.id, date: todayDs }));

          const newHabitLog = [...state.habitLog, ...autoEntries];

          const newGymSessions = [...state.gymSessions, session];
          const updatedGymExp = maybeProgressGymExp(state.gymExperience, newGymSessions.length);

          if (newStats.level > state.stats.level) {
            return { gymSessions: newGymSessions, habitLog: newHabitLog, stats: newStats, gymExperience: updatedGymExp, showLevelUp: true, levelUpMessage: `Level ${newStats.level} Reached!` };
          }
          return { gymSessions: newGymSessions, habitLog: newHabitLog, stats: newStats, gymExperience: updatedGymExp };
        }),

      removeGymSession: (sessionId) =>
        set((state) => ({
          gymSessions: state.gymSessions.filter(s => s.id !== sessionId),
        })),

      addHabit: (def) => {
        const id = generateId();
        const autoStat: PerformanceStat | null = def.linkedStatId ? null : {
          id: generateId(), name: def.name,
          ...inferStatConfig(def.name, def.emoji),
        };
        const linkedStatId = def.linkedStatId ?? autoStat?.id;
        set((state) => ({
          habitDefs: [...state.habitDefs, { ...def, id, linkedStatId, createdAt: new Date().toISOString() }],
          performanceStats: autoStat ? [...state.performanceStats, autoStat] : state.performanceStats,
        }));
        return id;
      },

      updateHabit: (id, patch) =>
        set((state) => ({
          habitDefs: state.habitDefs.map((h) => h.id === id ? { ...h, ...patch } : h),
        })),

      removeHabit: (id) =>
        set((state) => {
          const habit = state.habitDefs.find(h => h.id === id);
          const linkedPlanId = habit?.linkedPlanId;
          const linkedStatId = habit?.linkedStatId;
          return {
            habitDefs:       state.habitDefs.filter((h) => h.id !== id),
            habitLog:        state.habitLog.filter((e) => e.habitId !== id),
            gymPlans:        linkedPlanId ? state.gymPlans.filter(p => p.id !== linkedPlanId) : state.gymPlans,
            gymSessions:     linkedPlanId ? state.gymSessions.filter(s => s.planId !== linkedPlanId) : state.gymSessions,
            performanceStats: linkedStatId ? state.performanceStats.filter(s => s.id !== linkedStatId) : state.performanceStats,
            performanceLog:  linkedStatId ? state.performanceLog.filter(e => e.statId !== linkedStatId) : state.performanceLog,
          };
        }),

      logHabit: (habitId, date) =>
        set((state) => {
          if (state.habitLog.some((e) => e.habitId === habitId && e.date === date)) return {};
          const entry: HabitEntry = { id: generateId(), habitId, date };

          // If this is a fitness-related habit, also log a gym session (habit → gym sync)
          const habit = state.habitDefs.find(h => h.id === habitId);
          let extraSessions: GymSession[] = [];
          let fitnessXp = 0;
          if (habit && isFitnessHabit(habit.name, habit.emoji)) {
            const todayDow = new Date(date + 'T00:00:00').getDay();
            const plan = state.gymPlans.find(p => p.scheduleDays.includes(todayDow)) ?? state.gymPlans[0];
            if (plan && !state.gymSessions.some(s => s.planId === plan.id && s.date.slice(0, 10) === date)) {
              extraSessions = [{ id: generateId(), planId: plan.id, date: new Date().toISOString() }];
              fitnessXp = 55; // bonus XP for a fitness habit
            }
          }

          const newStats = tryLevelUp(state.stats, { xp: state.stats.xp + 20 + fitnessXp });
          if (newStats.level > state.stats.level) {
            return { habitLog: [...state.habitLog, entry], gymSessions: [...state.gymSessions, ...extraSessions], stats: newStats, showLevelUp: true, levelUpMessage: `Level ${newStats.level} Reached!` };
          }
          return { habitLog: [...state.habitLog, entry], gymSessions: [...state.gymSessions, ...extraSessions], stats: newStats };
        }),

      unlogHabit: (habitId, date) =>
        set((state) => ({
          habitLog: state.habitLog.filter((e) => !(e.habitId === habitId && e.date === date)),
        })),

      addCalendarEvent: (event) =>
        set((state) => ({
          calendarEvents: [...state.calendarEvents, { ...event, id: generateId() }],
        })),

      updateCalendarEvent: (id, patch) =>
        set((state) => ({
          calendarEvents: state.calendarEvents.map((e) => e.id === id ? { ...e, ...patch } : e),
        })),

      deleteCalendarEvent: (id) =>
        set((state) => ({
          calendarEvents: state.calendarEvents.filter((e) => e.id !== id),
        })),

      logVice: (viceDefId, count) =>
        set((state) => {
          const def = state.viceDefs.find((d) => d.id === viceDefId);
          if (!def) return {};
          const goldSaved = def.goldRate * count;
          const entry: ViceEntry = { id: generateId(), type: viceDefId, count, date: new Date().toISOString(), goldSaved };
          return {
            vices: [...state.vices, entry],
            stats: { ...state.stats, gold: state.stats.gold + goldSaved },
          };
        }),

      addGymEntry: (exercises) =>
        set((state) => {
          const entry: GymEntry = { id: generateId(), date: new Date().toISOString(), exercises };
          const newStats = tryLevelUp(state.stats, {
            str: state.stats.str + STAT_GAINS.gym.str,
            con: state.stats.con + STAT_GAINS.gym.con,
            dex: state.stats.dex + STAT_GAINS.gym.dex,
            xp:  state.stats.xp  + 75,
          });
          if (newStats.level > state.stats.level) {
            return { gymLog: [...state.gymLog, entry], stats: newStats, showLevelUp: true, levelUpMessage: `Level ${newStats.level} Reached!` };
          }
          return { gymLog: [...state.gymLog, entry], stats: newStats };
        }),

      setWakeTarget: (time) =>
        set((state) => ({ wakeQuest: { ...state.wakeQuest, targetTime: time } })),

      setBedTime: (time) => set({ bedTime: time }),

      checkInWake: (actualTime, date) =>
        set((state) => {
          const dateStr = date ?? new Date().toISOString().slice(0, 10);
          // Remove any existing check-in for this date before adding new one
          const filtered = state.wakeQuest.checkIns.filter(c => c.date !== dateStr);
          const [tH, tM] = state.wakeQuest.targetTime.split(':').map(Number);
          const [aH, aM] = actualTime.split(':').map(Number);
          const onTime = (aH * 60 + aM) <= (tH * 60 + tM) + 15;
          const checkIn = { id: generateId(), date: dateStr, actualTime, onTime };

          if (!onTime) {
            return { wakeQuest: { ...state.wakeQuest, checkIns: [...filtered, checkIn] } };
          }

          const newStats = tryLevelUp(state.stats, {
            con:  state.stats.con  + STAT_GAINS.wake_ontime.con,
            dex:  state.stats.dex  + STAT_GAINS.wake_ontime.dex,
            gold: state.stats.gold + STAT_GAINS.wake_ontime.gold,
            xp:   state.stats.xp   + 30,
          });

          if (newStats.level > state.stats.level) {
            return {
              wakeQuest: { ...state.wakeQuest, checkIns: [...filtered, checkIn] },
              stats: newStats, showLevelUp: true, levelUpMessage: `Level ${newStats.level} Reached!`,
            };
          }
          return { wakeQuest: { ...state.wakeQuest, checkIns: [...filtered, checkIn] }, stats: newStats };
        }),

      logSleep: (date, onTime) =>
        set((state) => {
          const filtered = state.sleepLog.filter(e => e.date !== date);
          return { sleepLog: [...filtered, { id: generateId(), date, onTime }] };
        }),

      deleteSleepEntry: (id) =>
        set((state) => ({ sleepLog: state.sleepLog.filter(e => e.id !== id) })),

      deleteWakeCheckIn: (id) =>
        set((state) => ({
          wakeQuest: { ...state.wakeQuest, checkIns: state.wakeQuest.checkIns.filter(c => c.id !== id) },
        })),

      dismissLevelUp: () => set({ showLevelUp: false, levelUpMessage: '' }),

      setCharacterAppearance: (appearance) =>
        set((state) => ({
          characterAppearance: { ...state.characterAppearance, ...appearance },
        })),

      setNutritionGoal: (goal) => set({ nutritionGoal: goal }),
      setSavedGymPrefs: (prefs) => set({ savedGymPrefs: prefs }),
      setSavedNutritionPrefs: (prefs) => set({ savedNutritionPrefs: prefs }),
      setActivityLevel: (level) =>
        set((state) => ({ characterAppearance: { ...state.characterAppearance, activityLevel: level } })),

      setPrimaryGoals: (goals) => set({ primaryGoals: goals }),
      logWeight: (date, weight) =>
        set((state) => {
          const filtered = state.weightLog.filter(e => e.date !== date);
          return { weightLog: [...filtered, { date, weight }].sort((a, b) => a.date.localeCompare(b.date)) };
        }),
      logBodyComposition: (entry) =>
        set((state) => ({
          bodyCompositionLog: [...state.bodyCompositionLog, { ...entry, id: generateId() }],
        })),
      addToMealLibrary: (meal) =>
        set((state) => ({ savedMealLibrary: [...state.savedMealLibrary, { ...meal, id: generateId() }] })),
      removeFromMealLibrary: (id) =>
        set((state) => ({ savedMealLibrary: state.savedMealLibrary.filter(m => m.id !== id) })),

      logMeal: (meal, date) =>
        set((state) => {
          const today = date ?? new Date().toISOString().slice(0, 10);
          const entry: MealEntry = { ...meal, id: generateId(), date: today };
          const newStats = tryLevelUp(state.stats, { xp: state.stats.xp + 10 });
          if (newStats.level > state.stats.level) {
            return { mealLog: [...state.mealLog, entry], stats: newStats, showLevelUp: true, levelUpMessage: `Level ${newStats.level} Reached!` };
          }
          return { mealLog: [...state.mealLog, entry], stats: newStats };
        }),

      deleteMeal: (id) =>
        set((state) => ({ mealLog: state.mealLog.filter((m) => m.id !== id) })),

      addPerformanceStat: (stat) =>
        set((state) => ({ performanceStats: [...state.performanceStats, { ...stat, id: stat.id ?? generateId() }] })),

      removePerformanceStat: (id) =>
        set((state) => ({
          performanceStats: state.performanceStats.filter((s) => s.id !== id),
          performanceLog:   state.performanceLog.filter((e) => e.statId !== id),
        })),

      logPerformanceEntry: (entry) =>
        set((state) => ({ performanceLog: [...state.performanceLog, { ...entry, id: generateId() }] })),

      deletePerformanceEntry: (id) =>
        set((state) => ({ performanceLog: state.performanceLog.filter((e) => e.id !== id) })),

      purchaseOutfit: (id) => {
        const OUTFIT_PRICE = 100000;
        const state = useGameStore.getState();
        if (state.unlockedOutfits.includes(id) || state.stats.gold < OUTFIT_PRICE) return false;
        set((s) => ({
          unlockedOutfits: [...s.unlockedOutfits, id],
          stats: { ...s.stats, gold: s.stats.gold - OUTFIT_PRICE },
        }));
        return true;
      },

      logSteps: (date, steps, source) =>
        set((state) => {
          // Upsert: replace existing entry for the same date
          const existing   = state.stepLog.find(e => e.date === date);
          const alreadyRewarded = existing?.rewarded ?? false;
          const filtered   = state.stepLog.filter(e => e.date !== date);
          const entry: StepEntry = { id: existing?.id ?? generateId(), date, steps, source, rewarded: alreadyRewarded };

          // Award stats if not yet rewarded today and steps cross a threshold
          let statsUpdate: Partial<CharacterStats> = {};
          if (!alreadyRewarded) {
            if (steps >= 15000)      statsUpdate = { dex: state.stats.dex + 3, con: state.stats.con + 2, xp: state.stats.xp + 15 };
            else if (steps >= 10000) statsUpdate = { dex: state.stats.dex + 2, con: state.stats.con + 1, xp: state.stats.xp + 10 };
            else if (steps >= 5000)  statsUpdate = { dex: state.stats.dex + 1, xp: state.stats.xp + 5 };
          }
          const rewarded = !alreadyRewarded && steps >= 5000;
          const finalEntry = { ...entry, rewarded: alreadyRewarded || rewarded };
          const newStats = Object.keys(statsUpdate).length ? tryLevelUp({ ...state.stats, ...statsUpdate }) : state.stats;

          // Upsert performance entry for this date under the built-in steps stat
          const STEPS_STAT_ID = 'builtin-steps';
          const existingPerfEntry = state.performanceLog.find(e => e.statId === STEPS_STAT_ID && e.date === date);
          const filteredPerf = state.performanceLog.filter(e => !(e.statId === STEPS_STAT_ID && e.date === date));
          const perfEntry: PerformanceEntry = { id: existingPerfEntry?.id ?? generateId(), statId: STEPS_STAT_ID, date, value: steps };

          return {
            stepLog: [...filtered, finalEntry],
            stats: newStats,
            performanceLog: [...filteredPerf, perfEntry],
            ...(newStats.level > state.stats.level ? { showLevelUp: true, levelUpMessage: `Level ${newStats.level} Reached!` } : {}),
          };
        }),

      deleteStep: (id) => set(state => ({ stepLog: state.stepLog.filter(e => e.id !== id) })),

      setStepGoal: (goal) => set({ stepGoal: goal }),
      setFloorsGoal: (goal) => set({ floorsGoal: goal }),

      addWaterEntry: (date, amount, label) => set(state => {
        const entry: WaterEntry = { id: generateId(), date, amount, ...(label ? { label } : {}) };
        const newLog = [...state.waterLog, entry];
        // Auto-complete any "drink water" habit scheduled for today
        const today = new Date().toISOString().slice(0, 10);
        if (date === today) {
          const todayTotal = newLog.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
          if (todayTotal >= state.waterGoal) {
            const waterHabit = state.habitDefs.find(h =>
              /drink.*water|water.*intake|hydrat/i.test(h.name) && !h.linkedPlanId
            );
            if (waterHabit) {
              const alreadyLogged = state.habitLog.some(e => e.habitId === waterHabit.id && e.date === today);
              if (!alreadyLogged) {
                return {
                  waterLog: newLog,
                  habitLog: [...state.habitLog, { id: generateId(), habitId: waterHabit.id, date: today }],
                };
              }
            }
          }
        }
        return { waterLog: newLog };
      }),
      deleteWaterEntry: (id) => set(state => ({ waterLog: state.waterLog.filter(e => e.id !== id) })),
      setWaterGoal: (goal) => set({ waterGoal: goal }),

      recordAppOpen: () => set((state) => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        if (state.lastOpenedDate === todayStr) return {};
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        const newStreak = state.lastOpenedDate === yesterdayStr ? state.loginStreak + 1 : 1;
        return { loginStreak: newStreak, lastOpenedDate: todayStr };
      }),
      setSnapshotHiddenBuiltins: (ids) => set({ snapshotHiddenBuiltins: ids }),
      setSnapshotAddedOptional:  (ids) => set({ snapshotAddedOptional: ids }),
      setDetailCellOverride: (key, value) => set(s => {
        const next = { ...s.detailCellOverrides };
        if (value === null) delete next[key]; else next[key] = value;
        return { detailCellOverrides: next };
      }),

      setGoogleFitTokens: (tokens) => set({ googleFitTokens: tokens }),

      addSubscription: (sub) =>
        set((state) => ({ subscriptions: [...state.subscriptions, { ...sub, id: generateId() }] })),

      updateSubscription: (id, patch) =>
        set((state) => ({ subscriptions: state.subscriptions.map(s => s.id === id ? { ...s, ...patch } : s) })),

      removeSubscription: (id) =>
        set((state) => ({ subscriptions: state.subscriptions.filter(s => s.id !== id) })),

      setPaycheckIncome: (income) => set({ paycheckIncome: income }),
      setPaycheckFrequency: (freq) => set({ paycheckFrequency: freq }),
      setIncomeMode: (mode) => set({ incomeMode: mode }),
      addPaycheckEntry: (entry) =>
        set((state) => ({ paycheckLog: [...state.paycheckLog, { ...entry, id: generateId() }] })),
      removePaycheckEntry: (id) =>
        set((state) => ({ paycheckLog: state.paycheckLog.filter(e => e.id !== id) })),

      addBudgetItem: (item) =>
        set((state) => ({ budgetItems: [...state.budgetItems, { ...item, id: generateId() }] })),

      removeBudgetItem: (id) =>
        set((state) => ({ budgetItems: state.budgetItems.filter(i => i.id !== id) })),

      updateBudgetItem: (id, patch) =>
        set((state) => ({ budgetItems: state.budgetItems.map(i => i.id === id ? { ...i, ...patch } : i) })),

      addSpendingEntry: (entry) =>
        set((state) => ({ spendingLog: [...state.spendingLog, { ...entry, id: generateId() }] })),

      removeSpendingEntry: (id) =>
        set((state) => ({ spendingLog: state.spendingLog.filter(e => e.id !== id) })),

      shareLocation: false,
      setShareLocation: (v) => set({ shareLocation: v }),

      gpsTrackingEnabled: true,
      setGpsTrackingEnabled: (v) => set({ gpsTrackingEnabled: v }),
      gpsActivities: [],
      addGpsActivity: (a) => set((state) => {
        const STAT_DEFS: Record<string, Omit<PerformanceStat, 'id'>> = {
          run:   { name: 'Running',  emoji: '🏃', color: '#ef4444', unit: 'km', higherIsBetter: true, hasSecondary: true, secondaryUnit: 'min', secondaryLabel: 'Duration' },
          cycle: { name: 'Cycling',  emoji: '🚴', color: '#3b82f6', unit: 'km', higherIsBetter: true, hasSecondary: true, secondaryUnit: 'min', secondaryLabel: 'Duration' },
          walk:  { name: 'Walking',  emoji: '🚶', color: '#34c759', unit: 'km', higherIsBetter: true, hasSecondary: true, secondaryUnit: 'min', secondaryLabel: 'Duration' },
        };
        const statId = `builtin-gps-${a.type}`;
        const existingStat = state.performanceStats.find(s => s.id === statId);
        const newStats = existingStat ? state.performanceStats : [...state.performanceStats, { id: statId, ...STAT_DEFS[a.type] }];
        const entry: PerformanceEntry = {
          id: generateId(),
          statId,
          date: a.startTime.slice(0, 10),
          value: Math.round(a.distance * 100) / 100,
          secondaryValue: Math.round(a.duration / 60 * 10) / 10,
          notes: `${a.coords.length} GPS points`,
        };
        const newGpsActivities = [a, ...state.gpsActivities];
        const runCount = newGpsActivities.filter(g => g.type === 'run').length;
        const updatedRunExp = maybeProgressRunExp(state.runExperience, runCount);

        return {
          gpsActivities: newGpsActivities,
          performanceStats: newStats,
          performanceLog: [...state.performanceLog, entry],
          runExperience: updatedRunExp,
        };
      }),
      deleteGpsActivity: (id) => set((state) => ({ gpsActivities: state.gpsActivities.filter(a => a.id !== id) })),
    }),
    {
      name: 'questlog-storage',
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<typeof current>;
        const BUILTIN_STEPS:  PerformanceStat = { id: 'builtin-steps',  name: 'Daily Steps',    emoji: '👟', color: '#4a9eff', unit: 'steps',  higherIsBetter: true, hasSecondary: false };
        const BUILTIN_FLOORS: PerformanceStat = { id: 'builtin-floors', name: 'Floors Climbed', emoji: '🏢', color: '#af52de', unit: 'floors', higherIsBetter: true, hasSecondary: false };
        const stats = p.performanceStats ?? current.performanceStats;
        let merged = stats.some((s: PerformanceStat) => s.id === 'builtin-steps')  ? stats : [BUILTIN_STEPS,  ...stats];
        merged      = merged.some((s: PerformanceStat) => s.id === 'builtin-floors') ? merged : [merged[0], BUILTIN_FLOORS, ...merged.slice(1)];
        const REFERENCE_APPEARANCE = {
          race: 'human' as const,
          gender: 'masculine' as const,
          skinTone: '#ffe0bd',
          hairStyle: 0,
          hairColor: '#8b5230',
          eyeColor: '#3d7a2b',
          beardStyle: 0,
          outfit: 'default' as const,
          outfitColor: '#2a1848',
        };
        const existingAppearance = p.characterAppearance ?? current.characterAppearance;
        const characterAppearance = {
          ...REFERENCE_APPEARANCE,   // defaults fill any missing fields added in new versions
          ...existingAppearance,     // user's saved values always win
        };
        // Set accountCreatedDate for existing users who don't have it yet
        const accountCreatedDate = p.accountCreatedDate ?? new Date().toISOString().slice(0, 10);
        return {
          ...current,
          ...p,
          performanceStats: merged,
          characterAppearance,
          accountCreatedDate,
        };
      },
    }
  )
);
