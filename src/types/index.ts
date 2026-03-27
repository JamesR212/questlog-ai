export interface CharacterStats {
  str: number;
  con: number;
  dex: number;
  gold: number;
  level: number;
  xp: number;
  xpToNext: number;
}

export interface Quest {
  id: string;
  title: string;
  category: QuestCategory;
  description: string;
  target: number;
  current: number;
  unit: string;
  completed: boolean;
  createdAt: string;
}

export type QuestCategory = 'money' | 'fitness' | 'sleep' | 'gym';

export interface ViceEntry {
  id: string;
  type: string; // ViceDef.id
  count: number;
  date: string;
  goldSaved: number;
}

export type ViceType = 'pints' | 'cigs' | 'junk';

export interface ViceDef {
  id: string;
  name: string;
  icon: string;
  goldRate: number;
  builtIn?: boolean;
}

export interface GymEntry {
  id: string;
  date: string;
  exercises: Exercise[];
}

export interface Exercise {
  id: string;
  name: string;
  sets: Set[];
}

export interface Set {
  reps: number;
  weight: number;
}

export interface HabitDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
  scheduleType: 'days' | 'fortnightly';
  scheduleDays: number[];                // 0=Sun..6=Sat; weekly days or fortnightly Week A
  scheduleWeekBDays: number[];           // fortnightly Week B days
  dayTimes: Record<string, string>;      // day-of-week index → start 'HH:MM'
  dayEndTimes: Record<string, string>;   // day-of-week index → end 'HH:MM' (optional)
  reminderTime: string;                  // 'HH:MM' or '' — notification time
  createdAt: string;
  linkedStatId?: string;
  linkedPlanId?: string;                 // GymPlan.id this habit was created from
}

export interface HabitEntry {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
}

export interface WakeQuest {
  targetTime: string;
  checkIns: WakeCheckIn[];
}

export interface WakeCheckIn {
  id: string;
  date: string;     // YYYY-MM-DD
  actualTime: string;
  onTime: boolean;
}

export interface SleepEntry {
  id: string;
  date: string;   // YYYY-MM-DD
  onTime: boolean;
}

export type ActiveSection = 'dashboard' | 'calendar' | 'vices' | 'habits' | 'gym' | 'nutrition' | 'settings' | 'training' | 'social' | 'leaderboard' | 'feedback';

export interface NutritionGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
}

export interface Micros {
  vitA?: number;      // µg   RDA 700
  vitC?: number;      // mg   RDA 80
  vitD?: number;      // µg   RDA 15
  vitE?: number;      // mg   RDA 15
  vitK?: number;      // µg   RDA 75
  vitB6?: number;     // mg   RDA 1.4
  vitB12?: number;    // µg   RDA 2.4
  folate?: number;    // µg   RDA 200
  calcium?: number;   // mg   RDA 800
  iron?: number;      // mg   RDA 14
  magnesium?: number; // mg   RDA 375
  zinc?: number;      // mg   RDA 10
  potassium?: number; // mg   RDA 2000
  sodium?: number;    // mg   limit 2300
}

export interface SavedMealItem {
  id: string;
  name: string;
  category: string; // 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Bulk Cook' | 'Other'
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  micros?: Micros;
  ingredients?: string; // free-text ingredient list
  recipe?: string;      // full method / instructions
}

export interface MealEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  date: string; // YYYY-MM-DD
  micros?: Micros;
}

export interface GymExercise {
  id: string;
  name: string;
  sets: number;
  targetReps: number;
  targetWeight: number; // 0 = bodyweight
}

export interface GymPlan {
  id: string;
  name: string;
  emoji: string;
  color: string;
  exercises: GymExercise[];
  scheduleDays: number[];                   // 0=Sun..6=Sat
  scheduleTime: string;                     // 'HH:MM' or '' (legacy / fallback)
  scheduleEndTime: string;                  // 'HH:MM' or '' (legacy / fallback)
  dayTimes?: Record<string, string>;        // day-of-week index → 'HH:MM'
  dayEndTimes?: Record<string, string>;     // day-of-week index → 'HH:MM'
  createdAt: string;
  linkedHabitId?: string;                   // HabitDef.id created alongside this plan
  linkedStatId?: string;                    // PerformanceStat.id auto-created for this plan
}

