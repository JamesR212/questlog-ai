import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminDb } from '@/lib/firebaseAdmin';
import Stripe from 'stripe';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    if (!sessionId) return NextResponse.json({ error: 'No session ID' }, { status: 400 });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.status !== 'complete') {
      return NextResponse.json({ error: 'Not complete' }, { status: 400 });
    }

    const sub = session.subscription as Stripe.Subscription & { current_period_end?: number };
    const userId     = session.client_reference_id;
    const customerId = session.customer as string;
    const subData = {
      status:           sub?.status || 'active',
      priceId:          sub?.items?.data[0]?.price.id || null,
      currentPeriodEnd: sub?.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      customerId,
      subscriptionId:   sub?.id || null,
      updatedAt:        new Date().toISOString(),
    };

    // Write to Firestore via Admin SDK (bypasses security rules)
    if (userId) {
      try {
        const db = getAdminDb();
        await db.collection('subscriptions').doc(userId).set(subData, { merge: true });
        console.log(`[verify] saved subscription for user ${userId}, customerId: ${customerId}`);
      } catch (dbErr) {
        console.error('[verify] failed to save subscription to Firestore:', dbErr);
      }
    }

    return NextResponse.json({ userId, ...subData });
  } catch (e) {
    console.error('[stripe] verify error:', e);
    return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 });
  }
}
