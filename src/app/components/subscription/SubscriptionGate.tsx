'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!;
const YEARLY_PRICE_ID  = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!;

export default function SubscriptionGate() {
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);

  const handleCheckout = async (priceId: string, plan: 'monthly' | 'yearly') => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.uid, email: user.email }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e) {
      console.error('[checkout] error:', e);
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-ql-bg flex flex-col items-center justify-center px-5">
      <button
        onClick={() => signOut(auth)}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-white text-sm hover:opacity-70 transition-opacity"
      >
        ← Back
      </button>
      <div className="flex flex-col items-center gap-2 mb-10">
        <h1 className="text-4xl font-black tracking-tight">
          <span className="text-ql">G</span><span style={{ color: '#16a34a' }}>AI</span><span className="text-ql">NN</span>
        </h1>
        <p className="text-ql-3 text-sm">Choose your plan to get started</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">

        {/* Annual — highlighted */}
        <div className="relative bg-ql-surface rounded-3xl border-2 p-6 flex flex-col gap-4" style={{ borderColor: '#16a34a', boxShadow: '0 0 40px rgba(22,163,74,0.15)' }}>
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[11px] font-bold px-4 py-1 rounded-full tracking-wide uppercase whitespace-nowrap">
            Best Value
          </div>
          <div>
            <p className="text-ql text-sm font-semibold" style={{ color: '#86efac' }}>Annual</p>
            <p className="text-ql text-4xl font-black mt-1">£24.99</p>
            <p className="text-ql-3 text-xs mt-1">per year · £2.08/mo · Save 30%</p>
          </div>
          <button
            onClick={() => handleCheckout(YEARLY_PRICE_ID, 'yearly')}
            disabled={loading !== null}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: '#16a34a' }}
          >
            {loading === 'yearly' ? 'Loading…' : 'Get Started →'}
          </button>
        </div>

        {/* Monthly */}
        <div className="bg-ql-surface rounded-3xl border border-ql p-6 flex flex-col gap-4">
          <div>
            <p className="text-ql-3 text-sm font-semibold">Monthly</p>
            <p className="text-ql text-4xl font-black mt-1">£2.99</p>
            <p className="text-ql-3 text-xs mt-1">per month</p>
          </div>
          <button
            onClick={() => handleCheckout(MONTHLY_PRICE_ID, 'monthly')}
            disabled={loading !== null}
            className="w-full py-3.5 rounded-2xl font-bold text-sm border border-ql text-ql disabled:opacity-50 transition-opacity"
          >
            {loading === 'monthly' ? 'Loading…' : 'Get Started →'}
          </button>
        </div>

        <p className="text-ql-3 text-[11px] text-center mt-2">
          Have a discount code? You can enter it on the next screen.
        </p>

      </div>
    </div>
  );
}
