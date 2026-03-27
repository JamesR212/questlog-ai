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
  const recentSleep   = store.sleepLog.slice(-3).map(s => s.onTime ? 'on time' : 'late').join(', ');
  const todayMeals    = store.mealLog.filter(m => m.date === today);
  const totalCalories = todayMeals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
  const totalProtein  = todayMeals.reduce((sum, m) => sum + (m.protein ?? 0), 0);
  const totalWater    = store.waterLog.filter(w => w.date === today).reduce((sum, w) => sum + w.amount, 0);
  const recentGym     = store.gymSessions.slice(-3).map(s => s.planId).join(', ');
  const savingsSoFar  = store.vices.reduce((sum, v) => sum + (v.goldSaved ?? 0), 0);

  // Calendar context — today, tomorrow, next 7 days
  const todayEvents    = store.calendarEvents.filter(e => e.date === today);
  const tomorrowEvents = store.calendarEvents.filter(e => e.date === tomorrow);
  const weekEvents     = store.calendarEvents.filter(e => e.date > today && e.date <= in7Days);

  const formatEvent = (e: typeof store.calendarEvents[0]) => {
    const time = e.allDay ? 'all day' : `${e.startTime}${e.endTime ? '–' + e.endTime : ''}`;
    const type = classifyEvent(e.title, e.notes);
    return `"${e.title}" (${time}${e.location ? ', ' + e.location : ''}) [type: ${type}]${e.notes ? ' — notes: ' + e.notes : ''}`;
  };

  const todaySchedule    = todayEvents.length    > 0 ? todayEvents.map(formatEvent).join(' | ')    : 'nothing scheduled';
  const tomorrowSchedule = tomorrowEvents.length > 0 ? tomorrowEvents.map(formatEvent).join(' | ') : 'nothing scheduled';
  const weekSchedule     = weekEvents.length     > 0 ? weekEvents.map(e => `${e.date}: ${formatEvent(e)}`).join(' | ') : 'nothing scheduled';

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
- Time on GAINN: ${timeOnApp}

TODAY'S SCHEDULE (${today}):
${todaySchedule}

TOMORROW'S SCHEDULE (${tomorrow}):
${tomorrowSchedule}

THIS WEEK'S SCHEDULE:
${weekSchedule}

TODAY'S NUTRITION & HYDRATION:
- Calories logged: ${totalCalories} kcal${totalCalories > 0 ? ` (${tdeeWithActivity - totalCalories > 0 ? tdeeWithActivity - totalCalories + ' kcal remaining to hit target' : 'target met'})` : ''}
- Protein logged: ${totalProtein}g
- Water logged: ${totalWater}ml of ${store.waterGoal}ml goal

TODAY'S ACTIVITY:
- Steps: ${todaySteps.toLocaleString()} of ${store.stepGoal.toLocaleString()} goal
- Sleep recent: ${recentSleep || 'no data'}
- Habits completed this week: ${recentHabits.length}
- Gym sessions total: ${store.gymSessions.length} | Recent: ${recentGym || 'none'}

