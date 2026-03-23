'use client';

import { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { pushToCloud, pullFromCloud, upsertProfile } from '@/lib/sync';
import { updatePublicProfile } from '@/lib/friends';
import { useGameStore } from '@/store/gameStore';
import type { User } from 'firebase/auth';
import AuthScreen from './components/auth/AuthScreen';
import NavBar from './components/shared/NavBar';
import LevelUpModal from './components/shared/LevelUpModal';
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

  const [user, setUser]             = useState<User | null | undefined>(undefined); // undefined = loading
  const [syncing, setSyncing]       = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const hasHydrated                 = useRef(false);

  // ── Auth listener ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsub();
  }, []);

  // ── On login: pull cloud data and hydrate store ──────────────────────────
  useEffect(() => {
    if (!user || hasHydrated.current) return;
    hasHydrated.current = true;

    const userId = user.uid;

    // Ensure profile exists
    upsertProfile(userId, {
      username:     user.displayName ?? '',
      display_name: user.displayName ?? '',
    });

    // Pull and merge cloud data, then mark ready
    pullFromCloud(userId).then(cloudData => {
      if (cloudData) {
        useGameStore.setState(cloudData);
      }
      setCloudReady(true);
    });
  }, [user]);

  // ── On logout: reset hydration flag ─────────────────────────────────────
  useEffect(() => {
    if (!user) { hasHydrated.current = false; setCloudReady(false); }
  }, [user]);

  // ── Debounced auto-sync to cloud on store changes ────────────────────────
  const storeSnapshot = useDebounce(store, 3000);

  useEffect(() => {
    if (!user) return;
    setSyncing(true);
    const s = useGameStore.getState();
    pushToCloud(user.uid, s).finally(() => setSyncing(false));
    updatePublicProfile(user.uid, {
      username: s.userName || user.displayName || '',
      displayName: user.displayName || s.userName || '',
      level: s.stats.level,
      xp: s.stats.xp,
      str: s.stats.str,
      con: s.stats.con,
      dex: s.stats.dex,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSnapshot, user?.uid]);

  // ── Loading splash ───────────────────────────────────────────────────────
  if (user === undefined || (user && !cloudReady)) {
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

  // ── Not logged in ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <ThemeApplier />
        <AuthScreen />
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
            <button
              onClick={() => setActiveSection(activeSection === 'social' ? 'dashboard' : 'social')}
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${
                activeSection === 'social' ? 'bg-ql-accent text-white' : 'bg-ql-surface2 border border-ql text-ql-3'
              }`}
            >
              👥
            </button>
            <button
              onClick={() => setActiveSection(activeSection === 'settings' ? 'dashboard' : 'settings')}
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${
                activeSection === 'settings' ? 'bg-ql-accent text-white' : 'bg-ql-surface2 border border-ql text-ql-3'
              }`}
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-5 pb-6">
        {activeSection === 'dashboard' && <HomePage />}
        {activeSection === 'calendar'  && <CalendarPage />}
        {activeSection === 'vices'     && <ViceTracker />}
        {activeSection === 'training'  && <TrainingHub />}
        {activeSection === 'habits'    && <HabitTracker />}
        {activeSection === 'gym'       && <GymFitness />}
        {activeSection === 'nutrition' && <FoodDrink />}
        {activeSection === 'settings'  && <SettingsPage />}
        {activeSection === 'social'    && <SocialPage userId={user.uid} />}
      </main>

      <NavBar />
      <LevelUpModal />
    </div>
  );
}
