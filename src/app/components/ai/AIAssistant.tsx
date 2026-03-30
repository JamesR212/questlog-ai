'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { SavedMealItem } from '@/types';

interface Message {
  role: 'user' | 'ai';
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  loadingLabel?: string;
  pendingFoodLog?: PendingFoodLog;
  isPlanBuilding?: boolean; // shows construction progress animation
  planBuildingType?: 'gym' | 'meal'; // controls animation labels/emojis
}

interface PendingMeal {
  name: string; calories: number; protein: number; carbs: number; fat: number; saturatedFat?: number; unsaturatedFat?: number; sugar: number;
}
interface PendingFoodLog {
  date: string;
  dateLabel: string;
  meals: PendingMeal[];
  confirmed?: boolean;
}

// Classify a calendar event title into an activity type for advice purposes
function classifyEvent(title: string, notes: string): string {
  const t = (title + ' ' + notes).toLowerCase();
  if (/\b(run|running|jog|5k|10k|half marathon|marathon|parkrun)\b/.test(t)) return 'running';
  if (/\b(gym|weights|lift|workout|training|wod|crossfit|hiit|circuit)\b/.test(t)) return 'gym';
  if (/\b(swim|swimming|pool|laps)\b/.test(t)) return 'swimming';
  if (/\b(cycle|cycling|bike|biking|spin)\b/.test(t)) return 'cycling';
  if (/\b(football|rugby|basketball|tennis|squash|badminton|hockey|sport|match|game|tournament)\b/.test(t)) return 'sport';
  if (/\b(yoga|pilates|stretch|mobility|flexibility)\b/.test(t)) return 'yoga/mobility';
  if (/\b(hike|hiking|walk|walking|trek)\b/.test(t)) return 'hiking';
  if (/\b(rest|recovery|rest day)\b/.test(t)) return 'rest';
  if (/\b(meal prep|cook|dinner|lunch|breakfast|eat|restaurant|food)\b/.test(t)) return 'meal';
  if (/\b(sleep|nap|bed|early night)\b/.test(t)) return 'sleep';
  if (/\b(work|meeting|office|shift|busy|presentation|deadline)\b/.test(t)) return 'work';
  if (/\b(travel|flight|drive|commute|trip|holiday|abroad)\b/.test(t)) return 'travel';
  return 'general';
}

