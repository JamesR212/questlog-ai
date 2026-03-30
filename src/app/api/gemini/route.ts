import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;

// ── Gemini File API upload (supports files up to 2GB) ─────────────────────────
async function uploadToFileAPI(base64Data: string, mimeType: string, apiKey: string): Promise<{ uri: string; name: string }> {
  const bytes = Buffer.from(base64Data, 'base64');
  const boundary = 'boundary' + Date.now();
  const metadata = JSON.stringify({ file: { display_name: 'media' } });

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n`),
    Buffer.from(metadata),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const uploadRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': body.length.toString(),
      },
      body,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`File API upload failed: ${err}`);
  }

  let file = (await uploadRes.json()).file;

  // Poll until the file is processed
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${apiKey}`
    );
    file = await statusRes.json();
  }

  if (file.state === 'FAILED') throw new Error('File processing failed on Gemini servers');

  return { uri: file.uri as string, name: file.name as string };
}

// ── Delete file from Gemini after use ─────────────────────────────────────────
function deleteFileFromAPI(fileName: string, apiKey: string): void {
  // Fire-and-forget — don't block the response
  fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`, {
    method: 'DELETE',
  }).catch(() => { /* best effort */ });
}

const SECTION_PROMPTS: Record<string, string> = {
  dashboard:  'You are an RPG quest advisor reviewing the user\'s overall stats and progress. Be motivational, use RPG fantasy language, and give advice about improving STR, CON, DEX, and GOLD stats.',
  quests:     'You are a wise quest giver in an RPG world. Help the user set and achieve their goals across money, fitness, sleep, and gym categories. Use epic fantasy language.',
  vices:      'You are a gruff but caring tavern keeper who helps adventurers resist temptation. Comment on their vice tracking (pints, cigarettes, junk food) and celebrate gold saved from skipping vices.',
  gym:        'You are a battle-hardened warrior trainer. Give advice about the user\'s gym workouts, exercises, weights, and strength gains. Use warrior/combat metaphors.',
  nutrition:  'You are a wise alchemist nutrition advisor. Give practical advice about the user\'s diet, calories, macros, and meal choices to fuel their adventures.',
  habits:     'You are a disciplined monk advisor. Give advice about the user\'s daily habits, consistency, and how to build streaks. Use calm, focused language.',
  wake:       'You are a disciplined monk advisor. Help the user with their wake quest, early rising habits, and sleep discipline. Use monk/meditation language.',
  calendar:   'You are a strategic quest planner. Help the user plan their schedule, events, and time management. Use planning and strategy language.',
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI advisor not configured — add GEMINI_API_KEY to .env.local' }, { status: 500 });
  }

  try {
    const { message, section, context, mode, history: rawHistory = [] } = await req.json();

    const genAI = new GoogleGenerativeAI(apiKey);

    // ── Plan generation mode (any activity type) ─────────────────────────────
    if (mode === 'generate_gym_plan') {
      // Disable thinking — plan generation only needs fast structured JSON, not extended reasoning
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generationConfig: { thinkingConfig: { thinkingBudget: 0 } } as any,
      });
      const prefs = context.preferences ?? {};
      const daysPerWeek = parseInt(prefs.daysPerWeek ?? '3', 10);
      const rawType  = (prefs.planType ?? prefs.type ?? '').toLowerCase();
      const rawSplit = (prefs.split ?? '').toLowerCase().replace(/[^a-z]/g, '');

      // ── Detect activity category ────────────────────────────────────────
      const isCycling  = rawType.includes('cycl') || rawType.includes('bike') || rawType.includes('bik');
      const isSwimming = rawType.includes('swim');
      const isRunning  = rawSplit.includes('run') || rawSplit.includes('cardio') || rawType.includes('run') || rawType.includes('marathon') || rawType.includes('jog');
      const isEndurance = isRunning || isCycling || isSwimming;

      const isStudy  = rawType.includes('stud') || rawType.includes('exam') || rawType.includes('revis') || rawType.includes('learn') || rawType.includes('course') || rawType.includes('academic');
      const isYoga   = rawType.includes('yoga') || rawType.includes('pilates') || rawType.includes('stretch') || rawType.includes('mobil');
      const isSport  = rawType.includes('football') || rawType.includes('rugby') || rawType.includes('tennis') || rawType.includes('basketball') || rawType.includes('sport') || rawType.includes('martial') || rawType.includes('box');
      const isGym    = !isEndurance && !isStudy && !isYoga && !isSport;

      // ── Progressive vs repeating ─────────────────────────────────────────
      // Explicit preference wins; otherwise default: gym+study = progressive, others = repeating
      const progressivePref = (prefs.progressive ?? '').toLowerCase();
      const wantsProgressive = progressivePref === 'yes' || progressivePref === 'true'
        || (progressivePref === '' && (isGym || isStudy));
      const wantsRepeating = !wantsProgressive;

      // ── Gym split detection ──────────────────────────────────────────────
      const isPPL        = /p(ush)?p(ull)?l(eg)?s?/.test(rawSplit) || rawSplit.includes('ppl');
      const isUpperLower = rawSplit.includes('upper') || rawSplit.includes('ul') || rawSplit === 'upperlower';
      const isBodyPart   = rawSplit.includes('bodypart') || rawSplit.includes('bro') || rawSplit.includes('isolation');
      const inferredPPL        = isGym && !rawSplit && daysPerWeek >= 5;
      const inferredUpperLower = isGym && !rawSplit && daysPerWeek === 4;

      // ── Build the prompt based on activity type ──────────────────────────
      let expertRole: string;
      let planInstructions: string;
      let formatRules: string;

      // Shared progressive/repeating format instruction
      const progressiveBlock = wantsProgressive
        ? `- isRepeating = false. Generate ${isStudy ? '4–8' : '5'} progressive weeks where each week ${isStudy ? 'covers harder/more advanced material' : 'increases difficulty (more sets, reps, weight, distance, or duration)'}. ${isStudy ? 'Final week label: "Consolidation Week".' : 'Week 5 = deload/recovery (60-70% intensity).'} exercises[] = the Week 1 sessions (used as fallback).`
        : `- isRepeating = true. Do NOT include weeks[]. exercises[] = the full weekly session rotation. Same plan repeats every week.`;

      if (isStudy) {
        expertRole = 'You are an expert academic coach and revision planner.';

        // Parse multi-subject support
        const subjectList = prefs.subjects
          ? prefs.subjects.split(',').map((s: string) => s.trim()).filter(Boolean)
          : prefs.focus ? [prefs.focus] : ['General study'];
        const subjectCount = subjectList.length;
        const weeksUntilExam = Math.min(Math.max(parseInt(prefs.weeksUntilExam ?? '8', 10), 4), 16);
        const confidence = prefs.confidence ?? '';
        const hoursPerDay = parseFloat(prefs.hoursPerDay ?? '2');
        const focusStyle = (prefs.focusStyle ?? '').toLowerCase();
        const oneSubjectPerDay = focusStyle.includes('one') || focusStyle.includes('single') || focusStyle.includes('focus');
        const needsBreaks = hoursPerDay > 2;
        const breakNote = needsBreaks
          ? `IMPORTANT: User is studying ${hoursPerDay}h/day — recoveryNotes MUST recommend a 5–10 min break every 45–60 mins and a longer 20–30 min break after every 2 hours. Mention this in the plan.`
          : '';

        // Study-specific progressive block — uses exam timeline
        const studyProgressiveBlock = wantsProgressive
          ? `- isRepeating = false. Generate ${weeksUntilExam} progressive weeks. Early weeks: content review and notes. Mid weeks: practice questions and topic tests. Final 2 weeks: past papers only, timed conditions. Final week label: "Exam Week – Past Papers Only". exercises[] = Week 1 sessions (used as fallback).`
          : `- isRepeating = true. Do NOT include weeks[]. exercises[] = the full weekly session rotation.`;

        planInstructions = `Create a structured revision plan for: ${prefs.planType ?? 'exam preparation'}.
Goal: ${prefs.goal ?? 'Pass exams with strong grades'}
Subjects: ${subjectList.join(', ')} — use EXACTLY these subjects, do not add extras.
Weeks until exam: ${weeksUntilExam}
Study days per week: ${daysPerWeek}
Hours per day: ${hoursPerDay}
${confidence ? `Confidence per subject: ${confidence}` : ''}
${breakNote}

Generate EXACTLY ${subjectCount} plan${subjectCount > 1 ? 's' : ''} — one plan per subject, named exactly after the subject (e.g. "${subjectList[0]} Revision").
Focus style: ${oneSubjectPerDay ? 'ONE SUBJECT PER DAY — each day is dedicated fully to one subject. Do not mix subjects on the same day.' : 'MIXED — each session can cover multiple topics or subjects in one day.'}
Each "exercise" = one study session type for that subject. Name it descriptively: e.g. "Topic Review – ${hoursPerDay}h", "Past Papers – ${hoursPerDay}h", "Flashcard Drill – ${hoursPerDay}h". Do NOT use gym language.
${confidence ? 'Weaker subjects get more days per week. Stronger subjects get fewer.' : 'Spread days evenly across subjects.'}
Use "sets" = 1. "targetReps" = 0. "targetWeight" = 0. NEVER show weight or reps to the user — this is a study plan not a gym plan.
Spread scheduleDays across ALL plans so no two plans share the same day. Total days across all plans MUST equal exactly ${daysPerWeek}.
recoveryNotes = spaced repetition tips, rest day advice, burnout prevention${needsBreaks ? ', AND mandatory break schedule (5–10 min every 45–60 mins, 20–30 min break after 2h)' : ''}.`;

        formatRules = `${studyProgressiveBlock}
- scheduleTime/scheduleEndTime: realistic study slot (e.g. 09:00–11:00).
- targetWeight always 0. targetReps always 0.
- No two plans may share the same scheduleDays values.`;
      } else if (isEndurance) {
        const activityName = isCycling ? 'Cycling' : isSwimming ? 'Swimming' : 'Running';
        expertRole = `You are an expert ${activityName.toLowerCase()} coach building a science-backed training plan.`;
        planInstructions = `Create a ${activityName} training plan.
Goal: ${prefs.goal ?? 'General fitness / endurance'}
Sessions per week: ${daysPerWeek}
Experience: ${prefs.experience ?? 'Some experience'}
Focus: ${prefs.focus ?? 'Build endurance'}

Generate 1 plan. Alternate hard/easy sessions. Never two hard sessions back-to-back.
ALWAYS include 3 exercises per session in this exact order:
1. "Warm-Up Stretch" — dynamic stretches before the session (sets=1, targetReps=5, targetWeight=0). E.g. leg swings, hip circles, ankle rolls, high knees on the spot.
2. The main ${activityName.toLowerCase()} session (e.g. "${isCycling ? 'Easy 45-min Ride' : isSwimming ? 'Easy 1km Swim' : 'Easy 5k Run'}") — sets=1, targetReps=duration in minutes, targetWeight=0.
3. "Cool-Down Stretch" — static stretches after the session (sets=1, targetReps=5, targetWeight=0). E.g. quad stretch, hamstring stretch, calf stretch, hip flexor stretch.
${wantsProgressive ? 'For progressive weeks: increase the main session duration/intensity each week. Warm-up and cool-down stay constant.' : ''}
recoveryNotes = explain the hard/easy periodisation logic and importance of the warm-up/cool-down for injury prevention.`;
        formatRules = `${progressiveBlock}
- scheduleTime/scheduleEndTime: realistic training hours.
- targetWeight 0 for all endurance sessions.`;
      } else if (isYoga || isSport) {
        const activityName = isYoga ? 'yoga/mobility' : 'sport/athletic';
        expertRole = `You are an expert ${activityName} coach.`;
        planInstructions = `Create a ${prefs.type ?? activityName} training plan.
Goal: ${prefs.goal ?? 'Improve performance and consistency'}
Sessions per week: ${daysPerWeek}
Experience: ${prefs.experience ?? 'Some experience'}
Focus: ${prefs.focus ?? 'General'}

Generate 1 plan. Each "exercise" = one session or drill (e.g. "Hip Mobility Flow 30min", "Footwork Drills 45min").
Use "sets" = 1, "targetReps" = duration in minutes, "targetWeight" = 0.
${wantsProgressive ? 'For progressive weeks: increase difficulty, duration, or complexity each week.' : ''}
recoveryNotes = rest and recovery guidance.`;
        formatRules = `${progressiveBlock}
- scheduleTime/scheduleEndTime: realistic session times.`;
      } else {
        // Gym / weights
        expertRole = 'You are an expert personal trainer creating a science-backed gym programme with proper recovery built in.';
        const splitInstructions = (isPPL || inferredPPL)
          ? `REQUIRED SPLIT: Push/Pull/Legs — generate EXACTLY 3 plans:
  - Plan 1 "Push Day": Chest, Shoulders, Triceps. scheduleDays = [1,4] (Mon+Thu).
  - Plan 2 "Pull Day": Back, Biceps, Rear Delts. scheduleDays = [2,5] (Tue+Fri).
  - Plan 3 "Legs Day": Quads, Hamstrings, Glutes, Calves. scheduleDays = [3,6] (Wed+Sat).
  If daysPerWeek is 3: Push [1], Pull [3], Legs [5] (one day each, no repeats).`
          : (isUpperLower || inferredUpperLower)
          ? `REQUIRED SPLIT: Upper/Lower — generate EXACTLY 2 plans:
  - Plan 1 "Upper Body": Chest, Back, Shoulders, Arms. scheduleDays = [1,4] (Mon+Thu).
  - Plan 2 "Lower Body": Quads, Hamstrings, Glutes, Calves, Core. scheduleDays = [2,5] (Tue+Fri).`
          : isBodyPart
          ? `REQUIRED SPLIT: Body Part — generate EXACTLY 5 plans (one muscle group per day):
  Chest [1], Back [2], Shoulders [3], Arms [4], Legs [5]. One day each per week.`
          : `REQUIRED SPLIT: Full Body — generate 1 plan scheduled ${daysPerWeek <= 2 ? 'with rest days between (e.g. [1,4])' : 'Mon/Wed/Fri [1,3,5]'}. Hit all major muscle groups each session.`;
        planInstructions = `Training type: ${prefs.type ?? 'Weights and gym training'}
Goal: ${prefs.goal ?? 'General fitness'}
Experience: ${prefs.experience ?? 'Some experience'}
Days per week: ${daysPerWeek}
Focus area: ${prefs.focus ?? 'Full body'}
Stats: STR=${context.stats?.str ?? 10}, CON=${context.stats?.con ?? 10}, Level=${context.stats?.level ?? 1}

${splitInstructions}

RECOVERY RULES: Never schedule the same muscle group on consecutive days. No two plans may share a scheduleDays value. recoveryNotes must explain the recovery logic.
EXERCISE COUNT: Each plan must have 5–8 exercises. A real gym session has multiple exercises per visit — never generate fewer than 5. Each exercise targets a specific muscle within that plan's muscle group.
FOCUS BIAS: If the user's goal or focus mentions a specific muscle group, add MORE exercises targeting that area (at least 3 of the 5–8 must hit it directly). E.g. if they want bigger glutes/bum/legs/lower body — MUST include: Hip Abductor Machine, Hip Adductor Machine, Stair Master (or Step-ups), Romanian Deadlift, Glute Bridge/Hip Thrust. Prioritise these over generic exercises.`;
        formatRules = `- exercises[] must mirror the Week 1 exercises (used as fallback). 5–8 exercises per plan, each targeting a distinct muscle within the plan's focus.
- For Full Body plans: include compound movements (squat/deadlift/bench/row/press) PLUS 2–3 accessory exercises.
- For split plans (Push/Pull/Legs/Upper/Lower): include 5–8 exercises hitting every major muscle in that split.
- If the focus/goal mentions glutes, bum, legs, lower body: MUST include Hip Abductor Machine, Hip Adductor Machine, and Stair Master in the legs/lower plan.
- targetWeight 0 = bodyweight. Tailor weights to experience and STR (${context.stats?.str ?? 10}/150).
${progressiveBlock}
- scheduleTime/scheduleEndTime: realistic gym hours (~1 hour session).`;
      }

      const prompt = `${expertRole}

${planInstructions}

Return ONLY a raw JSON array (no markdown, no code fences, no wrapping object):
[
  {
    "name": "Plan name",
    "emoji": "💪",
    "color": "#e05a2b",
    "split": "Short plan type label",
    "recoveryNotes": "Recovery/rest guidance.",
    "isRepeating": false,
    "exercises": [
      { "name": "Session or exercise name", "sets": 1, "targetReps": 10, "targetWeight": 0 }
    ],
    "weeks": [
      { "weekNumber": 1, "exercises": [{ "name": "Session or exercise name", "sets": 1, "targetReps": 10, "targetWeight": 0 }] }
    ],
    "scheduleDays": [1, 3, 5],
    "scheduleTime": "07:00",
    "scheduleEndTime": "08:00"
  }
]

Rules:
- ALWAYS return an array, even for a single plan.
- CRITICAL: The total number of scheduleDays across ALL plans combined MUST equal exactly ${daysPerWeek}. Count them before returning. Never add extra days.
- scheduleDays: 0=Sun … 6=Sat. Sort days Mon-first: spread across [1,2,3,4,5,6,0] in order. E.g. 3 days = [1,3,5] (Mon/Wed/Fri).
- Plan name: use the user's own words/slang where possible. If they said "full body" → name it "Full Body Plan". If they said "ab workout" → "Ab Workout". Keep it natural and match their language.
- All plans in a split share the same split label string.
- Pick an appropriate emoji and a vivid hex color for the plan type.
${formatRules}`;

      console.log('[GymPlan] prefs:', JSON.stringify(prefs));
      console.log('[GymPlan] planType:', isStudy ? 'study' : isEndurance ? 'endurance' : isYoga ? 'yoga' : isSport ? 'sport' : 'gym');
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      console.log('[GymPlan] raw Gemini response:', text.slice(0, 300));
      // Strip code fences anywhere
      text = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
      // Extract array: find first [ to last ]
      const arrStart = text.indexOf('[');
      const arrEnd   = text.lastIndexOf(']');
      if (arrStart !== -1 && arrEnd > arrStart) text = text.slice(arrStart, arrEnd + 1);
      const plans = JSON.parse(text);
      console.log('[GymPlan] parsed plans count:', Array.isArray(plans) ? plans.length : 'not array');
      return NextResponse.json({ plans: Array.isArray(plans) ? plans : [plans] });
    }

    if (mode === 'generate_meal_plan') {
      // Enable thinking for meal plans — accuracy matters more than speed here
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generationConfig: { thinkingConfig: { thinkingBudget: 8000 } } as any,
      });
      const goal = context.nutritionGoal ?? { calories: 2000, protein: 150, carbs: 200, fat: 65 };
      const prefs = context.preferences ?? {};
      const isBulk = (prefs.cookingPref ?? '').toLowerCase().includes('bulk') || (prefs.cookingPref ?? '').toLowerCase().includes('batch') || (prefs.cookingPref ?? '').toLowerCase().includes('prep');
      const budget = prefs.weeklyBudget ?? '';
      const allergies = prefs.allergies ?? '';
      const cuisine = prefs.cuisinePreference ?? '';
      const dietType = prefs.dietType ?? 'No restrictions';
      const cookingPref = prefs.cookingPref ?? 'Happy to cook';

      // Budget guidance for meal pricing
      const budgetGuidance = budget.includes('low') || budget.includes('tight') || budget.includes('cheap') || budget.includes('£') && parseInt(budget.replace(/[^0-9]/g,''),10) < 40
        ? 'BUDGET: User has a tight/low budget. Use cheap staples: eggs, oats, rice, pasta, lentils, tinned beans, frozen veg, chicken thighs, tuna. Avoid expensive cuts, exotic ingredients, or premium products.'
        : budget.includes('high') || budget.includes('flexible') || budget.includes('£') && parseInt(budget.replace(/[^0-9]/g,''),10) > 80
        ? 'BUDGET: User has a flexible budget. Include a good variety including quality proteins (salmon, lean beef, chicken breast), fresh produce, and varied wholesome ingredients.'
        : 'BUDGET: Mid-range. Balance cost and quality — use chicken breast, eggs, oats, rice, pasta, fresh veg, Greek yoghurt, etc.';

      const prompt = `You are a world-class nutrition coach creating a highly personalised meal options library. Think carefully before generating — accuracy and personalisation matter more than speed.

Daily targets: ${goal.calories} kcal | ${goal.protein}g protein | ${goal.carbs}g carbs | ${goal.fat}g fat | ${goal.sugar ?? 50}g sugar

User profile:
- Nutrition goal: ${prefs.nutritionGoal ?? 'Maintain weight / healthy eating'}
- Diet type: ${dietType}
- Allergies / intolerances: ${allergies || 'None stated'}
- Cuisine preferences: ${cuisine || 'No preference — include variety'}
- Weekly food budget: ${budget || 'Mid-range'}
- Meals per day: ${prefs.mealsPerDay ?? '3-4'}
- Cooking preference: ${cookingPref}

${budgetGuidance}
${allergies ? `ALLERGY CRITICAL: Absolutely no ${allergies} in ANY meal. Double-check every ingredient.` : ''}
${cuisine ? `CUISINE: Lean heavily towards ${cuisine} — but include some variety too.` : ''}
${dietType !== 'No restrictions' ? `DIET STRICT: Every single meal must comply with ${dietType}. No exceptions.` : ''}

Generate a large, genuinely varied meal options library the user can pick from throughout the week.
Return ONLY a raw JSON object (no markdown, no code fences) in this exact shape:
{
  "meals": [
    { "name": "Meal name", "category": "Breakfast", "calories": 400, "protein": 30, "carbs": 40, "fat": 10, "sugar": 8 }
  ]
}
Rules:
- Return AT LEAST 24 meals total, ideally 28-32
- Spread across: "Breakfast" (6-7), "Lunch" (7-8), "Dinner" (7-8), "Snack" (4-6)${isBulk ? ', "Bulk Cook" (4-6)' : ''}
${isBulk ? '- "Bulk Cook" = large batch meals that make 4-6 servings (label clearly e.g. "Batch Chicken & Rice (×5 servings)")' : ''}
- Each meal must respect ALL dietary restrictions and allergies above
- Macros must add up realistically — cross-check protein+carbs+fat → calories (4/4/9 kcal per gram)
- Name meals naturally, the way real people say them (e.g. "Scrambled Eggs on Toast" not "Protein Egg Dish")
- Vary cooking styles, ingredients, and flavours — real variety, not 10 versions of chicken and rice
- Size each as a single serving
- sugar = total sugar in grams (subset of carbs)
- Scale meal sizes realistically to the user's daily calorie target (${goal.calories} kcal)`;

      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const mealPlan = JSON.parse(text);
      return NextResponse.json({ mealPlan });
    }

    if (mode === 'suggest_meals') {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generationConfig: { thinkingConfig: { thinkingBudget: 0 } } as any,
      });
      const goal  = context.nutritionGoal ?? { calories: 2000, protein: 150, carbs: 200, fat: 65 };
      const userPrompt = context.prompt ?? 'healthy meal ideas';
      const prompt = `You are a nutrition coach. A user is asking for meal suggestions.
Daily goals: ${goal.calories} kcal, ${goal.protein}g protein, ${goal.carbs}g carbs, ${goal.fat}g fat
User request: "${userPrompt}"

Return ONLY a raw JSON object (no markdown, no code fences) in this exact shape:
{
  "meals": [
    {
      "name": "Meal name",
      "category": "Breakfast",
      "calories": 400,
      "protein": 30,
      "carbs": 40,
      "fat": 10,
      "sugar": 8,
      "ingredients": "200g chicken breast, 150g rice, ...",
      "recipe": "1. Cook the chicken...\n2. ...",
      "micros": {
        "vitA": 120, "vitC": 15, "vitD": 2.5, "vitE": 1.2, "vitK": 10,
        "vitB6": 0.3, "vitB12": 0.8, "folate": 30,
        "calcium": 150, "iron": 3.5, "magnesium": 45, "zinc": 2.5, "potassium": 400, "sodium": 300
      }
    }
  ]
}
Rules:
- Return 4-8 meals that directly match what the user asked for
- Pick the most appropriate category for each meal: "Breakfast", "Lunch", "Dinner", "Snack", or "Bulk Cook"
- Real food names, realistic macros for a single serving
- sugar is grams of total sugar (subset of carbs)
- ingredients: comma-separated list of ingredients with rough quantities
- recipe: numbered step-by-step cooking instructions (use \\n between steps)
- micros: estimated micronutrients per serving — units: vitA µg, vitC mg, vitD µg, vitE mg, vitK µg, vitB6 mg, vitB12 µg, folate µg, calcium mg, iron mg, magnesium mg, zinc mg, potassium mg, sodium mg — never omit or null
- Be specific and creative based on the user's exact request`;

      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const mealPlan = JSON.parse(text);
      return NextResponse.json({ mealPlan });
    }

    if (mode === 'analyze_food') {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generationConfig: { thinkingConfig: { thinkingBudget: 0 } } as any,
      });
      const foodDesc = context.foodDescription ?? '';
      const prompt = `You are a precise nutrition database. Analyze this food and return its full nutritional content.
Food: "${foodDesc}"

Return ONLY a raw JSON object (no markdown, no code fences) in this exact shape:
{
  "name": "Clean descriptive food name",
  "calories": 350,
  "protein": 25,
  "carbs": 40,
  "fat": 8,
  "sugar": 12,
  "micros": {
    "vitA": 120,
    "vitC": 15,
    "vitD": 2.5,
    "vitE": 1.2,
    "vitK": 10,
    "vitB6": 0.3,
    "vitB12": 0.8,
    "folate": 30,
    "calcium": 150,
    "iron": 3.5,
    "magnesium": 45,
    "zinc": 2.5,
    "potassium": 400,
    "sodium": 300
  }
}
Rules:
- Be accurate for the described serving size; if quantity is specified (e.g. "2 eggs") scale accordingly
- All macro values are per the full described serving
- sugar is grams of total sugar (subset of carbs)
- Units: vitA µg, vitC mg, vitD µg, vitE mg, vitK µg, vitB6 mg, vitB12 µg, folate µg
- Units: calcium mg, iron mg, magnesium mg, zinc mg, potassium mg, sodium mg
- Estimate all values — never return null or omit micros fields`;

      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const food = JSON.parse(text);
      return NextResponse.json({ food });
    }

    if (mode === 'analyze_body_composition') {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const imageBase64 = context.imageBase64 ?? '';
      const mimeType    = context.mimeType ?? 'image/jpeg';
      const prompt = `You are a certified sports scientist and body composition specialist. Analyse this photo and provide an honest, professional body composition assessment.

Return ONLY a raw JSON object (no markdown, no code fences):
{
  "bodyFatLow": 15,
  "bodyFatHigh": 19,
  "build": "athletic",
  "muscleDevelopment": "moderate",
  "summary": "2-3 sentence honest assessment of what is visible",
  "tips": "2-3 actionable, evidence-based observations about what this person could focus on to reach their goals",
  "disclaimer": "This is an AI visual estimate only — not a medical or clinical measurement. Body fat estimates from photos carry ±3-5% error. For accurate measurements, use DEXA, hydrostatic weighing, or skinfold calipers with a qualified professional."
}

Rules:
- bodyFatLow and bodyFatHigh are the estimated body fat percentage range (whole numbers)
- build options: "lean", "athletic", "average", "bulking", "heavy"
- muscleDevelopment options: "beginner", "moderate", "advanced", "elite"
- summary: honest, kind, and professional — mention visible body parts, overall composition, and any notable features
- tips: specific and actionable based on what's visible (e.g. "core definition suggests low visceral fat", "shoulder-to-waist ratio indicates good upper body development")
- If the image is not a person or is unclear, return bodyFatLow: 0, bodyFatHigh: 0, build: "unknown", summary: "Could not analyse — please submit a clear full-body or upper-body photo"
- Never be negative or judgmental — always professional and motivating`;

      const result = await model.generateContent([
        { inlineData: { mimeType, data: imageBase64 } },
        prompt,
      ]);
      let text = result.response.text().trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const result2 = JSON.parse(text);
      return NextResponse.json({ result: result2 });
    }

    if (mode === 'analyze_food_image') {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const imageBase64 = context.imageBase64 ?? '';
      const mimeType    = context.mimeType ?? 'image/jpeg';
      const prompt = `You are a precise nutrition database. Look at this photo of food and return its full nutritional content for the estimated serving shown.

Return ONLY a raw JSON object (no markdown, no code fences) in this exact shape:
{
  "name": "Clean descriptive food name (e.g. 'Grilled Chicken with Rice and Vegetables')",
  "calories": 350,
  "protein": 25,
  "carbs": 40,
  "fat": 8,
  "sugar": 12,
  "micros": {
    "vitA": 120,
    "vitC": 15,
    "vitD": 2.5,
    "vitE": 1.2,
    "vitK": 10,
    "vitB6": 0.3,
    "vitB12": 0.8,
    "folate": 30,
    "calcium": 150,
    "iron": 3.5,
    "magnesium": 45,
    "zinc": 2.5,
    "potassium": 400,
    "sodium": 300
  }
}
Rules:
- Identify all food items visible in the photo and estimate the total serving size
- Base macros on what appears to be a realistic single-plate/single-meal serving
- sugar is grams of total sugar (subset of carbs)
- Units: vitA µg, vitC mg, vitD µg, vitE mg, vitK µg, vitB6 mg, vitB12 µg, folate µg
- Units: calcium mg, iron mg, magnesium mg, zinc mg, potassium mg, sodium mg
- Estimate all values — never return null or omit micros fields
- If the image is unclear or not food, return a best guess with name "Unknown food"`;

      const result = await model.generateContent([
        { inlineData: { mimeType, data: imageBase64 } },
        prompt,
      ]);
      let text = result.response.text().trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const food = JSON.parse(text);
      return NextResponse.json({ food });
    }

    // ── Lift verification for leaderboard ───────────────────────────────────
    if (mode === 'verify_lift') {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const mimeType        = context.mimeType  ?? 'video/mp4';
      const claimedExercise = context.exercise  ?? '';
      const claimedWeight   = context.weight    ?? 0;

      // Accept pre-uploaded fileUri (from /api/gemini/upload) or fall back to base64
      let fileUri: string;
      let fileName: string | null = null;
      if (context.fileUri) {
        fileUri = context.fileUri;
      } else {
        const uploaded = await uploadToFileAPI(context.mediaBase64 ?? '', mimeType, apiKey);
        fileUri = uploaded.uri;
        fileName = uploaded.name;
      }

      const prompt = `You are a certified powerlifting judge and strength coach verifying a 1-rep max lift submission for a public leaderboard.

The user claims this video shows: ${claimedExercise} for ${claimedWeight}kg (1 rep max).

Analyse the video/photo and return ONLY a raw JSON object (no markdown, no code fences):
{
  "verified": true or false,
  "exerciseMatch": true or false,
  "looksLikeMaxEffort": true or false,
  "confidence": "high" | "medium" | "low",
  "notes": "1-2 sentences on what you saw",
  "rejectionReason": "specific reason if rejected, or null if verified"
}

Rules:
- verified = true only if: correct exercise, appears to be a single rep, some effort visible, video clear enough to judge
- exerciseMatch: does what is visible match "${claimedExercise}"?
- looksLikeMaxEffort: visible struggle, slow tempo, grind — not a warm-up speed rep
- confidence: how clearly is the lift visible (lighting, angle, framing)
- rejectionReason: be specific (e.g. "Video too dark to verify", "Multiple reps performed", "Exercise does not match claimed lift") — null if verified
- A blurry or very unclear video should be rejected with low confidence`;

      const result = await model.generateContent([
        { fileData: { mimeType, fileUri } },
        prompt,
      ]);
      if (fileName) deleteFileFromAPI(fileName, apiKey);
      else if (context.fileUri) deleteFileFromAPI(context.fileUri.split('/').pop()!, apiKey);
      let text = result.response.text().trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const verification = JSON.parse(text);
      return NextResponse.json({ verification });
    }

    // ── Form video / photo analysis ─────────────────────────────────────────
    if (mode === 'analyze_form_video') {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const mimeType = context.mimeType ?? 'video/mp4';

      // Accept pre-uploaded fileUri (from /api/gemini/upload-chunk) or fall back to base64
      let fileUri: string;
      let fileName: string | null = null;
      if (context.fileUri) {
        fileUri = context.fileUri;
        fileName = context.fileName ?? null;
        // Poll until Gemini finishes processing the file (videos can take 30-60s)
        if (fileName) {
          let attempts = 0;
          let state = 'PROCESSING';
          while (state === 'PROCESSING' && attempts < 25) {
            await new Promise(r => setTimeout(r, 2000));
            const s = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
            );
            const d = await s.json();
            state = d.state ?? 'ACTIVE';
            attempts++;
          }
          if (state === 'FAILED') throw new Error('Gemini file processing failed');
        }
      } else {
        const uploaded = await uploadToFileAPI(context.mediaBase64 ?? '', mimeType, apiKey);
        fileUri = uploaded.uri;
        fileName = uploaded.name;
      }

      const prompt = `You are a certified personal trainer and biomechanics expert. Analyse this gym exercise video or photo and assess the athlete's form.

Return ONLY a raw JSON object (no markdown, no code fences) in this exact shape:
{
  "exercise": "Name of the exercise being performed",
  "rating": "Good" | "Fair" | "Needs Work",
  "positives": ["What they are doing well — list 1-3 specific things"],
  "issues": ["Specific form issues observed — list up to 4, or empty array if none"],
  "corrections": ["Actionable cue for each issue — same length as issues array"],
  "safetyNote": "One sentence safety reminder relevant to this exercise and any issues found"
}

Rules:
- Be specific and use exercise coaching language (e.g. "knees tracking over toes", "neutral spine", "hip hinge")
- If the media is too blurry or unclear to assess, set rating to "Needs Work" and issues to ["Video/photo quality too low for accurate analysis — try a clearer, well-lit clip"]
- If no clear exercise is visible, set exercise to "Unknown exercise"
- Keep each point concise (max 12 words per item)
- safetyNote must always be present and relevant`;

      const result = await model.generateContent([
        { fileData: { mimeType, fileUri } },
        prompt,
      ]);
      if (fileName) deleteFileFromAPI(fileName, apiKey);
      let text = result.response.text().trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const analysis = JSON.parse(text);
      return NextResponse.json({ analysis });
    }

    // ── Persistent AI assistant mode ────────────────────────────────────────
    if (mode === 'assistant') {
      const today = new Date().toISOString().slice(0, 10);
      const intensity = Number(context.aiIntensity ?? 50);
      const intensityInstruction = intensity <= 20
        ? 'COACHING STYLE — Supportive (intensity 1-20): Be extremely gentle, warm, and non-judgmental. Celebrate every small win enthusiastically. Never criticise or point out failures directly. If they miss a goal say something like "That\'s totally okay — what got in the way? Let\'s make tomorrow count 🤗"'
        : intensity <= 40
        ? 'COACHING STYLE — Encouraging (intensity 21-40): Be positive and motivating. Give gentle nudges when goals are missed. Focus on progress over perfection. Keep the tone warm and friendly. Mild accountability but always supportive.'
        : intensity <= 60
        ? 'COACHING STYLE — Balanced (intensity 41-60): Be honest and direct. Mix genuine praise with clear accountability. Point out shortfalls constructively but always offer a path forward. Direct but kind.'
        : intensity <= 80
        ? 'COACHING STYLE — Tough Love (intensity 61-80): Push the user hard. Call out missed goals directly (e.g. "You missed your step goal 3 days this week — that needs to change"). Be demanding but always goal-focused. No sugarcoating, but no cruelty either.'
        : 'COACHING STYLE — Drill Sergeant (intensity 81-100): Maximum intensity. Zero tolerance for excuses. Military-style accountability. If they miss goals be blunt and demanding (e.g. "You said you wanted results. Skipping workouts won\'t get you there. Lock in — no more excuses."). Relentlessly push them toward their goals.';
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: `You are GAINN's personal AI assistant — a knowledgeable personal coach with full access to this user's data, schedule, nutrition, and activity. You give accurate, evidence-based advice tailored specifically to what they have going on today and this week.

FEATURE EXPLANATION — if a user seems confused about how something works (e.g. asks "how do I...?", "what does X do?", "why isn't X working?", "I don't understand"), give a short, clear explanation of that feature. Keep it to 2–4 sentences max. Cover: what it is, how to use it, and one practical tip. Don't be overly technical — explain it like a helpful friend. Features include: Habits (daily check-offs that build streaks and earn XP), Gym Plans (AI-generated workout plans you log after each session), Vice Tracker (track temptations you resist and earn tokens), Calendar (schedule events and see daily breakdowns), GPS Tracker (record walks/runs/cycles with live map), Quests (goal-setting with milestones), Finance (track income, bills, and wants), Nutrition (log meals and hit your calorie/macro goals), Sleep (log sleep and wake times), Steps (track daily step count), Leaderboard (compete on lifts and XP with others).

${intensityInstruction}

${context.userContext}

Available habits: ${context.habitList || 'none listed'}
${context.sectionContext}

CALENDAR-AWARE ADVICE RULES (apply these automatically when relevant — be specific with numbers):

Running/endurance event today or tomorrow:
- Hydration: +500–750ml above normal goal (aim for urine colour pale yellow)
- Calories: +300–500 kcal above TDEE, prioritise carbs (4–6g/kg body weight) 2–3hrs before
- Pre-run: light carb meal 2–3hrs before, avoid high fat/fibre within 1hr
- Post-run: 20–30g protein + carbs within 30–45 min for recovery
- Sleep: critical — aim for 8+ hrs night before a hard effort

Gym/weights session today or tomorrow:
- Protein: aim for 1.6–2.2g/kg body weight on training days
- Calories: +200–300 kcal above TDEE on lifting days
- Pre-workout: moderate carbs + protein 1–2hrs before
- Post-workout: 25–40g protein within 45 min (whey, chicken, Greek yoghurt etc.)
- Hydration: +300–500ml above normal, sip throughout session

Rest/recovery day:
- Reduce calories slightly (10–15% below TDEE) — maintenance intake
- Keep protein high (same as training day) to support muscle repair
- Prioritise sleep and hydration
- Light movement (walk, stretch) still beneficial

Sport/match day:
- Similar to running: carb-load the evening before
- Hydration: start well-hydrated, drink 400–600ml in the 2hrs before
- Avoid new foods or heavy meals on match day

Long travel/flight:
- Increase water significantly (+500ml minimum), alcohol and caffeine dehydrate further
- Move every 1–2hrs, stretch legs
- Avoid heavy meals before/during

Busy work day:
- Meal prep/plan ahead to avoid skipped meals or poor choices
- Aim to hit protein goal even on hectic days
- Short walk breaks improve focus and hit step goal

General rules for accurate advice:
- Always calculate from the user's actual TDEE shown in their profile
- Reference their specific calendar events by name when giving advice
- If they haven't hit their water goal and have exercise today, flag it proactively
- If calories logged are significantly below target on a training day, flag it
- Give specific gram/ml numbers, not vague "eat more" advice
- Base protein recommendations on their actual body weight
- If they ask how to prepare for a specific event, give a 24hr plan

LOGGING CAPABILITIES — when the user asks you to log, track, record or add anything, return a JSON response with both a reply and an action.

You MUST return ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "reply": "your friendly confirmation message",
  "action": { ... } or null
}

Available actions:

Log steps:
{ "type": "log_steps", "steps": 8000 }

Log a single food/meal (always include micros with your best estimate — use null only if truly unknown). PORTION SIZING: unless the user specifies an exact amount (e.g. "200g", "a large bowl"), scale the estimated calories and macros to a realistic portion for THIS user based on their height, weight, age and TDEE from the profile above. A 90kg active male needs larger portions than a 55kg sedentary female — adjust accordingly and mention your assumption briefly in your reply:
{ "type": "log_food", "name": "Chicken salad", "calories": 450, "protein": 35, "carbs": 20, "fat": 12, "saturatedFat": 2, "unsaturatedFat": 10, "sugar": 3, "micros": { "vitA": 90, "vitC": 12, "vitD": 0.2, "vitE": 1.2, "vitK": 40, "vitB6": 0.6, "vitB12": 0.3, "folate": 60, "calcium": 45, "iron": 2.1, "magnesium": 38, "zinc": 1.8, "potassium": 420, "sodium": 380 } }

Log multiple foods at once — IMPORTANT: if the user mentions more than one food item or meal in a single message (e.g. "I had eggs for breakfast, a sandwich for lunch and pasta for dinner"), you MUST use this action to log each as a separate entry. Never combine multiple foods into one log_food entry. Apply the same portion-sizing rule as log_food — scale each entry to the user's body stats unless they specified a quantity:
{ "type": "log_food_multiple", "meals": [ { "name": "Scrambled eggs", "calories": 220, "protein": 18, "carbs": 2, "fat": 14, "saturatedFat": 4, "unsaturatedFat": 10, "sugar": 0, "micros": { "vitA": 90, "vitC": 0, "vitD": 1.1, "vitE": 1.0, "vitK": 0.4, "vitB6": 0.2, "vitB12": 0.9, "folate": 28, "calcium": 56, "iron": 1.8, "magnesium": 12, "zinc": 1.3, "potassium": 140, "sodium": 180 } }, { "name": "Tuna sandwich", "calories": 380, "protein": 28, "carbs": 40, "fat": 8, "saturatedFat": 1, "unsaturatedFat": 7, "sugar": 3, "micros": { "vitA": 10, "vitC": 2, "vitD": 0.5, "vitE": 0.8, "vitK": 5, "vitB6": 0.4, "vitB12": 1.2, "folate": 30, "calcium": 80, "iron": 2.5, "magnesium": 30, "zinc": 1.0, "potassium": 280, "sodium": 520 } } ] }

Log food for a PAST date (when user says they forgot to log, or mentions food they had yesterday / a specific past day) — DO NOT use log_food/log_food_multiple for past dates. Use this action instead so the app can show a confirmation before writing. The "date" must be YYYY-MM-DD. Apply the same body-stat portion-sizing rule. Your reply must ask the user to confirm, e.g. "I'll add [meals] to [day] — shall I go ahead?":
{ "type": "confirm_past_food_log", "date": "2026-03-27", "dateLabel": "yesterday (27 Mar)", "meals": [ { "name": "Chicken burger", "calories": 600, "protein": 30, "carbs": 40, "fat": 20, "saturatedFat": 7, "unsaturatedFat": 13, "sugar": 5 } ] }

Log water (ml):
{ "type": "log_water", "amount": 500 }

Mark habit complete (match habit name from the list above):
{ "type": "log_habit", "habitName": "Morning Run" }

Log sleep (onTime = did they hit their sleep/wake target):
{ "type": "log_sleep", "onTime": true }

Update step goal:
{ "type": "set_step_goal", "steps": 12000 }

Log a weight measurement (always convert to kg):
{ "type": "log_weight", "weight": 82.5 }

Update the user's primary goals (replace the full list):
{ "type": "set_goals", "goals": ["Build Muscle", "Lose Fat"] }

Add XP to the user (triggers level-up if threshold crossed):
{ "type": "add_xp", "amount": 50 }

Add to a specific RPG stat (str, con, dex, or gold):
{ "type": "add_stat", "stat": "str", "amount": 5 }

Set a specific RPG stat to an exact value (str, con, dex, gold, xp, level):
{ "type": "set_stat", "stat": "str", "value": 25 }

Set the user's wake-up target time (HH:MM 24h):
{ "type": "set_wake_time", "time": "06:30" }

Set the user's bedtime target (HH:MM 24h):
{ "type": "set_bed_time", "time": "22:30" }

Set the user's savings goal (currency amount):
{ "type": "set_savings_goal", "amount": 2000 }

Set the user's activity level (sedentary, lightly_active, moderate, active, very_active):
{ "type": "set_activity_level", "level": "active" }

Add an event to the user's calendar (date YYYY-MM-DD, times HH:MM 24h, color hex — use purple #7c3aed for workouts, blue #4a9eff for sport/social, green #16a34a for meals/nutrition, red #ef4444 for rest/health):
{ "type": "add_calendar_event", "title": "Morning Run", "date": "2026-03-28", "startTime": "07:00", "endTime": "07:45", "allDay": false, "location": "Park", "notes": "Easy 5k", "color": "#7c3aed", "reminder": 15 }

For all-day events (no specific time):
{ "type": "add_calendar_event", "title": "Rest Day", "date": "2026-03-29", "startTime": "", "endTime": "", "allDay": true, "location": "", "notes": "", "color": "#ef4444", "reminder": 0 }

Remove a calendar event (use the event id from the user's calendar context above):
{ "type": "delete_calendar_event", "id": "abc1234" }

Edit an existing training plan (gym, running, cycling, swimming, or any plan) — when the user mentions editing, changing, updating or adjusting any plan, follow this exact 3-step flow:
STEP 1 — Read it back briefly: find the plan in "ALL GYM PLANS" above, confirm you can see it in one short line (e.g. "Got it — your Push Day: Bench 4×8 @60kg, OHP 4×8 @40kg, Dips 3×12."). Use the [id:...] value shown there as planId.
STEP 2 — Ask max 1 focused question: what specifically do they want changed and why? Keep it to one sentence.
STEP 3 — Once you know exactly what to change, generate the full updated fields and trigger:
{ "type": "update_gym_plan", "planId": "abc1234", "patch": { "exercises": [...], "weeks": [...] } }
Only include fields that actually change in patch{}. Never trigger update_gym_plan without completing steps 1 and 2 first.
IMPORTANT: If the user has already told you what to change in their first message (e.g. "edit my push day and swap bench for incline press"), skip step 2 and go straight from step 1 to step 3.
CRITICAL — COMPLETE ARRAYS ONLY: When patching "exercises" or "weeks", you MUST include the COMPLETE array — every exercise, every week. Copy all unchanged exercises exactly as shown in "ALL GYM PLANS" above (preserve their [id:...] values), and only modify the specific ones being changed. NEVER send a partial array with just the changed exercises — this will delete all the others. NEVER send exercises:[] or weeks:[] unless the user explicitly asked to remove everything.
DELETED PLAN RULE: If the user says they deleted a plan (e.g. "I deleted it", "can you rebuild it", "it's gone"), NEVER use update_gym_plan. Always use generate_gym_plan instead to create a fresh plan.

Build ANY training, fitness, or study plan — gym, running, cycling, swimming, yoga, sport, studying for an exam, or anything else.

─── GYM / FITNESS PLANS ───
TRIGGER when you know: (1) goal, (2) days per week, (3) focus/muscle group preference. Max 2 questions before triggering.
For gym plans — if the user hasn't mentioned a focus area, ask: "Are you looking to train the full body, or focus on specific areas like upper body, legs, chest, back, or a push/pull/legs split?"
- If they say "general", "not sure", "whatever", "full body" → use Full Body split
- If they mention specific muscles or a split → use that
- Do NOT ask about focus for running, cycling, swimming, or other non-gym activities
Progressive vs repeating — infer from context, only ask if genuinely unclear:
- "same each week" / "keep it simple" → progressive = "no"
- "get harder" / "build up" / "progress" → progressive = "yes"
- Default: gym → "yes", endurance/sport/other → "no"
{ "type": "generate_gym_plan", "preferences": { "planType": "Weights and gym training", "goal": "Build muscle", "experience": "Some experience", "daysPerWeek": "3", "focus": "Full body", "split": "Full Body", "progressive": "no" } }
NOTE: use "planType" (not "type") inside preferences to avoid field name collision.
For gym/weights the "split" field: infer from daysPerWeek if not stated (1-3→Full Body, 4→Upper/Lower, 5-6→Push/Pull/Legs). Use the user's gymExperience/runExperience from context for "experience".

─── STUDY / REVISION PLANS ───
When a user asks for a revision/study plan — NEVER assume their subjects or modules. Always ask.
Gather these in up to 3 conversational questions (ask only what you don't know, max 2 per message):

Q1: "Which subjects (or modules) are you revising, and when's your exam?" — always ask this first if not stated.
Q2: "How many hours a day are you looking to study?" — always ask, do not assume.
Q3: "Do you prefer to focus on one subject per day, or mix multiple topics in a session? (Some people find it easier to deep-focus on one thing at a time — totally fine either way!)" — always ask, important for personalisation.
Q4 (optional): "How confident are you in each subject — strong, average, or weak?" — helpful but not blocking.

BREAK RULE: If hoursPerDay > 2, add a note in recoveryNotes recommending a break every 45–60 mins (e.g. 5–10 min break, longer break after 2h). Mention this naturally in your reply too.

Once you know subjects + exam date + daily hours + focus style → trigger immediately.
{ "type": "generate_gym_plan", "preferences": { "planType": "Revision – A-Level", "goal": "Pass A-levels with top grades", "subjects": "Maths, Physics, Chemistry", "weeksUntilExam": "12", "hoursPerDay": "3", "focusStyle": "one subject per day", "confidence": "Maths: strong, Physics: weak, Chemistry: average", "daysPerWeek": "5" } }
- subjects: comma-separated — use EXACTLY what the user said, do not add or assume extra subjects
- weeksUntilExam: convert any date/month to weeks from today (${today})
- hoursPerDay: hours per day the user wants to study
- focusStyle: "one subject per day" or "mixed topics" — drives how sessions are structured
- daysPerWeek: total study days per week (ask if not stated, default 5)
- planType: "Study – [subject]" or "Revision – [exam name]" matching what they said

AFTER generating, tell the user: "If you want detailed advice on how to tackle a specific subject, you can ask me and I'll do my best — or for in-depth subject help, tools like Claude, ChatGPT, or Gemini are great too. I'm here to help you plan your time, manage breaks, and keep you on track! 😊"

─── MEAL PLAN / MEAL LIBRARY ───
When a user asks for a meal plan, ask up to 3 focused questions before triggering. Ask in groups of 2 max. Be conversational — one exchange at a time.
Questions to gather (ask only what you don't already know):
1. "Do you have any allergies or dietary requirements? E.g. vegetarian, vegan, gluten-free, nut allergy, dairy-free?"
2. "What's your weekly food budget roughly — are you working with a tight budget, mid-range, or do you have flexibility?"
3. "Do you have a favourite cuisine or any foods you love? E.g. Asian, Italian, Mexican, Mediterranean?"
4. Cooking preference — quick/easy meals, love to cook, meal prep/batch cook?
5. Meals per day (if not obvious from context)
The user's nutrition goal is already in context — don't ask again unless unclear.
Once you know allergies + budget + cuisine preference → trigger immediately. The rest can be inferred.
{ "type": "generate_meal_plan", "preferences": { "nutritionGoal": "Lose weight", "dietType": "Vegetarian", "allergies": "Nuts", "weeklyBudget": "mid-range", "cuisinePreference": "Asian and Mediterranean", "mealsPerDay": "3", "cookingPref": "Quick and easy meals" } }

If the user is NOT asking to log or change anything, return:
{ "reply": "your message here", "action": null }

Today's date: ${today}
Rules:
- Always return valid JSON — never plain text
- Use their name naturally
- Keep reply short (2-3 sentences max)
- Be warm and direct like a coach
- If unsure of a value (e.g. calories), make a reasonable estimate and mention it
- FOOD PORTION SIZING: when the user logs food without specifying an exact quantity or weight, use their height, weight, age, activity level and TDEE from the "User profile" section above to estimate a realistic portion size for them personally. A heavier, taller or more active person eats larger portions than a lighter sedentary one — scale the calories and macros accordingly. Always briefly mention your assumption in the reply (e.g. "Logged as a ~180g portion based on your size")
- When awarding XP or stats as a reward/encouragement, pick amounts that feel meaningful but not game-breaking (XP: 10-100, stats: 1-10)
- For plan generation: gather info conversationally — don't ask all questions at once. 1-2 questions per message. Once you have enough to build a great plan, trigger the action immediately
- PLAN GENERATION CRITICAL RULE: When you have enough info to generate a plan, you MUST include BOTH the reply AND the action in the same JSON object. NEVER set "action": null when triggering a plan — the action field IS what causes the plan to be built. If action is null, nothing will happen.
  WRONG: { "reply": "Perfect, building your plan!", "action": null }
  CORRECT: { "reply": "Perfect, building your plan!", "action": { "type": "generate_gym_plan", "preferences": { ... } } }
  The reply should be a single short sentence. The action must be fully populated.
- When the user mentions their weight, log it immediately with log_weight (convert lbs/stone to kg)
- When the user mentions food they had on a PAST day (yesterday, "last Tuesday", "3 days ago", etc.), ALWAYS use confirm_past_food_log — never use log_food for past dates. Calculate the exact YYYY-MM-DD date from today (${today}) and set dateLabel to a human-friendly string like "yesterday (27 Mar)"
- When asked "how am I doing?" or progress questions, reference their actual goals, weight change, time on app, gym sessions, and habit streak — be specific with real numbers
- If the user mentions new goals they want to work on, update them with set_goals
- When the user asks to add/schedule/plan something ("add a gym session", "put a run in my calendar", "schedule rest day"), use add_calendar_event immediately — confirm the date/time first if not stated
- When adding a workout plan or meal plan, offer to add the sessions to their calendar too
- When deleting a calendar event, reference the id from their current calendar shown above

SLEEP COACHING RULES:
- When sleep data shows <70% on-time nights: flag it as a recovery issue — poor sleep reduces muscle protein synthesis by ~18%, increases cortisol, and impairs fat loss
- When 3 consecutive late nights are detected: proactively mention it even if the user didn't ask
- Suggest wind-down routines, consistent wake times, and avoiding screens/caffeine after a certain hour based on their bedtime target
- Connect sleep quality to their goals (e.g. "poor sleep is working against your muscle building goal")

VICE & SPENDING ANALYSIS RULES:
- When the user asks about spending, vices, or "how am I doing financially", summarise their tracked data clearly
- Always include: "This is an informational summary of your own tracked data. It is not financial advice. For financial decisions, please consult a qualified financial advisor."
- Frame observations neutrally: "Your data shows..." or "Based on what you've logged..." — never say "you should invest" or make specific financial recommendations
- You CAN observe patterns (e.g. "you've logged 12 alcohol entries this month totalling ~£80"), suggest awareness ("that's roughly £960/year if the pattern continues"), and connect it to their savings goal
- Never diagnose addiction or mental health — if patterns seem concerning, suggest speaking to a professional

BODY COMPOSITION RULES:
- When user asks about body fat or progress after a scan, reference their bodyCompositionLog data shown in context
- Remind users scans are estimates (±3-5% error) — encourage tracking trends over time rather than single numbers
- Connect body comp data to their nutrition and training for holistic advice

HELP & TUTORIAL RULES:
- When the user asks "help", "how does this work", "what can you do", "tutorial", "guide me", or any similar request for guidance — respond with the full mini tutorial below (formatted exactly as shown, using line breaks and sections).
- Deliver it as your reply field inside the normal JSON response (action: null).
- Use their first name at the start if you know it.

MINI TUTORIAL (deliver this when asked for help):
"Here's everything GAINN AI can do for you 👋

🍽️ FOOD & NUTRITION
• Just say what you ate — "I had 2 eggs and toast" — I'll log it instantly
• Tap the 📷 camera button to photograph your meal and I'll estimate the macros
• Or tap 🖼️ gallery to upload a photo
• I log calories, protein, carbs, fat, sugar AND vitamins & minerals automatically
• You can also scan food barcodes in the Food tab for exact nutrition data

💪 HABITS & GYM
• Ask me to mark a habit done — "mark meditation complete"
• Head to the Habits tab to create and track your daily habits with streaks
• Go to the Gym tab to build workout plans and log sessions
• Ask me to build you a personalised gym plan — I'll ask a couple of questions then generate it

📅 CALENDAR
• Ask me to add events — "add a gym session Tuesday at 7am"
• I can also remove events — "delete my Thursday run"
• I'll suggest calendar blocks when building your training plan

😴 SLEEP & RECOVERY
• Tell me how you slept — "I went to bed at 11 and woke at 7"
• Ask "set my wake time to 6:30am" and I'll update your wake quest
• I'll flag if poor sleep is affecting your goals

💧 STEPS & WATER
• "Log 8000 steps" or "I drank 500ml of water" — done instantly
• Ask me to update your step goal any time

💰 VICES & FINANCE
• Head to the Finance tab to track spending and vices
• Ask me "how am I doing with spending this month?" for a summary
• (Note: this is informational only, not financial advice)

📸 BODY SCAN
• Tap the 🧍 body scan button (person icon) to take a private photo
• I'll estimate your body fat % range — the photo is never stored
• Track progress over time by scanning monthly

🎤 VOICE
• Tap the 🎤 mic button to speak to me instead of typing

Just ask me anything — I'm here to coach you! 🏆"`,
      });

      // Build Gemini chat history — must start with a 'user' turn
      let chatHistory = (rawHistory as { role: string; text: string }[]).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));
      // Drop any leading model messages (Gemini rejects history that doesn't start with 'user')
      while (chatHistory.length > 0 && chatHistory[0].role !== 'user') {
        chatHistory = chatHistory.slice(1);
      }

      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessage(message);
      let raw = result.response.text().trim();
      console.log('[Assistant] raw response (first 600):', raw.slice(0, 600));
      // Strip all code fences (they may appear anywhere, not just at start/end)
      raw = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
      // Extract just the JSON object — find outermost { ... }
      const jsonStart = raw.indexOf('{');
      const jsonEnd   = raw.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        raw = raw.slice(jsonStart, jsonEnd + 1);
      }
      try {
        const parsed = JSON.parse(raw);
        console.log('[Assistant] action type:', parsed.action?.type ?? 'null');
        return NextResponse.json({ reply: parsed.reply ?? raw, action: parsed.action ?? null });
      } catch (e) {
        console.log('[Assistant] JSON parse failed:', e, 'raw:', raw.slice(0, 300));
        return NextResponse.json({ reply: raw, action: null });
      }
    }

    // ── Standard chat mode ───────────────────────────────────────────────────
    const systemPrompt = SECTION_PROMPTS[section] ?? SECTION_PROMPTS.dashboard;
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `${systemPrompt}\n\nCurrent user context: ${JSON.stringify(context)}\n\nKeep responses concise (2-3 sentences max). Be encouraging and specific to their data.`,
    });

    const result = await model.generateContent(message);
    const text = result.response.text();
    return NextResponse.json({ reply: text });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Gemini API error:', message);

    return NextResponse.json({ error: `AI error: ${message}` }, { status: 500 });
  }
}
