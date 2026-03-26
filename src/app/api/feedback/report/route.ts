import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function getAdminDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

export async function GET(req: NextRequest) {
  const adminUid   = process.env.NEXT_PUBLIC_ADMIN_UID;
  const requestUid = req.nextUrl.searchParams.get('uid');

  if (!adminUid || requestUid !== adminUid) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 403 });
  }

  const db   = getAdminDb();
  const snap = await db.collection('communityFeedback')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();

  if (snap.empty) {
    return NextResponse.json({ report: 'No feedback yet.' });
  }

  const messages = snap.docs.map(d => {
    const data = d.data();
    return `- ${data.userName}: "${data.message}"`;
  }).join('\n');

  const prompt = `You are analysing user feedback for GAINN, an AI-powered life tracking app.

Here are the latest user feedback messages:
${messages}

Write a concise report with these sections:
1. **What users love** — the positives and things working well
2. **Pain points** — recurring complaints or frustrations
3. **Feature requests** — most requested features or improvements
4. **Key insights** — your top 3 actionable recommendations for the team

Keep it punchy and direct. Use bullet points within each section.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    return NextResponse.json({ report: result.response.text(), count: snap.size });
  } catch (e) {
    console.error('[feedback report] error:', e);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