function buildUserContext(store: ReturnType<typeof useGameStore.getState>) {
  const today    = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const in7Days  = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const recentHabits = store.habitLog.filter(h => {
    const d = new Date(h.date); const now = new Date();
    return (now.getTime() - d.getTime()) < 7 * 86400000;
  });
  const todaySteps    = store.stepLog.find(s => s.date === today)?.steps ?? 0;
  // Sleep analysis — last 14 entries
  const recentSleepEntries = store.sleepLog.slice(-14);
  const sleepOnTimeCount = recentSleepEntries.filter(s => s.onTime).length;
  const sleepPct = recentSleepEntries.length > 0 ? Math.round((sleepOnTimeCount / recentSleepEntries.length) * 100) : null;
  const sleepSummary = recentSleepEntries.length === 0 ? 'no data'
    : `${sleepOnTimeCount}/${recentSleepEntries.length} nights on time (${sleepPct}%) — last 3: ${recentSleepEntries.slice(-3).map(s => s.onTime ? '✓' : '✗').join(' ')}`;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const todayMeals     = store.mealLog.filter(m => m.date === today);
  const yesterdayMeals = store.mealLog.filter(m => m.date === yesterday);
  const totalCalories  = todayMeals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
  const totalProtein   = todayMeals.reduce((sum, m) => sum + (m.protein ?? 0), 0);
  const totalCarbs     = todayMeals.reduce((sum, m) => sum + (m.carbs ?? 0), 0);
  const totalFat       = todayMeals.reduce((sum, m) => sum + (m.fat ?? 0), 0);
  const totalWater     = store.waterLog.filter(w => w.date === today).reduce((sum, w) => sum + w.amount, 0);

  // Full meal history grouped by date (most recent first)
  const allMealDates = [...new Set(store.mealLog.filter(m => m.date < today).map(m => m.date))].sort().reverse();
  const fullMealHistory = allMealDates.map(date => {
    const meals = store.mealLog.filter(m => m.date === date);
    const cals = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
    const prot = meals.reduce((s, m) => s + (m.protein ?? 0), 0);
    const carbs = meals.reduce((s, m) => s + (m.carbs ?? 0), 0);
    const fat  = meals.reduce((s, m) => s + (m.fat ?? 0), 0);
    return `  ${date}: ${meals.map(m => `${m.name} (${m.calories}kcal P:${m.protein}g C:${m.carbs}g F:${m.fat}g)`).join(', ')} | day total: ${cals}kcal P:${prot}g C:${carbs}g F:${fat}g`;
  }).join('\n') || '  No meal history';

  // All gym sessions
  const allGymSessions = [...store.gymSessions].reverse().map(s => {
    const plan = store.gymPlans.find(p => p.id === s.planId);
    return `  ${s.date}: ${plan?.name ?? s.planId ?? 'Session'}`;
  }).join('\n') || '  No gym sessions logged';

  const recentGym = store.gymSessions.slice(-3).map(s => s.planId).join(', ');

  // Full step log
  const stepHistory = [...store.stepLog].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90)
    .map(s => `  ${s.date}: ${s.steps.toLocaleString()} steps`).join('\n') || '  No step data';

  // Full sleep log
  const fullSleepLog = [...store.sleepLog].reverse().slice(0, 90)
    .map(s => `  ${s.date}: ${s.onTime ? 'on time' : 'late'}`).join('\n') || '  No sleep data';

  // Full weight log
  const fullWeightLog = [...store.weightLog].sort((a, b) => a.date.localeCompare(b.date))
    .map(w => `  ${w.date}: ${w.weight}kg`).join('\n') || '  No weight data';

  // Performance stats — all entries per stat
  const perfStatsContext = store.performanceStats.length === 0 ? '  None tracked' :
    store.performanceStats.map(stat => {
      const entries = store.performanceLog
        .filter(e => e.statId === stat.id)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (entries.length === 0) return `  ${stat.emoji} ${stat.name} (${stat.unit}): no entries yet`;
      const best = stat.higherIsBetter
        ? entries.reduce((b, e) => e.value > b.value ? e : b)
        : entries.reduce((b, e) => e.value < b.value ? e : b);
      const latest = entries[entries.length - 1];
      const history = entries.map(e => `${e.date}:${e.value}${stat.unit}${e.secondaryValue ? '/'+e.secondaryValue+stat.secondaryUnit : ''}`).join(' ');
      return `  ${stat.emoji} ${stat.name} (${stat.unit}): latest=${latest.value} on ${latest.date}, best=${best.value} on ${best.date} | history: ${history}`;
    }).join('\n');
  const savingsSoFar  = store.vices.reduce((sum, v) => sum + (v.goldSaved ?? 0), 0);

  // RPG stats
  const rpgStats = `Level ${store.stats.level} — XP: ${store.stats.xp}/${store.stats.xpToNext} | STR: ${store.stats.str} / CON: ${store.stats.con} / DEX: ${store.stats.dex} / GOLD: ${store.stats.gold}`;

  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // Habit definitions
  const habitDefs = store.habitDefs.length === 0 ? '  None' :
    store.habitDefs.map(h =>
      `  ${h.emoji} ${h.name} — days: ${h.scheduleDays.map(d => dayNames[d]).join(',')} | completions: ${store.habitLog.filter(l => l.habitId === h.id).length}`
    ).join('\n');

  // Gym plans — full details so AI can read before editing
  const gymPlansContext = store.gymPlans.length === 0 ? '  None' :
    store.gymPlans.map(p => {
      // Show both names AND numeric values so AI can patch scheduleDays correctly
      const dayStr  = p.scheduleDays.map(d => `${dayNames[d]}(${d})`).join(',');
      const fmtEx   = (e: import('@/types').GymExercise) =>
        `${e.name} ${e.sets}x${e.targetReps}${e.targetWeight > 0 ? `@${e.targetWeight}kg` : '(bw)'}[id:${e.id}]`;
      const exList  = (p.exercises ?? []).map(fmtEx).join('; ');
      // Show ALL weeks in full so AI can reproduce them accurately when patching
      const weekSum = p.weeks && p.weeks.length > 0
        ? ` | ${p.weeks.length} progressive weeks:\n${p.weeks.map(w =>
            `      wk${w.weekNumber}${w.label ? ' ' + w.label : ''}: ${(w.exercises ?? []).map(fmtEx).join('; ')}`
          ).join('\n')}`
        : '';
      const splitStr   = p.split         ? ` | split: ${p.split}`           : '';
      const recovStr   = p.recoveryNotes ? ` | recovery: ${p.recoveryNotes}` : '';
      const repeatStr  = p.isRepeating   ? ' | repeating'                    : '';
      const timeStr    = p.scheduleTime  ? ` | time: ${p.scheduleTime}–${p.scheduleEndTime}` : '';
      return `  [id:${p.id}] ${p.emoji} ${p.name} — scheduleDays: [${p.scheduleDays.join(',')}] (${dayStr})${timeStr}${splitStr}${repeatStr} — exercises: ${exList || 'none'}${weekSum}${recovStr}`;
    }).join('\n');

  // Recent GPS activities
  const recentGps = store.gpsActivities.slice(-20).reverse().map(a =>
    `  ${a.startTime?.slice(0,10) ?? 'unknown'}: ${a.type} — ${a.distance ? a.distance.toFixed(2) + 'km' : ''} ${a.duration ? Math.round(a.duration / 60) + 'min' : ''} ${a.elevationGain ? a.elevationGain + 'm gain' : ''}`
  ).join('\n') || '  No GPS activities';

  // Wake quest
  const wakeContext = store.wakeQuest.targetTime
    ? `Target wake time: ${store.wakeQuest.targetTime} — check-ins: ${store.wakeQuest.checkIns?.length ?? 0} total — recent: ${(store.wakeQuest.checkIns ?? []).slice(-7).map(c => c.onTime ? '✓' : '✗').join(' ')}`
    : 'Wake quest not configured';

  // Nutrition goals
  const nutritionGoalCtx = store.nutritionGoal
    ? `${store.nutritionGoal.calories}kcal | P:${store.nutritionGoal.protein}g | C:${store.nutritionGoal.carbs}g | F:${store.nutritionGoal.fat}g | Sugar:${store.nutritionGoal.sugar ?? 50}g`
    : 'Not set';

  // Subscriptions
  const subsContext = store.subscriptions && store.subscriptions.length > 0
    ? store.subscriptions.map(s =>
        `  ${s.emoji} ${s.name}: ${store.currencySymbol}${s.amount}/${s.cycle} (${s.needsWants ?? 'unsorted'})`
      ).join('\n')
    : '  None tracked';

  // Vice/spending analysis — last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const recentVices = store.vices.filter(v => v.date >= thirtyDaysAgo);
  const viceTotals: Record<string, { count: number; spent: number }> = {};
  recentVices.forEach(v => {
    const def = store.viceDefs.find(d => d.id === v.type);
    const name = def?.name ?? v.type;
    if (!viceTotals[name]) viceTotals[name] = { count: 0, spent: 0 };
    viceTotals[name].count += v.count;
    viceTotals[name].spent += (def?.goldRate ?? 0) * v.count;
  });
  const viceBreakdown = Object.entries(viceTotals).map(([name, d]) =>
    `${name}: ${d.count}x (${store.currencySymbol}${d.spent.toFixed(0)} est.)`).join(', ') || 'none';
  const totalViceSpend = Object.values(viceTotals).reduce((s, d) => s + d.spent, 0);

  const recentSpending = store.spendingLog.filter(s => s.date >= thirtyDaysAgo);
  const totalSpending = recentSpending.reduce((s, e) => s + e.amount, 0);

  // Body composition history
  const latestBodyComp = store.bodyCompositionLog.slice(-1)[0];

  // Full calendar — all events sorted by date
  const formatEvent = (e: typeof store.calendarEvents[0]) => {
    const time = e.allDay ? 'all day' : `${e.startTime}${e.endTime ? '–' + e.endTime : ''}`;
    const type = classifyEvent(e.title, e.notes);
    return `"${e.title}" (${time}${e.location ? ', ' + e.location : ''}) [${type}]${e.notes ? ' notes: ' + e.notes : ''}`;
  };
  const sortedEvents   = [...store.calendarEvents].sort((a, b) => a.date.localeCompare(b.date));
  const todayEvents    = sortedEvents.filter(e => e.date === today);
  const tomorrowEvents = sortedEvents.filter(e => e.date === tomorrow);
  const weekEvents     = sortedEvents.filter(e => e.date > today && e.date <= in7Days);
  const futureEvents   = sortedEvents.filter(e => e.date > in7Days);
  const pastEvents     = sortedEvents.filter(e => e.date < today);

  const todaySchedule    = todayEvents.length    > 0 ? todayEvents.map(formatEvent).join(' | ')                           : 'nothing scheduled';
  const tomorrowSchedule = tomorrowEvents.length > 0 ? tomorrowEvents.map(formatEvent).join(' | ')                        : 'nothing scheduled';
  const weekSchedule     = weekEvents.length     > 0 ? weekEvents.map(e => `${e.date}: ${formatEvent(e)}`).join(' | ')    : 'nothing scheduled';
  const futureSchedule   = futureEvents.length   > 0 ? futureEvents.map(e => `${e.date}: ${formatEvent(e)}`).join('\n  ') : 'nothing scheduled';
  const pastSchedule     = pastEvents.length     > 0 ? pastEvents.map(e => `${e.date}: ${formatEvent(e)}`).join('\n  ')   : 'none';

  // Classify today's activity for targeted advice
  const todayTypes = todayEvents.map(e => classifyEvent(e.title, e.notes));
  const hasRunToday      = todayTypes.includes('running');
  const hasGymToday      = todayTypes.includes('gym');
  const hasEnduranceToday = todayTypes.some(t => ['running','cycling','swimming','hiking','sport'].includes(t));
  const hasRestToday     = todayTypes.includes('rest');

  // Weight progress
  const sortedWeights  = [...store.weightLog].sort((a, b) => a.date.localeCompare(b.date));
  const firstWeight    = sortedWeights[0];
  const latestWeight   = sortedWeights[sortedWeights.length - 1];
  const startingWeight = store.characterAppearance.startingWeight ?? 0;
  const currentWeight  = latestWeight?.weight ?? startingWeight;
  const weightChange   = firstWeight ? (currentWeight - firstWeight.weight) : 0;
  const weightChangeTxt = weightChange === 0 ? 'no change recorded'
    : weightChange > 0 ? `+${weightChange.toFixed(1)}kg gained`
    : `${weightChange.toFixed(1)}kg lost`;

  // Time on app
  const joinDate = store.accountCreatedDate;
  const daysSinceJoin = joinDate ? Math.floor((Date.now() - new Date(joinDate).getTime()) / 86400000) : null;
  const timeOnApp = daysSinceJoin != null
    ? daysSinceJoin < 7 ? `${daysSinceJoin} days`
      : daysSinceJoin < 30 ? `${Math.floor(daysSinceJoin / 7)} weeks`
      : `${Math.floor(daysSinceJoin / 30)} months`
    : 'unknown';

  // Compute TDEE-based calorie need for context
  const weight = currentWeight || 75;
  const height = store.characterAppearance.height || 175;
  const age    = store.characterAppearance.age || 25;
  const activityMultiplier: Record<string, number> = {
    sedentary: 1.2, lightly_active: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  const tdee = Math.round(bmr * (activityMultiplier[store.characterAppearance.activityLevel ?? 'moderate'] ?? 1.55));
  const tdeeWithActivity = hasEnduranceToday ? Math.round(tdee + 400) : hasGymToday ? Math.round(tdee + 250) : tdee;

  return `User profile:
- Name: ${store.userName || 'User'}
- Age: ${age}, Height: ${height}cm, Current weight: ${currentWeight}kg (starting: ${firstWeight?.weight ?? startingWeight}kg, change: ${weightChangeTxt})
- Activity level: ${store.characterAppearance.activityLevel ?? 'moderate'}
- Goals: ${store.primaryGoals.length > 0 ? store.primaryGoals.join(', ') : 'not set'}
- Estimated daily calorie need (TDEE): ~${tdee} kcal baseline${hasEnduranceToday ? ` / ~${tdeeWithActivity} kcal today (endurance activity)` : hasGymToday ? ` / ~${tdeeWithActivity} kcal today (gym)` : ''}
- Nutrition goals: ${nutritionGoalCtx}
- RPG stats: ${rpgStats}
- Time on GAINN: ${timeOnApp}

CALENDAR — TODAY (${today}):
${todaySchedule}

CALENDAR — TOMORROW (${tomorrow}):
${tomorrowSchedule}

CALENDAR — THIS WEEK:
${weekSchedule}

CALENDAR — UPCOMING (beyond this week):
  ${futureSchedule}

CALENDAR — PAST EVENTS (all time):
  ${pastSchedule}

TODAY'S NUTRITION (${today}):
- Meals: ${todayMeals.length > 0 ? todayMeals.map(m => `${m.name} (${m.calories}kcal P:${m.protein}g C:${m.carbs}g F:${m.fat}g)`).join(' | ') : 'nothing logged yet'}
- Totals: ${totalCalories}kcal / P:${totalProtein}g / C:${totalCarbs}g / F:${totalFat}g${totalCalories > 0 ? ` — ${tdeeWithActivity - totalCalories > 0 ? (tdeeWithActivity - totalCalories) + ' kcal remaining' : 'calorie target met'}` : ''}
- Water: ${totalWater}ml of ${store.waterGoal}ml goal

YESTERDAY'S NUTRITION (${yesterday}):
${yesterdayMeals.length > 0
  ? `- Meals: ${yesterdayMeals.map(m => `${m.name} (${m.calories}kcal P:${m.protein}g C:${m.carbs}g F:${m.fat}g)`).join(' | ')}\n- Totals: ${yesterdayMeals.reduce((s,m)=>s+(m.calories??0),0)}kcal / P:${yesterdayMeals.reduce((s,m)=>s+(m.protein??0),0)}g`
  : '- Nothing logged'}

FULL MEAL HISTORY (all time, most recent first):
${fullMealHistory}

TODAY'S ACTIVITY:
- Steps: ${todaySteps.toLocaleString()} of ${store.stepGoal.toLocaleString()} goal
- Habits completed this week: ${recentHabits.length}
- Gym sessions total: ${store.gymSessions.length}
- Gym experience: ${store.gymExperience || 'not set'}
- GPS runs logged: ${store.gpsActivities.filter((a: {type: string}) => a.type === 'run').length}
- Running experience: ${store.runExperience || 'not set'}
- Use experience level to calibrate advice difficulty. Brand new / Never run = beginner-friendly. 4+ years = technical/advanced.

WAKE QUEST:
${wakeContext}

ALL HABIT DEFINITIONS:
${habitDefs}

ALL GYM PLANS:
${gymPlansContext}

ALL GYM SESSIONS:
${allGymSessions}

RECENT GPS ACTIVITIES (last 20):
${recentGps}

STEP HISTORY (last 90 days):
${stepHistory}

SLEEP LOG (last 90 days):
${fullSleepLog}

WEIGHT LOG (all time):
${fullWeightLog}

PERFORMANCE STATS (all tracked metrics):
${perfStatsContext}

BODY COMPOSITION:
${latestBodyComp ? `- Last scan (${latestBodyComp.date}): est. body fat ${latestBodyComp.bodyFatLow ?? '?'}–${latestBodyComp.bodyFatHigh ?? '?'}%, build: ${latestBodyComp.build ?? 'unknown'}` : '- No body composition scans recorded yet'}
- Total scans: ${store.bodyCompositionLog.length}

VICES & SPENDING (last 30 days):
- Vice log: ${viceBreakdown}
- Estimated vice spend: ${store.currencySymbol}${totalViceSpend.toFixed(0)}
- Other tracked spending: ${store.currencySymbol}${totalSpending.toFixed(0)} across ${recentSpending.length} entries
- Savings goal: ${store.currencySymbol}${store.savingsGoal} — saved via vice log: ${store.currencySymbol}${savingsSoFar.toFixed(2)}
VICE DEFINITIONS (use these IDs when logging vice skips):
${store.viceDefs.map(d => `  [id:${d.id}] ${d.icon} ${d.name} — ${store.currencySymbol}${d.goldRate}/skip`).join('\n')}
- Login streak: ${store.loginStreak} days

SUBSCRIPTIONS:
${subsContext}`;
}

