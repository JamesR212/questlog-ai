import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { priceId, userId, email } = await req.json();
    if (!priceId || !userId) {
      return NextResponse.json({ error: 'Missing priceId or userId' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gainn.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      allow_promotion_codes: true,
      customer_email: email || undefined,
      client_reference_id: userId,
      success_url: `${appUrl}?subscribed=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: appUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('[stripe] checkout error:', e);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
