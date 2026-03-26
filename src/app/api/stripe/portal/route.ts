import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

function getAdminAuth() {
  // Re-use the already-initialised app from getAdminDb()
  getAdminDb(); // ensures app is initialised
  return getAuth();
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const db      = getAdminDb();
    const subSnap = await db.collection('subscriptions').doc(userId).get();

    let customerId = subSnap.data()?.customerId as string | undefined;

    // Fallback: look up via Stripe by user email if Firestore record is missing/incomplete
    if (!customerId) {
      console.log(`[portal] no customerId in Firestore for ${userId}, trying Stripe lookup by email`);
      try {
        const userRecord = await getAdminAuth().getUser(userId);
        const email = userRecord.email;
        if (email) {
          const customers = await stripe.customers.search({ query: `email:"${email}"`, limit: 1 });
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
            // Also save it back so future requests work instantly
            const subs = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
            const sub  = subs.data[0];
            if (sub) {
              await db.collection('subscriptions').doc(userId).set({
                customerId,
                subscriptionId:   sub.id,
                status:           sub.status,
                priceId:          sub.items.data[0]?.price.id ?? null,
                currentPeriodEnd: new Date((sub as any).current_period_end * 1000).toISOString(),
                cancelAtPeriodEnd: sub.cancel_at_period_end,
                updatedAt:        new Date().toISOString(),
              }, { merge: true });
              console.log(`[portal] backfilled subscription for user ${userId}`);
            }
          }
        }
      } catch (lookupErr) {
        console.error('[portal] Stripe fallback lookup failed:', lookupErr);
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: 'No subscription found. Please ensure you have an active subscription.' }, { status: 404 });
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