const SECTION_CONTEXT: Record<string, string> = {
  dashboard:   'The user is on their dashboard overview.',
  training:    'The user is in their training/habits section.',
  gym:         'The user is in the gym & fitness section.',
  nutrition:   'The user is in the food & nutrition section.',
  vices:       'The user is in the vices/bad habits tracker.',
  calendar:    'The user is in the calendar section.',
  habits:      'The user is in the habits tracker.',
  settings:    'The user is in settings.',
  social:      'The user is in the social/friends section.',
  leaderboard: 'The user is on the leaderboard.',
};

const CHUNK = 3 * 1024 * 1024;

function executeAction(action: Record<string, unknown>, store: ReturnType<typeof useGameStore.getState>) {
  const today = new Date().toISOString().slice(0, 10);
  const type  = action.type as string;

  if (type === 'log_steps') {
    store.logSteps(today, Number(action.steps), 'manual');
  } else if (type === 'log_food') {
    const rawMicros = action.micros as Record<string, number> | undefined;
    store.logMeal({
      name:     String(action.name     ?? 'Food'),
      calories: Number(action.calories ?? 0),
      protein:  Number(action.protein  ?? 0),
      carbs:    Number(action.carbs    ?? 0),
      fat:      Number(action.fat      ?? 0),
      ...(action.saturatedFat   != null ? { saturatedFat:   Number(action.saturatedFat)   } : {}),
      ...(action.unsaturatedFat != null ? { unsaturatedFat: Number(action.unsaturatedFat) } : {}),
      sugar:    Number(action.sugar    ?? 0),
      micros:   rawMicros ?? undefined,
    });
  } else if (type === 'log_food_multiple') {
    const meals = action.meals as Record<string, unknown>[];
    if (Array.isArray(meals)) {
      meals.forEach(m => {
        const micros = m.micros as Record<string, number> | undefined;
        store.logMeal({
          name:     String(m.name     ?? 'Food'),
          calories: Number(m.calories ?? 0),
          protein:  Number(m.protein  ?? 0),
          carbs:    Number(m.carbs    ?? 0),
          fat:      Number(m.fat      ?? 0),
          ...(m.saturatedFat   != null ? { saturatedFat:   Number(m.saturatedFat)   } : {}),
          ...(m.unsaturatedFat != null ? { unsaturatedFat: Number(m.unsaturatedFat) } : {}),
          sugar:    Number(m.sugar    ?? 0),
          micros:   micros ?? undefined,
        });
      });
    }
  } else if (type === 'log_water') {
    store.addWaterEntry(today, Number(action.amount ?? 250));
  } else if (type === 'log_habit') {
    const name = String(action.habitName ?? '').toLowerCase();
    const habit = store.habitDefs.find(h => h.name.toLowerCase().includes(name));
    if (habit) store.logHabit(habit.id, today);
  } else if (type === 'log_sleep') {
    store.logSleep(today, Boolean(action.onTime));
  } else if (type === 'log_vice_skip') {
    const viceId = String(action.viceId ?? '');
    const count  = Math.max(1, Number(action.count ?? 1));
    const date   = action.date ? String(action.date) : today;
    const def    = useGameStore.getState().viceDefs.find(d => d.id === viceId);
    if (def) {
      const goldSaved = def.goldRate * count;
      useGameStore.setState(state => ({
        vices: [...state.vices, {
          id: Math.random().toString(36).slice(2, 9),
          type: viceId,
          count,
          date: new Date(date + 'T12:00:00').toISOString(),
          goldSaved,
        }],
        stats: { ...state.stats, gold: state.stats.gold + goldSaved },
      }));
    }
  } else if (type === 'set_step_goal') {
    store.setStepGoal(Number(action.steps));

  // ── Stats & profile controls ─────────────────────────────────────────────
  } else if (type === 'add_xp') {
    const amount = Number(action.amount ?? 50);
    const cur = useGameStore.getState().stats;
    const newXp = cur.xp + amount;
    if (newXp >= cur.xpToNext) {
      const newLevel = cur.level + 1;
      useGameStore.setState({
        stats: { ...cur, xp: newXp - cur.xpToNext, xpToNext: Math.floor(cur.xpToNext * 1.5), level: newLevel },
        showLevelUp: true,
        levelUpMessage: `Level ${newLevel} Reached!`,
      });
    } else {
      useGameStore.setState({ stats: { ...cur, xp: newXp } });
    }

  } else if (type === 'add_stat') {
    const stat = String(action.stat ?? '').toLowerCase();
    const amount = Number(action.amount ?? 1);
    if (['str', 'con', 'dex', 'gold'].includes(stat)) {
      const cur = useGameStore.getState().stats;
      useGameStore.setState({ stats: { ...cur, [stat]: (cur as unknown as Record<string, number>)[stat] + amount } });
    }

  } else if (type === 'set_stat') {
    const stat = String(action.stat ?? '').toLowerCase();
    const value = Number(action.value ?? 0);
    if (['str', 'con', 'dex', 'gold', 'xp', 'level'].includes(stat)) {
      const cur = useGameStore.getState().stats;
      useGameStore.setState({ stats: { ...cur, [stat]: value } });
    }

  } else if (type === 'set_wake_time') {
    store.setWakeTarget(String(action.time ?? '06:30'));

  } else if (type === 'set_bed_time') {
    store.setBedTime(String(action.time ?? '22:00'));

  } else if (type === 'set_savings_goal') {
    store.setSavingsGoal(Number(action.amount ?? 1000));

  } else if (type === 'set_activity_level') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store.setActivityLevel(String(action.level ?? 'moderate') as any);

  } else if (type === 'log_weight') {
    store.logWeight(today, Number(action.weight));

  } else if (type === 'set_goals') {
    const incoming = action.goals as string[];
    if (Array.isArray(incoming)) store.setPrimaryGoals(incoming);

  } else if (type === 'add_calendar_event') {
    store.addCalendarEvent({
      title:     String(action.title     ?? 'Event'),
      date:      String(action.date      ?? today),
      startTime: String(action.startTime ?? ''),
      endTime:   String(action.endTime   ?? ''),
      allDay:    Boolean(action.allDay   ?? (!action.startTime)),
      location:  String(action.location  ?? ''),
      notes:     String(action.notes     ?? ''),
      color:     String(action.color     ?? '#7c3aed'),
      reminder:  Number(action.reminder  ?? 0),
    });

  } else if (type === 'delete_calendar_event') {
    const eventId = String(action.id ?? '');
    if (eventId) store.deleteCalendarEvent(eventId);

  } else if (type === 'log_body_composition') {
    store.logBodyComposition({
      date:         today,
      bodyFatLow:   action.bodyFatLow  != null ? Number(action.bodyFatLow)  : undefined,
      bodyFatHigh:  action.bodyFatHigh != null ? Number(action.bodyFatHigh) : undefined,
      build:        action.build       ? String(action.build) : undefined,
      notes:        String(action.notes ?? ''),
    });
  } else if (type === 'update_gym_plan') {
    const planId = String(action.planId ?? '');
    const patch  = action.patch as Record<string, unknown> | undefined;
    if (planId && patch) {
      const existing = useGameStore.getState().gymPlans.find(p => p.id === planId);
      if (!existing) {
        return 'PLAN_NOT_FOUND';
      }

      // ── Smart exercise merge by ID ─────────────────────────────────────
      // The AI may send a partial exercises array (just the changed ones).
      // We merge by ID so unchanged exercises are preserved, and only the
      // modified ones are updated. This also applies to each week's exercises.
      const mergeExercises = (
        existingExs: import('@/types').GymExercise[],
        patchExs: Record<string, unknown>[],
      ): import('@/types').GymExercise[] => {
        if (patchExs.length === 0) return existingExs;
        // Update existing by ID; keep any not mentioned; append genuinely new ones
        const updated = existingExs.map(ex => {
          const match = patchExs.find(pe => pe.id === ex.id || pe.name === ex.name);
          return match ? { ...ex, ...match, id: ex.id } as import('@/types').GymExercise : ex;
        });
        const added = patchExs
          .filter(pe => !existingExs.some(ex => ex.id === pe.id || ex.name === pe.name))
          .map(pe => ({
            id:           String(pe.id ?? Math.random().toString(36).slice(2, 9)),
            name:         String(pe.name ?? ''),
            sets:         Number(pe.sets ?? 3),
            targetReps:   Number(pe.targetReps ?? 10),
            targetWeight: Number(pe.targetWeight ?? 0),
          }) as import('@/types').GymExercise);
        return [...updated, ...added];
      };

      if (Array.isArray(patch.exercises) && (patch.exercises as unknown[]).length > 0) {
        patch.exercises = mergeExercises(existing.exercises ?? [], patch.exercises as Record<string, unknown>[]);
      } else {
        delete patch.exercises; // never wipe with empty array
      }

      if (Array.isArray(patch.weeks) && (patch.weeks as unknown[]).length > 0) {
        const patchWeeksList = patch.weeks as Record<string, unknown>[];
        // CRITICAL: keep ALL existing weeks — only update weeks explicitly mentioned in patch.
        // Without this, sending week 1 only would delete weeks 2-8, causing "🔒 Not yet" locks.
        patch.weeks = (existing.weeks ?? []).map(ew => {
          const pw = patchWeeksList.find(p => Number(p.weekNumber) === ew.weekNumber);
          if (!pw) return ew; // not in patch — keep exactly as is
          const patchedExs = Array.isArray(pw.exercises) ? pw.exercises as Record<string, unknown>[] : [];
          return {
            ...ew,
            ...pw,
            exercises: patchedExs.length > 0 ? mergeExercises(ew.exercises ?? [], patchedExs) : ew.exercises,
          };
        });
        // Append genuinely new weeks the AI added (week numbers not in existing)
        const existingNums = new Set((existing.weeks ?? []).map(w => w.weekNumber));
        const newWeeks = patchWeeksList
          .filter(pw => !existingNums.has(Number(pw.weekNumber)))
          .map(pw => ({
            weekNumber: Number(pw.weekNumber),
            label:      pw.label as string | undefined,
            exercises:  Array.isArray(pw.exercises)
              ? mergeExercises([], pw.exercises as Record<string, unknown>[])
              : [],
          }));
        if (newWeeks.length > 0) {
          (patch.weeks as unknown[]).push(...newWeeks);
        }
      } else if (Array.isArray(patch.weeks)) {
        delete patch.weeks; // never wipe with empty array
      }

      // If the AI only patched exercises (not weeks), mirror the same weight/rep changes
      // into every week so all progressive weeks stay consistent
      if (patch.exercises && !patch.weeks && existing.weeks && existing.weeks.length > 0) {
        const exPatch = patch.exercises as import('@/types').GymExercise[];
        patch.weeks = existing.weeks.map(w => ({
          ...w,
          exercises: mergeExercises(w.exercises ?? [], exPatch as unknown as Record<string, unknown>[]),
        }));
      }

      store.updateGymPlan(planId, patch as unknown as import('@/types').GymPlan);

      // If scheduleDays changed, refresh future calendar events for this plan
      if (Array.isArray(patch.scheduleDays)) {
        const updated = useGameStore.getState().gymPlans.find(p => p.id === planId);
        if (updated) {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const todayStr = today.toISOString().slice(0, 10);
          // Remove all future events for this plan
          useGameStore.setState(s => ({
            calendarEvents: s.calendarEvents.filter(e => !(e.planId === planId && e.date > todayStr)),
          }));
          // Re-create events for the new days (next 8 weeks)
          const newDays = patch.scheduleDays as number[];
          newDays.forEach(weekday => {
            const d = new Date(today);
            let daysUntil = weekday - today.getDay();
            if (daysUntil < 0) daysUntil += 7;
            d.setDate(today.getDate() + daysUntil);
            for (let w = 0; w < 8; w++) {
              const date = new Date(d);
              date.setDate(d.getDate() + w * 7);
              store.addCalendarEvent({
                title:     updated.name,
                date:      date.toISOString().slice(0, 10),
                startTime: updated.scheduleTime ?? '',
                endTime:   updated.scheduleEndTime ?? '',
                allDay:    !updated.scheduleTime,
                location:  '',
                notes:     '',
                color:     updated.color,
                reminder:  30,
                planId,
              });
            }
          });
        }
      }
    }
  } else if (type === 'log_one_off_activity') {
    const durationSecs = Math.round(Number(action.durationMinutes ?? 0) * 60);
    store.addGpsActivity({
      id:             Math.random().toString(36).slice(2, 9),
      type:           (action.activityType as import('@/store/gameStore').GpsActivity['type']) || 'other',
      activityName:   action.activityName ? String(action.activityName) : undefined,
      startTime:      action.date ? new Date(String(action.date)).toISOString() : new Date().toISOString(),
      duration:       durationSecs,
      distance:       Number(action.distanceKm ?? 0),
      coords:         [],
      elevationGain:  action.elevationGainM ? Number(action.elevationGainM) : undefined,
      floorsClimbed:  action.elevationGainM ? Math.round(Number(action.elevationGainM) / 3.048) : undefined,
      caloriesBurned: action.caloriesBurned ? Math.round(Number(action.caloriesBurned)) : undefined,
    });
  }
}

