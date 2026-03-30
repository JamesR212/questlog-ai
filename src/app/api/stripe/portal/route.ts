import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';

function getAdminAuth() {
  getAdminDb(); // ensures Firebase Admin app is initialised
  return getAuth();
}

// Creates a minimal portal configuration programmatically so we never need
// to manually configure it in the Stripe dashboard.
async function getOrCreatePortalConfig(): Promise<string> {
  const configs = await stripe.billingPortal.configurations.list({ limit: 1 });
  if (configs.data.length > 0) return configs.data[0].id;

  const config = await stripe.billingPortal.configurations.create({
    features: {
      invoice_history:       { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel:   { enabled: true },
    },
    business_profile: {
      headline: 'Manage your GAINN subscription',
    },
  });
  console.log('[portal] created billing portal config:', config.id);
  return config.id;
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

    const configId = await getOrCreatePortalConfig();
    const session = await stripe.billingPortal.sessions.create({
      customer:      customerId,
      return_url:    process.env.NEXT_PUBLIC_APP_URL || 'https://gainn.app',
      configuration: configId,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('[stripe portal] error:', e);
    const message = e?.message || String(e);
    return NextResponse.json({ error: `Stripe error: ${message}` }, { status: 500 });
  }
}
