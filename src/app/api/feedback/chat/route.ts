import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  const { message, userId, userName } = await req.json() as {
    message: string;
    userId: string;
    userName?: string;
  };

  if (!message || !userId) {
    return NextResponse.json({ error: 'Missing message or userId' }, { status: 400 });
  }

  const systemPrompt = `You are the GAINN feedback assistant. GAINN is an AI-powered life tracking app that helps users with fitness, habits, sleep, nutrition, finances, and personal development.

A user is sharing feedback or a feature request with you. Be warm, enthusiastic, and genuinely grateful. Keep responses short (2-3 sentences max). Acknowledge their specific feedback, tell them it matters, and that the team will review it.

Never promise specific timelines. Never say "I'll pass this on" — say "our team" or "we". Be human and friendly.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(`${systemPrompt}\n\nUser (${userName || 'a user'}) says: "${message}"`);
    const aiReply = result.response.text() ?? 'Thanks so much for sharing that — we really appreciate it!';

    // Save to Firestore
    await addDoc(collection(db, 'communityFeedback'), {
      userId,
      userName: userName || 'Anonymous',
      message,
      aiReply,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ reply: aiReply });
  } catch (e) {
    console.error('[feedback] error:', e);
    return NextResponse.json({ error: 'Failed to process feedback' }, { status: 500 });
  }
}
