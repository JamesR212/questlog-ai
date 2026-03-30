'use client';

import { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { pushToCloud, pullFromCloud, localIsNewer, upsertProfile, dataScore, saveBackup, loadBackup, mergeStates } from '@/lib/sync';
import { updatePublicProfile } from '@/lib/friends';
import { useGameStore, resetGameStore } from '@/store/gameStore';
import type { User } from 'firebase/auth';
import AuthScreen from './components/auth/AuthScreen';
import LandingPage from './components/landing/LandingPage';
import SubscriptionGate from './components/subscription/SubscriptionGate';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import NavBar from './components/shared/NavBar';
import LevelUpModal from './components/shared/LevelUpModal';
import AIAssistant from './components/ai/AIAssistant';
import ThemeApplier from './components/shared/ThemeApplier';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import HomePage from './components/dashboard/HomePage';
import CalendarPage from './components/calendar/CalendarPage';
import ViceTracker from './components/vice-tracker/ViceTracker';
import HabitTracker from './components/habits/HabitTracker';
import GymFitness from './components/gym/GymFitness';
import TrainingHub from './components/training/TrainingHub';
import FoodDrink from './components/nutrition/FoodDrink';
import SettingsPage from './components/settings/SettingsPage';
import SocialPage from './components/social/SocialPage';
import LeaderboardPage from './components/leaderboard/LeaderboardPage';
import FeedbackPage from './components/feedback/FeedbackPage';

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Home() {
  const { activeSection, hasOnboarded, setActiveSection } = useGameStore();
  const store = useGameStore();

  const [user, setUser]               = useState<User | null | undefined>(undefined);
  const [syncing, setSyncing]         = useState(false);
  const [syncError, setSyncError]     = useState(false);  // true = last push failed
  const [pullFailed, setPullFailed]   = useState(false);  // true = pull failed on login
  const [cloudReady, setCloudReady]   = useState(false);
  const [showAuth, setShowAuth]       = useState(false);
  const [authMode, setAuthMode]       = useState<'login' | 'signup'>('login');
  const [subscribed, setSubscribed]   = useState<boolean | null>(null); // null = checking
  const hydratedUid                   = useRef<string | null>(null);
  // SAFETY: only allow cloud push after a clean pull — prevents empty-state overwriting cloud data
  const pullOk                        = useRef<boolean>(false);

  // ── Auth listener ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsub();
  }, []);

  // ── On login: pull cloud data and hydrate store ──────────────────────────
  useEffect(() => {
    if (!user || hydratedUid.current === user.uid) return;
    hydratedUid.current = user.uid;
    setCloudReady(false);

    // ── Layer 1: capture everything before wiping ────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const localFallback = useGameStore.getState() as any;
    // Save to a separate backup key BEFORE resetGameStore wipes questlog-storage.
    // questlog-backup is never touched by resetGameStore so it survives across sessions.
    saveBackup(localFallback);
    resetGameStore();

    const userId = user.uid;

    // Ensure profile exists
    upsertProfile(userId, {
      username:     user.displayName ?? '',
      display_name: user.displayName ?? '',
    });

    // Pull and merge cloud data, then check subscription
    pullFromCloud(userId).then(async result => {
      if (!result.ok) {
        // All pull attempts failed — restore the richest data we have
        console.error('[sync] pull failed — restoring best available local data');
        pullOk.current = false;
        setPullFailed(true);
        const backup = loadBackup();
        const fallbackScore = dataScore(localFallback);
        const backupScore   = backup ? dataScore(backup) : 0;
        // Use whichever local source has more data
        useGameStore.setState(backupScore > fallbackScore ? backup! : localFallback);
        setCloudReady(true);
        const subSnap = await getDoc(doc(db, 'subscriptions', userId)).catch(() => null);
        if (subSnap?.exists()) {
          const sub = subSnap.data();
          const isActive = sub.status === 'active' || sub.status === 'trialing';
          const notExpired = !sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > new Date();
          setSubscribed(isActive && notExpired);
        } else {
          setSubscribed(false);
        }
        return;
      }
      pullOk.current = true;
      const cloudData = result.data;
      if (cloudData) {
        const cloudScore  = dataScore(cloudData);
        const localScore  = dataScore(localFallback);
        const backup      = loadBackup();
        const backupScore = dataScore(backup ?? {});

        // ── Layer 2: smart merge — never throw away data from either device ─
        // Union all log/definition arrays by ID so both devices keep their entries.
        // For new users or empty cloud, just use local. For returning users,
        // merge cloud + local so nothing is lost.
        let finalState;
        if (cloudScore === 0 && localScore === 0) {
          // Both empty — nothing to merge
          finalState = cloudData;
          console.log('[sync] both empty — using cloud defaults');
        } else if (cloudScore === 0) {
          // New device / first login — local has real data, cloud is empty
          finalState = localFallback;
          console.log('[sync] cloud empty — using local (score:', localScore, ')');
        } else if (localScore === 0 && !localIsNewer(result.cloudUpdatedAt)) {
          // Local is genuinely empty and not recently pushed — pure cloud
          finalState = cloudData;
          console.log('[sync] local empty — using cloud (score:', cloudScore, ')');
        } else {
          // Both have data — merge so neither device loses log entries
          finalState = mergeStates(cloudData, localFallback);
          console.log('[sync] merged cloud+local (cloud:', cloudScore, 'local:', localScore, 'merged:', dataScore(finalState), ')');
        }

        useGameStore.setState(finalState);

        // ── Layer 3: backup rescue ─────────────────────────────────────
        // After applying state, if we ended up with suspiciously empty store
        // but our backup has real data, restore from backup.
        const appliedScore = dataScore(useGameStore.getState() as unknown as Record<string, unknown>);
        if (appliedScore === 0 && backupScore > 20) {
          console.warn('[sync] applied state is empty but backup has data — restoring backup (score:', backupScore, ')');
          useGameStore.setState(backup!);
        }
      }
      setCloudReady(true);

      // Check if returning from Stripe checkout
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      if (params.get('subscribed') === 'true' && sessionId) {
        window.history.replaceState({}, '', '/');
        try {
          const res = await fetch(`/api/stripe/verify?session_id=${sessionId}`);
          const data = await res.json();
          if (data.userId === userId) {
            // Firestore write is handled server-side in the verify route
            setSubscribed(true);
            return;
          }
        } catch (e) {
          console.error('[subscription] verify error:', e);
        }
      }

      // Check existing subscription in Firestore
      const subSnap = await getDoc(doc(db, 'subscriptions', userId));
      if (subSnap.exists()) {
        const sub = subSnap.data();
        const isActive = sub.status === 'active' || sub.status === 'trialing';
        const notExpired = !sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > new Date();
        setSubscribed(isActive && notExpired);
      } else {
        setSubscribed(false);
      }
    });
  }, [user]);

  // ── On logout: reload page for a completely clean slate ──────────────────
  useEffect(() => {
    if (!user && hydratedUid.current !== null) {
      hydratedUid.current = null;
      pullOk.current = false;
      localStorage.removeItem('questlog-storage');
      window.location.reload();
    } else if (!user) {
      setCloudReady(false);
      setSubscribed(null);
    }
  }, [user]);

  // ── Real-time listener: apply changes from other devices (last-write-wins) ─
  // onSnapshot fires whenever any device pushes to Firestore.
  // For live real-time sync, the active device is authoritative — we apply its
  // state directly (including deletions). We only skip our OWN push echoes.
  // Merging is reserved for the initial login pull (offline catch-up only).
  useEffect(() => {
    if (!user || !cloudReady || !pullOk.current) return;
    const ref = doc(db, 'users', user.uid, 'data', 'store');
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const { _updatedAt, ...cloudData } = snap.data() as Record<string, unknown>;
      if (!_updatedAt) return;
      // Skip if this snapshot is the echo of our own last push
      const lastPush = localStorage.getItem('questlog-last-push');
      if (_updatedAt === lastPush) return;
      // Another device pushed — apply their state directly so deletions propagate
      useGameStore.setState(cloudData);
      localStorage.setItem('questlog-last-push', _updatedAt as string);
      console.log('[sync] real-time update from another device — applied (ts:', _updatedAt, ')');
    }, (err) => {
      console.warn('[sync] snapshot error:', err);
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, cloudReady]);

  // ── Debounced auto-sync to cloud on store changes ────────────────────────
  const storeSnapshot = useDebounce(store, 800); // reduced from 3000ms → 800ms

  useEffect(() => {
    if (!user || !cloudReady || !pullOk.current) return;
    setSyncing(true);
    setSyncError(false);
    const s = useGameStore.getState();
    pushToCloud(user.uid, s)
      .then(() => setSyncError(false))
      .catch(() => setSyncError(true))
      .finally(() => setSyncing(false));
    updatePublicProfile(user.uid, {
      username: s.userName || user.displayName || '',
      displayName: user.displayName || s.userName || '',
      level: s.stats.level,
      xp: s.stats.xp,
      str: s.stats.str,
      con: s.stats.con,
      dex: s.stats.dex,
      profilePicUrl: s.profilePicUrl || '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSnapshot, user?.uid, cloudReady]);

  // ── Force immediate sync when user leaves the app ────────────────────────
  useEffect(() => {
    if (!user || !cloudReady || !pullOk.current) return;
    const flushSync = () => {
      if (!pullOk.current) return; // never flush if pull failed
      const s = useGameStore.getState();
      pushToCloud(user.uid, s);
    };
    // visibilitychange fires when tab is hidden (phone locks, switches app, etc.)
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushSync(); };
    // pagehide fires on iOS Safari when the page is being navigated away from
    window.addEventListener('pagehide', flushSync);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flushSync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user, cloudReady]);

  // ── Not logged in (or still resolving auth) → always show landing/auth ──
  if (!user) {
    return (
      <>
        <ThemeApplier />
        {showAuth
          ? <AuthScreen initialMode={authMode} />
          : <LandingPage
              onGetStarted={() => { setAuthMode('signup'); setShowAuth(true); }}
              onLogin={() => { setAuthMode('login'); setShowAuth(true); }}
            />
        }
      </>
    );
  }

  // ── Logged in but waiting for cloud data / subscription check ────────────
  if (!cloudReady || subscribed === null) {
    return (
      <div className="min-h-screen bg-ql-bg flex items-center justify-center">
        <ThemeApplier />
        <div className="flex flex-col items-center gap-3">
          <div className="text-3xl font-black animate-pulse">
            <span className="text-ql">G</span><span style={{ color: '#16a34a' }}>AI</span><span className="text-ql">NN</span>
          </div>
          <p className="text-ql-3 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Subscription gate ─────────────────────────────────────────────────────
  if (!subscribed) {
    return (
      <>
        <ThemeApplier />
        <SubscriptionGate />
      </>
    );
  }

  // ── App ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-ql-bg" style={{ position: 'fixed', inset: 0, height: '100dvh' }}>
      <ThemeApplier />
      {!hasOnboarded && <OnboardingFlow />}

      {/* Header */}
      <header className="shrink-0 z-30 bg-ql-hdr backdrop-blur-xl border-b border-ql px-5 py-3.5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <span className="font-black text-base tracking-tight text-ql">G</span><span className="font-black text-base tracking-tight" style={{ color: '#16a34a' }}>AI</span><span className="font-black text-base tracking-tight text-ql">NN</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-ql-3 text-xs">
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            {/* Sync indicator */}
            {pullFailed
              ? <span title="Cloud sync failed — data may not be up to date" className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              : syncing
              ? <span title="Syncing…" className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              : syncError
              ? <span title="Last sync failed — will retry" className="w-2 h-2 rounded-full bg-red-500" />
              : <span title="Synced" className="w-2 h-2 rounded-full bg-emerald-500" />
            }
            <button
              onClick={() => setActiveSection(activeSection === 'social' ? 'dashboard' : 'social')}
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                activeSection === 'social' ? 'ring-2 ring-white bg-ql-surface2' : 'bg-ql-surface2 border border-ql text-ql-3'
              }`}
            >
              👥
            </button>
            <button
              onClick={() => setActiveSection(activeSection === 'feedback' ? 'dashboard' : 'feedback')}
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                activeSection === 'feedback' ? 'ring-2 ring-white bg-ql-surface2' : 'bg-ql-surface2 border border-ql text-ql-3'
              }`}
              title="Send feedback"
            >
              💬
            </button>
            <button
              onClick={() => setActiveSection(activeSection === 'leaderboard' ? 'dashboard' : 'leaderboard')}
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                activeSection === 'leaderboard' ? 'ring-2 ring-white bg-ql-surface2' : 'bg-ql-surface2 border border-ql text-ql-3'
              }`}
            >
              🏆
            </button>
            <button
              onClick={() => setActiveSection(activeSection === 'settings' ? 'dashboard' : 'settings')}
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                activeSection === 'settings' ? 'ring-2 ring-white bg-ql-surface2' : 'bg-ql-surface2 border border-ql text-ql-3'
              }`}
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-5 pb-6">
        {(activeSection === 'dashboard' || activeSection === 'calendar') && <HomePage />}
        {activeSection === 'vices'     && <ViceTracker />}
        {activeSection === 'training'  && <TrainingHub />}
        {activeSection === 'habits'    && <HabitTracker />}
        {activeSection === 'gym'       && <GymFitness />}
        {activeSection === 'nutrition' && <FoodDrink />}
        {activeSection === 'settings'  && <SettingsPage />}
        {activeSection === 'social'      && <SocialPage userId={user.uid} />}
        {activeSection === 'feedback'    && <FeedbackPage userId={user.uid} />}
        {activeSection === 'leaderboard' && <LeaderboardPage userId={user.uid} displayName={store.userName || user.displayName || 'Anonymous'} />}
      </main>

      <NavBar />
      <LevelUpModal />
      {hasOnboarded && <AIAssistant />}
    </div>
  );
}
