'use client';

import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthScreen({ initialMode = 'login' }: { initialMode?: Mode }) {
  const [mode, setMode]         = useState<Mode>(initialMode);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [showPw, setShowPw]     = useState(false);

  const clear = () => { setError(''); setSuccess(''); };

  const handleSubmit = async () => {
    clear();
    if (!email.trim()) { setError('Email is required'); return; }
    if (mode !== 'forgot' && password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      }

      if (mode === 'signup') {
        if (!username.trim()) { setError('Username is required'); setLoading(false); return; }
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: username });
      }

      if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Password reset email sent — check your inbox.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      if (msg.includes('email-already-in-use')) {
        setError('Email already in use — try logging in instead.');
      } else {
        setError(msg.replace('Firebase: ', '').replace(/\s*\(auth\/.*?\)\.?/, '').trim());
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-ql-bg flex flex-col items-center justify-center px-5">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <h1 className="text-4xl font-black tracking-tight">
          <span className="text-ql">G</span><span style={{ color: '#16a34a' }}>AI</span><span className="text-ql">NN</span>
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Level up your life</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-ql-surface rounded-3xl border border-ql shadow-ql p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-center" style={{ color: 'rgba(255,255,255,0.9)' }}>
          {mode === 'login' ? 'Welcome' : mode === 'signup' ? 'Create account' : 'Reset password'}
        </h2>

        {/* Fields */}
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full bg-ql-input border border-ql-input rounded-xl px-4 py-3 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="w-full bg-ql-input border border-ql-input rounded-xl px-4 py-3 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
        />
        {mode !== 'forgot' && (
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full bg-ql-input border border-ql-input rounded-xl px-4 py-3 pr-11 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ql-3 hover:text-ql transition-colors"
              tabIndex={-1}
            >
              {showPw ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        )}

        {/* Error / success */}
        {error   && <p className="text-red-400 text-xs text-center">{error}</p>}
        {success && <p className="text-emerald-400 text-xs text-center">{success}</p>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
          style={{ backgroundColor: '#16a34a' }}
        >
          {loading ? '…' : mode === 'login' ? 'Log In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
        </button>

        {/* Mode switchers */}
        <div className="flex flex-col items-center gap-2 pt-1">
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('signup'); clear(); }} className="text-xs font-medium" style={{ color: '#16a34a' }}>
                No account? Sign up
              </button>
              <button onClick={() => { setMode('forgot'); clear(); }} className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Forgot password?
              </button>
            </>
          )}
          {mode !== 'login' && (
            <button onClick={() => { setMode('login'); clear(); }} className="text-xs font-medium" style={{ color: '#16a34a' }}>
              Back to log in
            </button>
          )}
        </div>
      </div>

      <p className="text-[10px] mt-6 text-center" style={{ color: 'rgba(255,255,255,0.75)' }}>Your data is saved to the cloud and syncs across devices.</p>
    </div>
  );
}