FINANCES:
- Savings goal: ${store.currencySymbol}${store.savingsGoal} — saved so far: ${store.currencySymbol}${savingsSoFar.toFixed(2)}
- Login streak: ${store.loginStreak} days`;
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
      sugar:    Number(action.sugar    ?? 0),
      micros:   rawMicros ?? undefined,
    });
  } else if (type === 'log_water') {
    store.addWaterEntry(today, Number(action.amount ?? 250));
  } else if (type === 'log_habit') {
    const name = String(action.habitName ?? '').toLowerCase();
    const habit = store.habitDefs.find(h => h.name.toLowerCase().includes(name));
    if (habit) store.logHabit(habit.id, today);
  } else if (type === 'log_sleep') {
    store.logSleep(today, Boolean(action.onTime));
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
  }
}

export default function AIAssistant() {
  const store = useGameStore();
  const { activeSection, userName } = store;

  const [open,        setOpen]        = useState(false);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Thinking…');
  const [listening,   setListening]   = useState(false);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const cameraInputRef  = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      if (messages.length === 0) {
        const name = userName ? userName.split(' ')[0] : 'there';
        setMessages([{ role: 'ai', text: `Hey ${name}! I know your stats, your goals, and what you've been up to. Ask me anything, or send a photo of your food / a video of your form for instant analysis.` }]);
      }
    }
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
    try {
      if (type === 'gym') {
        setLoadingLabel('Building your training plan… (~15 sec)');
        addAiMsg('⏳ Generating your training plan — usually takes around 15 seconds. It\'ll be saved directly to your Training tab when it\'s ready, so no need to wait here!');
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'generate_gym_plan',
            context: { stats: s.stats, gymLog: s.gymSessions, preferences },
          }),
        });
        const data = await res.json();
        if (data.plan) {
          s.addGymPlan({
            name:             data.plan.name,
            emoji:            data.plan.emoji,
            color:            data.plan.color,
            exercises:        data.plan.exercises,
            scheduleDays:     data.plan.scheduleDays ?? [],
            scheduleTime:     data.plan.scheduleTime ?? '',
            scheduleEndTime:  data.plan.scheduleEndTime ?? '',
            dayTimes:         {},
            dayEndTimes:      {},
          });
          addAiMsg(`✅ Your "${data.plan.name}" plan has been saved to your Training tab — head there to start logging sessions!`);
        } else {
          addAiMsg('Plan generation hit a snag. Try again with a bit more detail about what you want.');
        }
      } else {
        setLoadingLabel('Building your meal plan… (~20 sec)');
        addAiMsg('⏳ Generating your meal plan — usually takes around 20 seconds. All the meals will be saved automatically to your Meal Library in the Food tab when ready, so feel free to carry on!');
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
          addAiMsg(`✅ Added ${data.mealPlan.meals.length} meals to your Meal Library in the Food tab — you can log them any time!`);
        } else {
          addAiMsg('Meal plan generation hit a snag. Try describing your preferences again.');
        }
      }
    } catch {
      addAiMsg('Something went wrong building the plan. Try again in a moment.');
    }
  }, [addAiMsg]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    // Capture history BEFORE adding the new user message
    const historySnapshot = messages;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    setLoadingLabel('Thinking…');
    try {
      const habitList = store.habitDefs.map(h => h.name).join(', ');
      // Build conversation history for Gemini (skip initial greeting, keep last 20 turns)
      const history = historySnapshot
        .slice(1)  // skip the opening greeting
        .slice(-20) // keep last 20 messages for context
        .filter(m => !m.mediaUrl) // skip pure-media messages
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
          },
        }),
      });
      const data = await res.json();
      const reply = data.reply ?? data.error ?? 'Sorry, something went wrong.';
      addAiMsg(reply);
      if (data.action?.type === 'generate_gym_plan') {
        await generatePlan('gym', data.action.preferences ?? {});
      } else if (data.action?.type === 'generate_meal_plan') {
        await generatePlan('meal', data.action.preferences ?? {});
      } else if (data.action) {
        executeAction(data.action, store);
      }
    } catch {
      addAiMsg('Having trouble connecting. Try again in a moment.');
    }
    setLoading(false);
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
      {/* Thin tap-to-close strip above the drawer — doesn't block the page scroll area */}
      {open && <div className="fixed left-0 right-0 z-40" style={{ bottom: '45vh', height: 40 }} onClick={() => setOpen(false)} />}

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

      {/* Drawer */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-50 transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ height: '45vh' }}
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
            <button onClick={() => setOpen(false)} className="text-ql-3 text-lg leading-none px-1">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                  <p className="px-3 py-2 whitespace-pre-line">{m.text}</p>
                </div>
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
                className={`w-full bg-ql-surface2 border rounded-2xl px-4 py-2.5 text-ql text-sm outline-none transition-colors placeholder:text-ql-3 ${
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
