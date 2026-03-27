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
      const daysPerWeek = parseInt(prefs.daysPerWeek ?? '3', 10);
      const rawSplit = (prefs.split ?? '').toLowerCase().replace(/[^a-z]/g, '');

      // Fuzzy split detection — handle PPL, pushpulllegs, upperlower, UL, etc.
      const isPPL        = /p(ush)?p(ull)?l(eg)?s?/.test(rawSplit) || rawSplit.includes('ppl');
      const isUpperLower = rawSplit.includes('upper') || rawSplit.includes('ul') || rawSplit === 'upperlower';
      const isBodyPart   = rawSplit.includes('bodypart') || rawSplit.includes('bro') || rawSplit.includes('isolation');
      const isRunning    = rawSplit.includes('run') || rawSplit.includes('cardio') || (prefs.type ?? '').toLowerCase().includes('run');

      // Also infer from daysPerWeek if no split specified
      const inferredPPL        = !rawSplit && daysPerWeek >= 5;
      const inferredUpperLower = !rawSplit && daysPerWeek === 4;

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
        : isRunning
        ? `REQUIRED: Running plan — generate 1 plan. Alternate hard/easy efforts. Never two hard days back-to-back. Include distance/duration in exercise names.`
        : `REQUIRED SPLIT: Full Body — generate 1 plan scheduled ${daysPerWeek <= 2 ? 'with rest days between (e.g. [1,4])' : 'Mon/Wed/Fri [1,3,5]'}. Hit all major muscle groups each session.`;

      const prompt = `You are an expert personal trainer creating a science-backed gym programme with proper recovery built in.

User preferences:
- Training type: ${prefs.type ?? 'Weights and gym training'}
- Goal: ${prefs.goal ?? 'General fitness'}
- Experience: ${prefs.experience ?? 'Some experience'}
- Days per week: ${daysPerWeek}
- Focus area: ${prefs.focus ?? 'Full body'}
- Stats: STR=${context.stats?.str ?? 10}, CON=${context.stats?.con ?? 10}, Level=${context.stats?.level ?? 1}

${splitInstructions}

RECOVERY RULES (always apply):
- Never schedule the same muscle group on consecutive days (minimum 48h between same group).
- For multi-plan splits: scheduleDays across plans must never overlap.
- Each plan's recoveryNotes must clearly explain the recovery logic in plain English.

Return ONLY a raw JSON array (no markdown, no code fences, no wrapping object):
[
  {
    "name": "Push Day",
    "emoji": "💪",
    "color": "#e05a2b",
    "split": "Push · Pull · Legs",
    "recoveryNotes": "Chest, shoulders and triceps get 72h rest before the next Push session.",
    "exercises": [
      { "name": "Bench Press", "sets": 4, "targetReps": 8, "targetWeight": 60 }
    ],
    "scheduleDays": [1, 4],
    "scheduleTime": "07:00",
    "scheduleEndTime": "08:00"
  }
]

Rules:
- ALWAYS return an array, even for a single plan.
- 4–6 exercises per plan, specific to that day's muscle group(s).
- targetWeight 0 = bodyweight.
- scheduleDays: 0=Sun … 6=Sat. No two plans may share a day.
- All plans in a split share the same split label string.
- scheduleTime/scheduleEndTime: realistic gym hours (~1 hour session).
- Tailor difficulty to experience and STR (${context.stats?.str ?? 10}/150).`;

      console.log('[GymPlan] prefs:', JSON.stringify(prefs));
      console.log('[GymPlan] splitInstructions used:', splitInstructions.slice(0, 80));
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

Build a full workout/training plan — ask the user about: training type, goal, experience level, days per week, focus area, and whether they want a split (e.g. Push/Pull/Legs, Upper/Lower) or full body. Once you have enough info (can be from one message or across several), trigger:
{ "type": "generate_gym_plan", "preferences": { "type": "Weights and gym training", "goal": "Build muscle", "experience": "Some experience (6 months – 2 years)", "daysPerWeek": "4", "focus": "Full body", "split": "Upper/Lower" } }
The "split" field must be one of: "Full Body", "Push/Pull/Legs", "Upper/Lower", "Body Part", "Running". If the user explicitly asks for a split, set it accordingly. If they haven't specified, infer from daysPerWeek (1-2→Full Body, 3→Full Body, 4→Upper/Lower, 5-6→Push/Pull/Legs).

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