export interface GymSession {
  id: string;
  planId: string;
  date: string; // ISO
}

export interface BodyCompositionEntry {
  id: string;
  date: string;       // YYYY-MM-DD
  bodyFatLow?: number;  // % lower bound estimate
  bodyFatHigh?: number; // % upper bound estimate
  build?: string;       // e.g. "athletic", "lean", "average"
  notes: string;        // AI summary text
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM (empty if allDay)
  endTime: string;     // HH:MM (empty if allDay)
  allDay: boolean;
  location: string;
  notes: string;
  color: string;       // hex
  reminder: number;    // minutes before, 0 = none
}

export interface PerformanceStat {
  id: string;
  name: string;
  emoji: string;
  color: string;
  unit: string;             // primary unit label: 'kg', 'km', 'miles', 'min', 'sec', etc.
  higherIsBetter: boolean;  // false for time-based stats (lower = faster = better)
  hasSecondary: boolean;    // e.g. a run logs distance + time
  secondaryUnit?: string;   // e.g. 'min'
  secondaryLabel?: string;  // e.g. 'Time'
}

export interface PerformanceEntry {
  id: string;
  statId: string;
  date: string;             // YYYY-MM-DD
  value: number;
  secondaryValue?: number;
  notes?: string;
}

export type Race = 'human' | 'elf' | 'orc' | 'dwarf' | 'undead';
export type GenderPresentation = 'masculine' | 'feminine' | 'neutral';
export type Outfit = 'default' | 'jeans' | 'hoodie' | 'tshirt' | 'ninja' | 'pirate' | 'princess';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface CharacterAppearance {
  race: Race;
  gender: GenderPresentation;
  skinTone: string;
  hairStyle: number; // 0-9
  hairColor: string;
  eyeColor: string;   // iris colour; default '#1a1a2e'
  beardStyle: number; // 0=none, 1=stubble, 2=short, 3=full, 4=braided
  age: number; // 18-60
  startingWeight: number; // 50-140 kg
  height: number; // 150-200 cm
  activityLevel: ActivityLevel;
  hasCreated: boolean;
  outfit?: Outfit;
  outfitColor?: string; // hex — overrides main colour of jeans/hoodie/tshirt
}

export type Theme = 'dark' | 'white' | 'pink' | 'blue' | 'green';

export interface WeightEntry {
  date: string;   // YYYY-MM-DD
  weight: number; // always kg
}

export interface StepEntry {
  id: string;
  date: string;       // YYYY-MM-DD
  steps: number;
  source: 'manual' | 'google_fit';
  rewarded?: boolean; // XP/stat reward already given
}

export interface GoogleFitTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms
}


export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type SubscriptionCategory = 'entertainment' | 'health' | 'utilities' | 'food' | 'transport' | 'other';

export interface Subscription {
  id: string;
  name: string;
  emoji: string;
  amount: number;
  cycle: 'weekly' | 'monthly' | 'annual';
  category: SubscriptionCategory;
  startDate?: string; // YYYY-MM-DD
  syncToCalendar?: boolean;
  linkedCalendarEventIds?: string[];
}

export type BudgetBucket = 'needs' | 'wants' | 'savings';

export interface BudgetItem {
  id: string;
  bucket: BudgetBucket;
  name: string;
  emoji: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'annual' | 'one_off';
  startDate?: string; // YYYY-MM-DD
  pinToHome: boolean;
  syncToCalendar?: boolean;
  linkedCalendarEventIds?: string[];
}

export interface SpendingEntry {
  id: string;
  budgetItemId: string;
  amount: number;
  note: string;
  date: string; // YYYY-MM-DD
}

export interface PaycheckEntry {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
}