const GAINN_INTRO_MARKER = '__GAINN_INTRO__';

export default function AIAssistant() {
  const store = useGameStore();
  const { activeSection, userName, gainnIntroSeen, setGainnIntroSeen } = store;

  const [open,           setOpen]           = useState(false);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [loadingLabel,   setLoadingLabel]   = useState('Thinking…');
  const [introCountdown, setIntroCountdown] = useState(10);
  const [buildProgress,  setBuildProgress]  = useState(-1); // -1=hidden, 0–100
  const buildTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [listening,   setListening]   = useState(false);
  const messagesEndRef    = useRef<HTMLDivElement>(null);
  const inputRef          = useRef<HTMLInputElement>(null);
  const fileInputRef      = useRef<HTMLInputElement>(null);
  const cameraInputRef    = useRef<HTMLInputElement>(null);
  const bodyInputRef      = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Auto-open GAINN intro for new users
  useEffect(() => {
    if (!gainnIntroSeen) {
      setOpen(true);
    }
  }, []);

  // 10-second countdown when intro is shown
  useEffect(() => {
    if (!open || gainnIntroSeen) return;
    setIntroCountdown(10);
    const iv = setInterval(() => {
      setIntroCountdown(c => {
        if (c <= 1) { clearInterval(iv); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [open, gainnIntroSeen]);

  // Reset chat when user leaves the app (switches tabs / goes to home screen)
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        setMessages([]);
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      if (!gainnIntroSeen) {
        // First-time intro — show tutorial message
        if (messages.length === 0) setMessages([{ role: 'ai', text: GAINN_INTRO_MARKER }]);
      } else if (messages.length === 0) {
        // Only show greeting when chat history was cleared (app leave reset)
        const name = userName ? userName.split(' ')[0] : 'there';
        setMessages([{ role: 'ai', text: `Hey ${name}! I know your stats, your goals, and what you've been up to. Ask me anything, or send a photo of your food / a video of your form for instant analysis.` }]);
      }
      // Otherwise preserve existing conversation
    }
    // Do NOT clear messages on close — keep history until user leaves the app
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addAiMsg = (text: string) =>
    setMessages(prev => [...prev, { role: 'ai', text }]);

  // ── Plan generation triggered by AI action ───────────────────────────────
  const generatePlan = useCallback(async (
    type: 'gym' | 'meal',
    preferences: Record<string, string>,
  ) => {
    const s = useGameStore.getState();

    // ── Start construction progress animation ────────────────────────────
    setBuildProgress(0);
    if (buildTimerRef.current) clearInterval(buildTimerRef.current);
    buildTimerRef.current = setInterval(() => {
      setBuildProgress(p => {
        if (p >= 92) { clearInterval(buildTimerRef.current!); return 92; }
        return p + 1.5; // reaches ~92% in ~15 sec at 250ms intervals
      });
    }, 250);

    // Add the building message with animation flag
    setMessages(prev => [...prev, { role: 'ai', text: '', isPlanBuilding: true, planBuildingType: type }]);

    const finishProgress = (success: boolean, successMsg: string) => {
      if (buildTimerRef.current) clearInterval(buildTimerRef.current);
      setBuildProgress(100);
      setTimeout(() => {
        // Replace building message with done message
        setMessages(prev => prev.map(m => m.isPlanBuilding ? { ...m, isPlanBuilding: false, text: successMsg } : m));
        setBuildProgress(-1);
      }, success ? 600 : 300);
    };

    try {
      if (type === 'gym') {
        // If this is an edit (existingPlanId set), build the existingPlan string from the
        // store ourselves — never trust the AI to copy it correctly (it may return an object
        // which becomes "[object Object]" in the prompt and breaks JSON parsing).
        let resolvedExistingPlan = preferences.existingPlan;
        if (preferences.existingPlanId) {
          const existingPlan = s.gymPlans.find(p => p.id === preferences.existingPlanId);
          if (existingPlan) {
            const fmtEx = (e: import('@/types').GymExercise) =>
              `${e.name} ${e.sets}x${e.targetReps}${e.targetWeight > 0 ? `@${e.targetWeight}kg` : '(bw)'}[id:${e.id}]`;
            const exList = (existingPlan.exercises ?? []).map(fmtEx).join('; ');
            const weekSum = existingPlan.weeks && existingPlan.weeks.length > 0
              ? ` | weeks: ${existingPlan.weeks.map(w => `wk${w.weekNumber}: ${(w.exercises ?? []).map(fmtEx).join('; ')}`).join(' | ')}`
              : '';
            resolvedExistingPlan = `${existingPlan.name} — ${exList}${weekSum}`;
          }
        }

        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'generate_gym_plan',
            context: {
              stats: s.stats,
              gymLog: s.gymSessions,
              preferences: {
                ...preferences,
                // Always use stored experience so it's accurate regardless of what the assistant captured
                experience: preferences.experience || s.gymExperience || 'Some experience',
                runExperience: s.runExperience || preferences.runExperience || '',
                // Always use the store-built string (never the AI's copy which may be an object)
                ...(resolvedExistingPlan !== undefined ? { existingPlan: resolvedExistingPlan } : {}),
              },
            },
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          const errMsg = typeof data.error === 'string' ? data.error : 'Something went wrong generating the plan';
          finishProgress(false, `${errMsg}. Try again in a moment.`);
          return;
        }
        // Support both legacy { plan } and new { plans: [...] }
        const rawPlans: Record<string, unknown>[] = data.plans ?? (data.plan ? [data.plan] : []);
        console.log('[GymPlan] rawPlans received:', JSON.stringify(rawPlans, null, 2));
        if (rawPlans.length > 0) {
          // If regenerating an existing plan (edit flow), remove the old plan by ID first
          if (preferences.existingPlanId) {
            s.removeGymPlan(preferences.existingPlanId);
          }

          rawPlans.forEach(p => {
            const mapEx = (ex: Record<string, unknown>) => ({
              id:           Math.random().toString(36).slice(2, 9),
              name:         String(ex.name         ?? ''),
              sets:         Number(ex.sets         ?? 3),
              targetReps:   Number(ex.targetReps   ?? 10),
              targetWeight: Number(ex.targetWeight ?? 0),
            });
            // 1-to-1 swap by name (catches cases without existingPlanId)
            const newName = String(p.name ?? '').toLowerCase().trim();
            const duplicate = useGameStore.getState().gymPlans.find(
              existing => existing.name.toLowerCase().trim() === newName
            );
            if (duplicate) s.removeGymPlan(duplicate.id);
            const newPlanId = s.addGymPlan({
              name:               p.name          as string,
              emoji:              p.emoji         as string,
              color:              p.color         as string,
              split:              p.split         as string | undefined,
              recoveryNotes:      p.recoveryNotes as string | undefined,
              isRepeating:        Boolean(p.isRepeating),
              wantsSessionAlerts: preferences.wantsSessionAlerts === 'yes',
              exercises: ((p.exercises as Record<string, unknown>[]) ?? []).map(mapEx),
              weeks: Array.isArray(p.weeks)
                ? (p.weeks as Record<string, unknown>[]).map(w => ({
                    weekNumber: Number(w.weekNumber ?? 1),
                    label:      w.label as string | undefined,
                    exercises:  ((w.exercises as Record<string, unknown>[]) ?? []).map(mapEx),
                  }))
                : undefined,
              scheduleDays:    (p.scheduleDays    as number[]) ?? [],
              scheduleTime:    (p.scheduleTime    as string)  ?? '',
              scheduleEndTime: (p.scheduleEndTime as string)  ?? '',
              dayTimes:    {},
              dayEndTimes: {},
            });

            // ── Auto-add calendar events for every scheduled day ──────────
            const scheduleDays = (p.scheduleDays as number[]) ?? [];
            const scheduleTime    = (p.scheduleTime    as string) ?? '';
            const scheduleEndTime = (p.scheduleEndTime as string) ?? '';
            const planColor = (p.color as string) ?? '#7c3aed';
            const planName  = (p.name  as string) ?? 'Training Session';
            const weeksList = Array.isArray(p.weeks) ? (p.weeks as Record<string, unknown>[]) : [];
            const weeksCount = weeksList.length > 0 ? weeksList.length : (Boolean(p.isRepeating) ? 8 : 6);
            const today = new Date(); today.setHours(0, 0, 0, 0);

            scheduleDays.forEach(weekday => {
              const todayDay = today.getDay();
              let daysUntil = weekday - todayDay;
              if (daysUntil < 0) daysUntil += 7;
              const firstDate = new Date(today);
              firstDate.setDate(today.getDate() + daysUntil);

              for (let wo = 0; wo < weeksCount; wo++) {
                const d = new Date(firstDate);
                d.setDate(firstDate.getDate() + wo * 7);
                const weekLabel = weeksList[wo]
                  ? ` — ${weeksList[wo].label ?? `Week ${weeksList[wo].weekNumber}`}`
                  : '';
                s.addCalendarEvent({
                  title:     planName,
                  date:      d.toISOString().slice(0, 10),
                  startTime: scheduleTime,
                  endTime:   scheduleEndTime,
                  allDay:    !scheduleTime,
                  location:  '',
                  notes:     weekLabel ? `${planName}${weekLabel}` : '',
                  color:     planColor,
                  reminder:  30,
                  planId:    newPlanId,
                });
              }
            });
          });
          const label = rawPlans.length === 1
            ? `"${rawPlans[0].name as string}"`
            : rawPlans.map(p => `"${p.name as string}"`).join(', ');
          const prefType = (preferences.planType ?? preferences.type ?? '').toLowerCase();
          const isStudyPlan = prefType.includes('stud') || prefType.includes('revis') || prefType.includes('exam') || prefType.includes('learn') || prefType.includes('academic');
          const doneMsg = isStudyPlan
            ? `✅ Done! ${label} ${rawPlans.length === 1 ? 'has' : 'have'} been saved to your Plans tab. Each subject has its own plan — head there to get started!`
            : `✅ Done! ${label} added to your Gym tab and 📅 Calendar! You can edit times and days in "Edit Plan", or just tell me and I'll update them for you 😊`;
          finishProgress(true, doneMsg);
        } else {
          finishProgress(false, 'Plan generation hit a snag. Try again with a bit more detail about what you want.');
        }
      } else {
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'generate_meal_plan',
            context: { nutritionGoal: s.nutritionGoal, preferences },
          }),
        });
        const data = await res.json();
        if (data.mealPlan?.meals?.length) {
          (data.mealPlan.meals as Omit<SavedMealItem, 'id'>[]).forEach(meal => s.addToMealLibrary(meal));
          finishProgress(true, `✅ Added ${data.mealPlan.meals.length} meals to your Meal Library in the Food tab — you can log them any time!`);
        } else {
          finishProgress(false, 'Meal plan generation hit a snag. Try describing your preferences again.');
        }
      }
    } catch (err) {
      console.error('[GymPlan] generatePlan error:', err);
      finishProgress(false, `Something went wrong: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [addAiMsg]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    // If user types during intro, mark it as seen so chat continues normally
    if (!gainnIntroSeen) setGainnIntroSeen();
    // Capture history BEFORE adding the new user message
    const historySnapshot = messages;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    setLoadingLabel('Thinking…');
    try {
      const habitList = store.habitDefs.map(h => h.name).join(', ');
      // Build conversation history for Gemini (skip initial greeting, keep last 30 turns)
      const history = historySnapshot
        .slice(1)  // skip the opening greeting
        .slice(-30) // keep last 30 messages for context
        .filter(m => !m.mediaUrl && m.text.trim() !== '') // skip media-only and empty messages (e.g. isPlanBuilding placeholders)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }));
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'assistant',
          message: text,
          history,
          section: activeSection,
          context: {
            userContext: buildUserContext(store),
            sectionContext: SECTION_CONTEXT[activeSection] ?? '',
            habitList,
            aiIntensity: store.aiIntensity ?? 50,
          },
        }),
      });
      const data = await res.json();
      const reply = data.reply ?? data.error ?? 'Sorry, something went wrong.';
      // Release the input immediately so user can keep chatting
      setLoading(false);
      if (data.action?.type === 'confirm_past_food_log') {
        const action = data.action as Record<string, unknown>;
        const pendingFoodLog: PendingFoodLog = {
          date:      String(action.date      ?? ''),
          dateLabel: String(action.dateLabel ?? action.date ?? ''),
          meals:     (action.meals as PendingMeal[]) ?? [],
        };
        setMessages(prev => [...prev, { role: 'ai', text: reply, pendingFoodLog }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: reply }]);
        if (data.action?.type === 'generate_gym_plan') {
          generatePlan('gym', data.action.preferences ?? {});
        } else if (data.action?.type === 'generate_meal_plan') {
          generatePlan('meal', data.action.preferences ?? {});
        } else if (data.action?.type === 'update_gym_plan') {
          // Show same building animation for plan edits
          setBuildProgress(0);
          if (buildTimerRef.current) clearInterval(buildTimerRef.current);
          buildTimerRef.current = setInterval(() => {
            setBuildProgress(p => {
              if (p >= 92) { clearInterval(buildTimerRef.current!); return 92; }
              return p + 4; // faster than new plan — reaches ~92% in ~6s
            });
          }, 250);
          setMessages(prev => [...prev, { role: 'ai', text: '', isPlanBuilding: true, planBuildingType: 'gym' }]);
          const actionResult = executeAction(data.action, store);
          if (actionResult === 'PLAN_NOT_FOUND') {
            clearInterval(buildTimerRef.current!);
            setBuildProgress(100);
            setTimeout(() => {
              setMessages(prev => prev.map(m => m.isPlanBuilding ? { ...m, isPlanBuilding: false, text: reply } : m));
              setBuildProgress(-1);
            }, 300);
            // Plan was deleted — extract preferences from the patch and regenerate fresh
            const patch = (data.action.patch ?? {}) as Record<string, unknown>;
            const prefs: Record<string, string> = {};
            if (patch.name)          prefs.name          = String(patch.name);
            if (patch.goal)          prefs.goal          = String(patch.goal);
            if (patch.daysPerWeek)   prefs.daysPerWeek   = String(patch.daysPerWeek);
            if (patch.scheduleDays)  prefs.scheduleDays  = JSON.stringify(patch.scheduleDays);
            if (patch.splitType)     prefs.splitType     = String(patch.splitType);
            if (patch.progressive !== undefined) prefs.progressive = patch.progressive ? 'yes' : 'no';
            generatePlan('gym', prefs);
          } else {
            // Update succeeded — finish animation
            clearInterval(buildTimerRef.current!);
            setBuildProgress(100);
            setTimeout(() => {
              setMessages(prev => prev.map(m => m.isPlanBuilding ? { ...m, isPlanBuilding: false, text: '✅ Plan updated!' } : m));
              setBuildProgress(-1);
            }, 600);
          }
        } else if (data.action) {
          executeAction(data.action, store);
        }
      }
    } catch {
      addAiMsg('Having trouble connecting. Try again in a moment.');
      setLoading(false);
    }
  };

  const handleFile = async (file: File) => {
    if (loading) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) { addAiMsg('Please send an image or video file.'); return; }
    if (file.size > 50 * 1024 * 1024) { addAiMsg('File too large — please keep it under 50 MB.'); return; }

    const previewUrl = URL.createObjectURL(file);
    setMessages(prev => [...prev, {
      role: 'user',
      text: isImage ? '📷 Food photo' : '🎥 Form video',
      mediaUrl: previewUrl,
      mediaType: isImage ? 'image' : 'video',
    }]);
    setLoading(true);

    try {
      if (isImage) {
        // ── Food photo: base64 encode ─────────────────────────────────────
        setLoadingLabel('Analysing food…');
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => {
            const url = e.target?.result as string;
            resolve(url.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const res  = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'analyze_food_image', context: { imageBase64: base64, mimeType: file.type } }),
        });
        const data = await res.json();
        if (data.food) {
          const f = data.food;
          addAiMsg(`**${f.name}** — ~${f.calories} kcal\nProtein: ${f.protein}g · Carbs: ${f.carbs}g · Fat: ${f.fat}g\n\nWant me to log this for you?`);
        } else {
          addAiMsg(data.error ?? 'Could not analyse that image.');
        }

      } else {
        // ── Form video: chunked upload (raw body + headers, matching FormAnalyzer) ──
        const total    = file.size;
        const chunks   = Math.ceil(total / CHUNK);
        const uploadId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        const chunkUrls: string[] = [];
        let uploadData: { fileUri?: string; fileName?: string; mimeType?: string; chunkUrl?: string; error?: string } = {};

        for (let i = 0; i < chunks; i++) {
          const blob  = file.slice(i * CHUNK, (i + 1) * CHUNK);
          const mb    = Math.round(Math.min((i + 1) * CHUNK, total) / 1024 / 1024);
          const totMb = Math.round(total / 1024 / 1024);
          setLoadingLabel(`Uploading… ${mb} / ${totMb} MB`);

          const res = await fetch('/api/gemini/upload-chunk', {
            method: 'POST',
            headers: {
              'Content-Type':   'application/octet-stream',
              'x-chunk-index':  String(i),
              'x-total-chunks': String(chunks),
              'x-total-size':   String(total),
              'x-mime-type':    file.type || 'video/mp4',
              'x-upload-id':    uploadId,
              'x-chunk-urls':   JSON.stringify(chunkUrls),
            },
            body: blob,
          });

          const text = await res.text();
          try { uploadData = JSON.parse(text); } catch { throw new Error(`Chunk ${i + 1} failed: ${text.slice(0, 200)}`); }
          if (!res.ok) throw new Error(uploadData.error ?? `Chunk ${i + 1} failed`);
          if (uploadData.chunkUrl) chunkUrls.push(uploadData.chunkUrl);
        }

        if (!uploadData.fileUri) throw new Error(uploadData.error ?? 'Upload failed — no file URI returned');

        setLoadingLabel('Analysing form…');
        const res  = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'analyze_form_video', context: { fileUri: uploadData.fileUri, fileName: uploadData.fileName, mimeType: uploadData.mimeType } }),
        });
        const data = await res.json();
        if (data.analysis) {
          const a = data.analysis;
          const positives   = (a.positives   ?? []).map((p: string) => `✅ ${p}`).join('\n');
          const issues      = (a.issues      ?? []).map((p: string) => `⚠️ ${p}`).join('\n');
          const corrections = (a.corrections ?? []).map((p: string) => `🔧 ${p}`).join('\n');
          addAiMsg(`${a.exercise} — ${a.rating}\n\n${positives}${issues ? '\n' + issues : ''}${corrections ? '\n' + corrections : ''}${a.safetyNote ? '\n\n' + a.safetyNote : ''}`);
        } else {
          addAiMsg(data.error ?? 'Could not analyse that video.');
        }
      }
    } catch (e: any) {
      addAiMsg(`Upload failed: ${e.message ?? 'Unknown error'}`);
    }
    setLoading(false);
  };

  const handleBodyPhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setMessages(prev => [...prev, { role: 'user', text: '📸 Progress photo', mediaUrl: URL.createObjectURL(file), mediaType: 'image' }]);
    setLoading(true);
    setLoadingLabel('Analysing body composition…');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve((e.target?.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res  = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'analyze_body_composition', context: { imageBase64: base64, mimeType: file.type } }),
      });
      const data = await res.json();
      if (data.result) {
        const r = data.result;
        const store = useGameStore.getState();
        store.logBodyComposition({
          date: new Date().toISOString().slice(0, 10),
          bodyFatLow:  r.bodyFatLow,
          bodyFatHigh: r.bodyFatHigh,
          build:       r.build,
          notes:       r.summary,
        });
        addAiMsg(`**Body Composition Scan** 📊\n\nEst. body fat: **${r.bodyFatLow}–${r.bodyFatHigh}%**\nBuild: ${r.build}\n\n${r.summary}\n\n${r.tips}\n\n_⚠️ ${r.disclaimer}_`);
      } else {
        addAiMsg(data.error ?? 'Could not analyse that photo.');
      }
    } catch {
      addAiMsg('Could not process the photo. Please try again.');
    }
    setLoading(false);
  };

  const toggleMic = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { addAiMsg('Speech recognition is not supported in this browser. Try Chrome or Safari.'); return; }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as SpeechRecognitionResultList)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onend = () => {
      setListening(false);
      // Auto-send if we got something
      setInput(prev => {
        if (prev.trim()) {
          setTimeout(() => {
            const sendBtn = document.getElementById('ql-ai-send-btn');
            sendBtn?.click();
          }, 100);
        }
        return prev;
      });
    };

    recognition.onerror = () => setListening(false);

    recognition.start();
  };

  return (
    <>
      {/* No backdrop during intro — countdown forces the user to wait */}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
      <input
        ref={bodyInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleBodyPhoto(f); e.target.value = ''; }}
      />

      {/* Drawer */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-50 transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ height: gainnIntroSeen ? '45vh' : '80vh' }}
      >
        <div className="h-full bg-ql-surface border-t border-ql rounded-t-3xl flex flex-col overflow-hidden shadow-2xl"
          style={{ maxWidth: 512, margin: '0 auto' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: '#16a34a' }}>
                <svg width="13" height="13" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2C14 2 14 14 2 14C14 14 14 26 14 26C14 26 14 14 26 14C14 14 14 2 14 2Z" fill="white"/>
                </svg>
              </div>
              <span className="text-ql text-sm font-semibold">GAINN AI</span>
            </div>
            {!gainnIntroSeen && introCountdown > 0 ? (
              // Countdown circle — can't close yet
              <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                <svg width="32" height="32" viewBox="0 0 32 32" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                  <circle cx="16" cy="16" r="11" fill="none" stroke="var(--ql-border)" strokeWidth="2.5" />
                  <circle cx="16" cy="16" r="11" fill="none" stroke="var(--ql-accent-tx)" strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={String(2 * Math.PI * 11)}
                    strokeDashoffset={String(2 * Math.PI * 11 * (1 - introCountdown / 10))}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <span className="text-ql text-[11px] font-bold relative z-10">{introCountdown}</span>
              </div>
            ) : (
              <button onClick={() => { if (!gainnIntroSeen) setGainnIntroSeen(); setOpen(false); }} className="text-ql-3 text-lg leading-none px-1">×</button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] rounded-2xl text-sm leading-relaxed overflow-hidden ${
                  m.role === 'user'
                    ? 'bg-ql-accent text-white rounded-br-sm'
                    : 'bg-ql-surface2 text-ql rounded-bl-sm border border-ql'
                }`}>
                  {m.mediaUrl && m.mediaType === 'image' && (
                    <img src={m.mediaUrl} alt="food" className="w-full max-h-36 object-cover" />
                  )}
                  {m.mediaUrl && m.mediaType === 'video' && (
                    <video src={m.mediaUrl} className="w-full max-h-36 object-cover" muted playsInline />
                  )}

                  {/* ── Plan building construction animation ── */}
                  {m.isPlanBuilding ? (
                    <div className="px-3 py-3 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        {/* Circular progress ring */}
                        <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
                          <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
                            {/* Track */}
                            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--ql-surface3)" strokeWidth="3.5" />
                            {/* Progress arc */}
                            <circle
                              cx="22" cy="22" r="18"
                              fill="none"
                              stroke="var(--ql-accent)"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 18}`}
                              strokeDashoffset={`${2 * Math.PI * 18 * (1 - Math.min(buildProgress, 100) / 100)}`}
                              style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                            />
                          </svg>
                          {/* Icon centred */}
                          <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: 16 }}>
                            {buildProgress >= 100 ? '✅' : m.planBuildingType === 'meal' ? '🍽️' : '🏗️'}
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-ql text-xs font-semibold">
                            {buildProgress >= 100
                              ? (m.planBuildingType === 'meal' ? 'Meal library ready!' : 'Plan complete!')
                              : (m.planBuildingType === 'meal' ? 'Crafting your meal library…' : 'Building your plan…')}
                          </p>
                          <p className="text-ql-3 text-[10px]">
                            {buildProgress >= 100
                              ? (m.planBuildingType === 'meal' ? 'Saving to your Food tab' : 'Saving to your Plans tab')
                              : `${Math.round(Math.min(buildProgress, 100))}% — hang tight, this one's worth the wait`}
                          </p>
                        </div>
                      </div>
                      {/* Animated dots */}
                      {buildProgress < 100 && (
                        <div className="flex gap-1.5 px-1">
                          {(m.planBuildingType === 'meal' ? ['🥗','🍳','🥩','🥦','🍚'] : ['🧱','⚙️','📐','🔩','🏋️']).map((e, di) => (
                            <span
                              key={di}
                              className="text-sm"
                              style={{
                                opacity: buildProgress > di * 20 ? 1 : 0.2,
                                transition: 'opacity 0.5s ease',
                                transform: buildProgress > di * 20 ? 'scale(1)' : 'scale(0.7)',
                              }}
                            >{e}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : m.text === GAINN_INTRO_MARKER ? (
                    <div className="px-3 py-3 flex flex-col gap-2.5">
                      <p className="text-ql text-sm font-semibold">Hey {userName ? userName.split(' ')[0] : 'there'}! 👋 I&apos;m GAINN — your personal AI coach.</p>
                      <p className="text-ql-3 text-xs">I live in the bottom-right corner, always ready to help. Here&apos;s what I can do:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { icon: '🍽️', label: 'Log food & water' },
                          { icon: '🏋️', label: 'Build gym plans' },
                          { icon: '🏃', label: 'Build running plans' },
                          { icon: '📸', label: 'Review your form' },
                          { icon: '📊', label: 'Track progress' },
                          { icon: '💤', label: 'Sleep & recovery' },
                        ].map(({ icon, label }) => (
                          <div key={label} className="flex items-center gap-1.5 bg-ql-surface rounded-xl px-2.5 py-2 border border-ql">
                            <span className="text-base shrink-0">{icon}</span>
                            <span className="text-ql text-[11px] font-medium leading-tight">{label}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-ql-3 text-[11px] leading-relaxed">GAINN keeps a record of everything — your goals, weight, nutrition, workouts, sleep, and more — so every answer is tailored specifically to <strong className="text-ql">you</strong>.</p>
                      <p className="text-ql-3 text-[11px]">Feel free to ask me anything right now — type below! 🚀</p>
                    </div>
                  ) : (
                    <p className="px-3 py-2 whitespace-pre-line">{m.text}</p>
                  )}
                </div>
                {/* Past food log confirmation card */}
                {m.pendingFoodLog && !m.pendingFoodLog.confirmed && (
                  <div className="mt-2 w-[90%] bg-ql-surface rounded-2xl border border-ql p-3.5">
                    <p className="text-ql text-xs font-semibold mb-2">📅 Log for {m.pendingFoodLog.dateLabel}</p>
                    <div className="flex flex-col gap-1.5 mb-3">
                      {m.pendingFoodLog.meals.map((meal, mi) => (
                        <div key={mi} className="bg-ql-surface2 rounded-xl p-2.5 border border-ql">
                          <div className="flex items-center justify-between">
                            <span className="text-ql text-xs font-semibold">{meal.name}</span>
                            <span className="text-ql-3 text-[10px]">{meal.calories} kcal</span>
                          </div>
                          <div className="flex gap-2 text-[10px] text-ql-3 mt-0.5">
                            <span>P: {meal.protein}g</span>
                            <span>C: {meal.carbs}g</span>
                            <span>F: {meal.fat}g</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const pfl = m.pendingFoodLog!;
                          // Normalise date: trim + take first 10 chars (YYYY-MM-DD)
                          const logDate = (pfl.date ?? '').trim().slice(0, 10) || new Date().toISOString().slice(0, 10);
                          const gs = useGameStore.getState();
                          pfl.meals.forEach(meal => {
                            gs.logMeal({
                              name: meal.name, calories: meal.calories,
                              protein: meal.protein, carbs: meal.carbs,
                              fat: meal.fat,
                              ...(meal.saturatedFat   != null ? { saturatedFat:   meal.saturatedFat   } : {}),
                              ...(meal.unsaturatedFat != null ? { unsaturatedFat: meal.unsaturatedFat } : {}),
                              sugar: meal.sugar ?? 0,
                            }, logDate);
                          });
                          setMessages(prev => prev.map((msg, idx) =>
                            idx === i && msg.pendingFoodLog
                              ? { ...msg, pendingFoodLog: { ...msg.pendingFoodLog, confirmed: true } }
                              : msg
                          ));
                          setMessages(prev => [...prev, { role: 'ai', text: `✅ Done! Added ${pfl.meals.length === 1 ? pfl.meals[0].name : `${pfl.meals.length} meals`} to ${pfl.dateLabel}.` }]);
                        }}
                        className="flex-1 py-2 bg-ql-accent text-white text-xs font-semibold rounded-xl"
                      >Yes, log it</button>
                      <button
                        onClick={() => {
                          setMessages(prev => prev.map((msg, idx) =>
                            idx === i && msg.pendingFoodLog
                              ? { ...msg, pendingFoodLog: { ...msg.pendingFoodLog, confirmed: true } }
                              : msg
                          ));
                          setMessages(prev => [...prev, { role: 'ai', text: `No problem, I won't add it.` }]);
                        }}
                        className="flex-1 py-2 bg-ql-surface2 border border-ql text-ql text-xs font-semibold rounded-xl"
                      >Cancel</button>
                    </div>
                  </div>
                )}
                {m.pendingFoodLog?.confirmed && (
                  <p className="text-ql-3 text-[10px] mt-1 px-1">Logged to {m.pendingFoodLog.dateLabel}</p>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-ql-surface2 border border-ql px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-ql-3 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <span className="text-ql-3 text-xs">{loadingLabel}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input row */}
          <div className="shrink-0 px-4 pb-5 pt-2 flex gap-2 items-center">
            {/* Upload from library */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-ql-surface2 border border-ql text-ql-3 hover:text-ql transition-colors disabled:opacity-40"
              title="Upload photo or video"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>

            {/* Take photo with camera */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={loading}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-ql-surface2 border border-ql text-ql-3 hover:text-ql transition-colors disabled:opacity-40"
              title="Take a photo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>

            {/* Text input — shows live transcript while listening */}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={listening ? 'Listening…' : 'Ask anything…'}
                style={{ fontSize: 16 }}
                className={`w-full bg-ql-surface2 border rounded-2xl px-4 py-2.5 text-ql outline-none transition-colors placeholder:text-ql-3 ${
                  listening ? 'border-red-500 placeholder:text-red-400' : 'border-ql focus:border-ql-accent'
                }`}
              />
              {listening && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5 items-end h-4">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-0.5 rounded-full bg-red-500 animate-bounce"
                      style={{ height: `${[10,14,10][i]}px`, animationDelay: `${i * 0.12}s` }} />
                  ))}
                </span>
              )}
            </div>

            {/* Mic button */}
            <button
              onClick={toggleMic}
              disabled={loading}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40 ${
                listening ? 'bg-red-500 scale-105' : 'bg-ql-surface2 border border-ql text-ql-3 hover:text-ql'
              }`}
              title={listening ? 'Stop listening' : 'Speak to GAINN'}
            >
              {listening ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="11" rx="3"/>
                  <path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/>
                  <line x1="9" y1="22" x2="15" y2="22"/>
                </svg>
              )}
            </button>

            <button
              id="ql-ai-send-btn"
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
              style={{ background: '#16a34a' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed z-50 w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-200 ${open ? 'scale-90 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
        style={{ background: '#16a34a', bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))', right: '1rem' }}
        aria-label="Open AI assistant"
      >
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2C14 2 14 14 2 14C14 14 14 26 14 26C14 26 14 14 26 14C14 14 14 2 14 2Z" fill="white"/>
        </svg>
        {/* Live pulse dot */}
        <span className="absolute -top-1 -right-1 w-3 h-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white" />
        </span>
      </button>
    </>
  );
}
