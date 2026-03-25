import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

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
    const { message, section, context, mode } = await req.json();

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
      const mediaBase64    = context.mediaBase64 ?? '';
      const mimeType       = context.mimeType    ?? 'video/mp4';
      const claimedExercise = context.exercise   ?? '';
      const claimedWeight  = context.weight      ?? 0;

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
        { inlineData: { mimeType, data: mediaBase64 } },
        prompt,
      ]);
      let text = result.response.text().trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const verification = JSON.parse(text);
      return NextResponse.json({ verification });
    }

    // ── Form video / photo analysis ─────────────────────────────────────────
    if (mode === 'analyze_form_video') {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const mediaBase64 = context.mediaBase64 ?? '';
      const mimeType    = context.mimeType ?? 'video/mp4';
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
        { inlineData: { mimeType, data: mediaBase64 } },
        prompt,
      ]);
      let text = result.response.text().trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const analysis = JSON.parse(text);
      return NextResponse.json({ analysis });
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
