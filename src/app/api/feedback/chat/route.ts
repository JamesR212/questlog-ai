import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Resend } from 'resend';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, serverTimestamp,
  getCountFromServer, getDocs, orderBy, query, limit,
} from 'firebase/firestore';

const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);

const REPORT_EVERY = 10; // send digest after every Nth submission

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

    // Count total submissions — fire email digest every REPORT_EVERY
    const snap   = await getCountFromServer(collection(db, 'communityFeedback'));
    const total  = snap.data().count;

    if (total % REPORT_EVERY === 0) {
      // Fire-and-forget — don't block the response
      sendDigest(total).catch(e => console.error('[feedback digest] error:', e));
    }

    return NextResponse.json({ reply: aiReply });
  } catch (e) {
    console.error('[feedback] error:', e);
    return NextResponse.json({ error: 'Failed to process feedback' }, { status: 500 });
  }
}

async function sendDigest(total: number) {
  const toEmail = process.env.FEEDBACK_EMAIL;
  if (!toEmail || !process.env.RESEND_API_KEY) return;

  // Fetch the last REPORT_EVERY messages
  const snap = await getDocs(
    query(collection(db, 'communityFeedback'), orderBy('createdAt', 'desc'), limit(REPORT_EVERY))
  );

  const messages = snap.docs
    .map(d => {
      const data = d.data();
      return `${data.userName}: "${data.message}"`;
    })
    .reverse() // chronological order
    .join('\n');

  const reportPrompt = `You are analysing the latest ${REPORT_EVERY} user feedback messages for GAINN, an AI life tracking app.

Here are the messages, verbatim — do not sanitise or soften the language:
${messages}

Write a brutal, no-bullshit internal report for the founder. This is private — no sugarcoating, no corporate fluff.
Use the users' actual words and language. If they swear, quote it. If they hate something, say so clearly.

Structure:
## What's working
Bullet points. Quote users directly.

## What's broken or pissing people off
Bullet points. Use their exact words. Be blunt.

## Feature requests
Bullet points. Ranked by how many people mentioned it.

## The real talk
3–5 sentences. Straight gut-punch summary. What should the founder actually do right now based on this batch?`;

  const model    = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result   = await model.generateContent(reportPrompt);
  const report   = result.response.text();

  // Convert markdown to basic HTML for email
  const reportHtml = report
    .replace(/## (.+)/g, '<h2 style="margin-top:24px;color:#111">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)/gm, '<li style="margin:4px 0">$1</li>')
    .replace(/(<li[\s\S]*?<\/li>)/g, '<ul style="padding-left:20px">$1</ul>')
    .replace(/\n\n/g, '<br/><br/>');

  await resend.emails.send({
    from:    'GAINN Feedback <feedback@gainn.app>',
    to:      toEmail,
    subject: `GAINN Feedback Digest — ${total} submissions total`,
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#333">
        <div style="background:#08080f;padding:24px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">GAINN Feedback Digest</h1>
          <p style="color:#71717a;margin:4px 0 0;font-size:13px">${REPORT_EVERY} new messages · ${total} total</p>
        </div>
        <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
          <h2 style="margin-top:0;color:#111">Raw messages (last ${REPORT_EVERY})</h2>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;font-size:13px;line-height:1.7;border:1px solid #e5e7eb">
            ${snap.docs.map(d => {
              const data = d.data();
              return `<p style="margin:0 0 10px"><strong>${data.userName}</strong>: "${data.message}"</p>`;
            }).join('')}
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
          <h2 style="margin-top:0;color:#111">AI Analysis</h2>
          <div style="font-size:14px;line-height:1.8">${reportHtml}</div>
        </div>
      </div>
    `,
  });
}
