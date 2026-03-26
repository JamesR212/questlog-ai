import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminDb } from '@/lib/firebaseAdmin';
import Stripe from 'stripe';

export const config = { api: { bodyParser: false } };

// Map Stripe customer ID → Firebase userId (stored when they first subscribed)
async function getUserIdForCustomer(db: FirebaseFirestore.Firestore, customerId: string): Promise<string | null> {
  const snap = await db.collection('subscriptions')
    .where('customerId', '==', customerId)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}

export async function POST(req: NextRequest) {
  const sig    = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    console.error('[webhook] signature verification failed:', e);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = getAdminDb();

  try {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub        = event.data.object as Stripe.Subscription & { current_period_end: number };
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const userId     = await getUserIdForCustomer(db, customerId);
        if (!userId) break;

        await db.collection('subscriptions').doc(userId).set({
          status:           sub.status,
          customerId,
          subscriptionId:   sub.id,
          priceId:          sub.items.data[0]?.price.id ?? null,
          currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          updatedAt:        new Date().toISOString(),
        }, { merge: true });

        console.log(`[webhook] ${event.type} for user ${userId} — status: ${sub.status}, cancel_at_period_end: ${sub.cancel_at_period_end}`);
        break;
      }
    }
  } catch (e) {
    console.error('[webhook] handler error:', e);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
