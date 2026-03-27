import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

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
  dashboard:  'You are an RPG quest advisor reviewing a hero\'s overall stats and progress. Be motivational, use RPG fantasy language, and give advice about improving STR, CON, DEX, and GOLD stats.',
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

    // ── Plan generation mode ─────────────────────────────────────────────────
    if (mode === 'generate_gym_plan') {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prefs = context.preferences ?? {};
      const prompt = `You are a personal trainer creating a personalised gym workout plan.
Hero stats: STR=${context.stats?.str}, CON=${context.stats?.con}, DEX=${context.stats?.dex}, Level=${context.stats?.level}
Past gym sessions: ${context.gymLog?.length ?? 0}

User preferences:
- Training type: ${prefs.type ?? 'Weights and gym training'}
- Goal: ${prefs.goal ?? 'General fitness'}
- Experience: ${prefs.experience ?? 'Some experience'}
- Days per week: ${prefs.daysPerWeek ?? '3'}
- Focus area: ${prefs.focus ?? 'Full body balanced'}

Generate a realistic plan tailored to these exact preferences.
If the training type is running, use running-specific exercises like "Easy Run", "Tempo Run", "Interval Sprints", "Long Run", "Rest / Walk" with sets=1, targetReps=1, targetWeight=0 and note the distance/duration in the name (e.g. "Easy Run — 20 min").
If beginner or 1 day per week, keep it very simple and achievable.
Return ONLY a raw JSON object (no markdown, no code fences) in this exact shape:
{
  "name": "string (short catchy plan name)",
  "emoji": "single emoji",
  "color": "hex color like #4a6fa5",
  "exercises": [
    { "name": "Exercise name", "sets": 3, "targetReps": 10, "targetWeight": 0 }
  ],
  "scheduleDays": [1, 3, 5],
  "scheduleTime": "07:00",
  "scheduleEndTime": "08:00"
}
Rules:
- 4-6 exercises matching the equipment and focus area
- targetWeight 0 means bodyweight
- scheduleDays: 0=Sun, 1=Mon … 6=Sat — pick the right number of days to match daysPerWeek
- scheduleTime/scheduleEndTime: realistic gym hours (~1 hour session)
- Tailor difficulty to experience level and STR stat (${context.stats?.str ?? 10}/150)`;

      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const plan = JSON.parse(text);
      return NextResponse.json({ plan });
    }

    if (mode === 'generate_meal_plan') {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const goal = context.nutritionGoal ?? { calories: 2000, protein: 150, carbs: 200, fat: 65 };
      const prefs = context.preferences ?? {};
      const isBulk = (prefs.cookingPref ?? '').toLowerCase().includes('bulk');
      const prompt = `You are a nutrition coach creating a large personalised meal options library.
Daily goals: ${goal.calories} kcal, ${goal.protein}g protein, ${goal.carbs}g carbs, ${goal.fat}g fat, ${goal.sugar ?? 50}g sugar

User preferences:
- Nutrition goal: ${prefs.nutritionGoal ?? 'Maintain'}
- Diet type: ${prefs.dietType ?? 'No restrictions'}
- Meals per day: ${prefs.mealsPerDay ?? '4'}
- Cooking preference: ${prefs.cookingPref ?? 'Happy to cook'}

Generate a large library of meal OPTIONS the user can pick from — not a fixed day plan.
Return ONLY a raw JSON object (no markdown, no code fences) in this exact shape:
{
  "meals": [
    { "name": "Meal name", "category": "Breakfast", "calories": 400, "protein": 30, "carbs": 40, "fat": 10, "sugar": 8 }
  ]
}
Rules:
- Return AT LEAST 20 meals total, ideally 24-28
- Spread across categories: "Breakfast", "Lunch", "Dinner", "Snack"${isBulk ? ', "Bulk Cook"' : ''}
- At least 4-6 options per category
${isBulk ? '- Include 4-6 "Bulk Cook" meals (large batch recipes that make multiple servings — label them clearly e.g. "Chicken & Rice Batch (x6)")' : ''}
- Respect the diet type strictly (${prefs.dietType ?? 'no restrictions'})
- Match the cooking preference (${prefs.cookingPref ?? 'any'})
- Real food names, realistic macros
- sugar is grams of total sugar (subset of carbs) — include it for every meal
- Each meal should be sized as a single serving (not a full day)
- Vary the options so the user has genuine choice`;

      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const mealPlan = JSON.parse(text);
      return NextResponse.json({ mealPlan });
    }

    if (mode === 'suggest_meals') {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: `You are GAINN's personal AI assistant — a knowledgeable personal coach with full access to this user's data, schedule, nutrition, and activity. You give accurate, evidence-based advice tailored specifically to what they have going on today and this week.

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

Log food/meal (always include micros with your best estimate — use null only if truly unknown):
{ "type": "log_food", "name": "Chicken salad", "calories": 450, "protein": 35, "carbs": 20, "fat": 12, "sugar": 3, "micros": { "vitA": 90, "vitC": 12, "vitD": 0.2, "vitE": 1.2, "vitK": 40, "vitB6": 0.6, "vitB12": 0.3, "folate": 60, "calcium": 45, "iron": 2.1, "magnesium": 38, "zinc": 1.8, "potassium": 420, "sodium": 380 } }

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

Build a full workout/training plan — ask the user about: training type, goal, experience level, days per week, and focus area. Once you have enough info (can be from one message or across several), trigger:
{ "type": "generate_gym_plan", "preferences": { "type": "Weights and gym training", "goal": "Build muscle", "experience": "Some experience (6 months – 2 years)", "daysPerWeek": "3", "focus": "Upper body" } }

Build a full meal plan / meal library — ask the user about: nutrition goal, diet type, meals per day, cooking preference. Once you have enough info, trigger:
{ "type": "generate_meal_plan", "preferences": { "nutritionGoal": "Lose weight", "dietType": "No restrictions", "mealsPerDay": "3", "cookingPref": "Happy to cook" } }

If the user is NOT asking to log or change anything, return:
{ "reply": "your message here", "action": null }

Today's date: ${today}
Rules:
- Always return valid JSON — never plain text
- Use their name naturally
- Keep reply short (2-3 sentences max)
- Be warm and direct like a coach
- If unsure of a value (e.g. calories), make a reasonable estimate and mention it
- When awarding XP or stats as a reward/encouragement, pick amounts that feel meaningful but not game-breaking (XP: 10-100, stats: 1-10)
- For plan generation: gather info conversationally — don't ask all questions at once. 1-2 questions per message. Once you have enough to build a great plan, trigger the action immediately
- When triggering generate_gym_plan or generate_meal_plan, your reply should be a very short confirmation like "Perfect, I have everything I need!" — keep it to one sentence, the app will show the timing and auto-save message itself
- When the user mentions their weight, log it immediately with log_weight (convert lbs/stone to kg)
- When asked "how am I doing?" or progress questions, reference their actual goals, weight change, time on app, gym sessions, and habit streak — be specific with real numbers
- If the user mentions new goals they want to work on, update them with set_goals
- When the user asks to add/schedule/plan something ("add a gym session", "put a run in my calendar", "schedule rest day"), use add_calendar_event immediately — confirm the date/time first if not stated
- When adding a workout plan or meal plan, offer to add the sessions to their calendar too
- When deleting a calendar event, reference the id from their current calendar shown above`,
      });

      // Build Gemini chat history from previous turns
      const chatHistory = (rawHistory as { role: string; text: string }[]).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessage(message);
      let raw = result.response.text().trim();
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      try {
        const parsed = JSON.parse(raw);
        return NextResponse.json({ reply: parsed.reply ?? raw, action: parsed.action ?? null });
      } catch {
        return NextResponse.json({ reply: raw, action: null });
      }
    }

    // ── Standard chat mode ───────────────────────────────────────────────────
    const systemPrompt = SECTION_PROMPTS[section] ?? SECTION_PROMPTS.dashboard;
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `${systemPrompt}\n\nCurrent hero context: ${JSON.stringify(context)}\n\nKeep responses concise (2-3 sentences max). Be encouraging and specific to their data.`,
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
