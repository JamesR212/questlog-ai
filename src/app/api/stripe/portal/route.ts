import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const db      = getAdminDb();
    const subSnap = await db.collection('subscriptions').doc(userId).get();

    if (!subSnap.exists) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const customerId = subSnap.data()?.customerId;
    if (!customerId) {
      return NextResponse.json({ error: 'No customer ID found' }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: process.env.NEXT_PUBLIC_APP_URL || 'https://gainn.app',
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('[stripe portal] error:', e);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
