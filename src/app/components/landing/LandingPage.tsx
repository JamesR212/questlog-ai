'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LandingPageProps {
  onGetStarted: () => void;
}

// ─── useFadeIn hook ───────────────────────────────────────────────────────────

function useFadeIn(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ─── Phone Mockup ─────────────────────────────────────────────────────────────

function Phone({ feature }: { feature: number }) {
  const screens = [
    // 0 — Habits
    <div key="habits" style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, color: '#a1a1aa', marginBottom: 4, fontWeight: 600, letterSpacing: 1 }}>TODAY'S HABITS</div>
      {[
        { emoji: '🏃', name: 'Morning Run', color: '#16a34a', done: true },
        { emoji: '📚', name: 'Read 30 mins', color: '#2563eb', done: true },
        { emoji: '🧘', name: 'Meditate', color: '#7c3aed', done: false },
        { emoji: '💊', name: 'Vitamins', color: '#d97706', done: true },
        { emoji: '✍️', name: 'Journal', color: '#db2777', done: false },
      ].map((h, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 8px', border: `1px solid ${h.done ? h.color + '40' : 'rgba(255,255,255,0.06)'}` }}>
          <span style={{ fontSize: 13 }}>{h.emoji}</span>
          <span style={{ flex: 1, fontSize: 9, color: h.done ? '#e4e4e7' : '#71717a' }}>{h.name}</span>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: h.done ? h.color : 'transparent', border: `1.5px solid ${h.done ? h.color : '#3f3f46'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {h.done && <span style={{ fontSize: 8, color: '#fff' }}>✓</span>}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} style={{ aspectRatio: '1', borderRadius: 2, background: Math.random() > 0.4 ? '#16a34a' : 'rgba(255,255,255,0.06)' }} />
        ))}
      </div>
    </div>,

    // 1 — Fitness
    <div key="fitness" style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 600, letterSpacing: 1 }}>WORKOUT LOG</div>
      <div style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 10, padding: '8px 10px' }}>
        <div style={{ fontSize: 9, color: '#86efac' }}>Push Day A</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 2 }}>45 min</div>
        <div style={{ fontSize: 9, color: '#a1a1aa' }}>3 exercises · 9 sets</div>
      </div>
      {[
        { name: 'Bench Press', sets: '4×8', weight: '80kg' },
        { name: 'OHP', sets: '3×10', weight: '50kg' },
        { name: 'Tricep Dips', sets: '3×12', weight: 'BW' },
      ].map((ex, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
          <span style={{ fontSize: 9, color: '#e4e4e7' }}>{ex.name}</span>
          <span style={{ fontSize: 9, color: '#86efac', fontWeight: 600 }}>{ex.sets} · {ex.weight}</span>
        </div>
      ))}
      <div style={{ height: 40, background: 'rgba(255,255,255,0.03)', borderRadius: 8, position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', display: 'flex', alignItems: 'flex-end', padding: '0 6px', gap: 3 }}>
          {[60, 80, 55, 90, 70, 85, 95].map((h, i) => (
            <div key={i} style={{ flex: 1, background: 'rgba(22,163,74,0.5)', borderRadius: '2px 2px 0 0', height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>,

    // 2 — Nutrition
    <div key="nutrition" style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 600, letterSpacing: 1 }}>NUTRITION</div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 0' }}>
        <div style={{ position: 'relative', width: 70, height: 70 }}>
          <svg viewBox="0 0 70 70" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle cx="35" cy="35" r="28" fill="none" stroke="#16a34a" strokeWidth="8" strokeDasharray={`${2 * Math.PI * 28 * 0.72} ${2 * Math.PI * 28 * 0.28}`} strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>1,840</span>
            <span style={{ fontSize: 7, color: '#a1a1aa' }}>/ 2,550 kcal</span>
          </div>
        </div>
      </div>
      {[
        { meal: '🥣 Breakfast', kcal: 420 },
        { meal: '🥗 Lunch', kcal: 680 },
        { meal: '🍎 Snack', kcal: 140 },
        { meal: '🍗 Dinner', kcal: 600 },
      ].map((m, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 7 }}>
          <span style={{ fontSize: 9, color: '#e4e4e7' }}>{m.meal}</span>
          <span style={{ fontSize: 9, color: '#86efac' }}>{m.kcal} kcal</span>
        </div>
      ))}
    </div>,

    // 3 — Hydration
    <div key="hydration" style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <div style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 600, letterSpacing: 1, alignSelf: 'flex-start' }}>HYDRATION</div>
      <div style={{ position: 'relative', width: 90, height: 90 }}>
        <svg viewBox="0 0 90 90" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle cx="45" cy="45" r="36" fill="none" stroke="#3b82f6" strokeWidth="10" strokeDasharray={`${2 * Math.PI * 36 * 0.62} ${2 * Math.PI * 36 * 0.38}`} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#93c5fd' }}>1.5L</span>
          <span style={{ fontSize: 7, color: '#a1a1aa' }}>of 2.4L</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, width: '100%' }}>
        {[250, 250, 500, 250, 250].map((ml, i) => (
          <div key={i} style={{ background: i < 3 ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.05)', border: `1px solid ${i < 3 ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#93c5fd' }}>💧</div>
            <div style={{ fontSize: 8, color: '#a1a1aa', marginTop: 2 }}>{ml}ml</div>
          </div>
        ))}
      </div>
      <div style={{ width: '100%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 8, color: '#93c5fd' }}>AI Goal — Based on your stats</span>
        <span style={{ fontSize: 8, color: '#60a5fa', fontWeight: 600 }}>2.4L</span>
      </div>
    </div>,

    // 4 — Sleep
    <div key="sleep" style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 600, letterSpacing: 1 }}>SLEEP TRACKING</div>
      <div style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 10, padding: '8px 10px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 9, color: '#c4b5fd' }}>Last night</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 2 }}>7h 23m</div>
          <div style={{ fontSize: 8, color: '#a1a1aa' }}>10:47pm → 6:10am</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#a78bfa' }}>84</div>
          <div style={{ fontSize: 8, color: '#a1a1aa' }}>score</div>
        </div>
      </div>
      <div style={{ height: 40, position: 'relative', overflow: 'hidden' }}>
        <svg viewBox="0 0 160 40" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 35 C20 35 25 10 40 10 C55 10 60 25 80 20 C100 15 105 5 120 8 C135 11 140 28 160 30 L160 40 L0 40 Z" fill="url(#sg)" />
          <path d="M0 35 C20 35 25 10 40 10 C55 10 60 25 80 20 C100 15 105 5 120 8 C135 11 140 28 160 30" fill="none" stroke="#a78bfa" strokeWidth="1.5" />
        </svg>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 7, color: '#71717a', marginBottom: 3 }}>{d}</div>
            <div style={{ height: 24, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#7c3aed', height: `${[80, 65, 90, 75, 85, 70, 88][i]}%`, borderRadius: '4px 4px 0 0' }} />
            </div>
          </div>
        ))}
      </div>
    </div>,

    // 5 — Steps
    <div key="steps" style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 600, letterSpacing: 1 }}>STEPS & ACTIVITY</div>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>8,432</div>
        <div style={{ fontSize: 9, color: '#a1a1aa' }}>steps today · goal 10,000</div>
        <div style={{ marginTop: 8, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '84%', background: 'linear-gradient(90deg, #16a34a, #4ade80)', borderRadius: 3 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[
          { label: 'Distance', value: '5.8 km', icon: '📍' },
          { label: 'Calories', value: '312 kcal', icon: '🔥' },
          { label: 'Floors', value: '14', icon: '🏢' },
          { label: 'Active min', value: '42', icon: '⚡' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#e4e4e7', marginTop: 2 }}>{s.value}</div>
            <div style={{ fontSize: 8, color: '#71717a' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>,

    // 6 — AI
    <div key="ai" style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 600, letterSpacing: 1 }}>AI ADVISOR</div>
      {[
        { from: 'user', text: "I skipped leg day again 😬" },
        { from: 'ai', text: "Let's fix that. I've designed a 30-min leg session based on your equipment. Want to see it?" },
        { from: 'user', text: "Yes please!" },
        { from: 'ai', text: "Starting with goblet squats 3×12 at 24kg, then RDLs... 💪" },
      ].map((msg, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start' }}>
          <div style={{
            maxWidth: '80%',
            background: msg.from === 'user' ? 'rgba(22,163,74,0.3)' : 'rgba(255,255,255,0.07)',
            border: msg.from === 'user' ? '1px solid rgba(22,163,74,0.4)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: msg.from === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
            padding: '6px 9px',
            fontSize: 9,
            color: '#e4e4e7',
            lineHeight: 1.5,
          }}>
            {msg.text}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '6px 8px', fontSize: 8, color: '#52525b', border: '1px solid rgba(255,255,255,0.08)' }}>Ask anything…</div>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>↑</div>
      </div>
    </div>,

    // 7 — RPG
    <div key="rpg" style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 600, letterSpacing: 1 }}>RPG PROGRESSION</div>
      <div style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.2), rgba(22,163,74,0.05))', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 10, padding: '8px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: '#86efac' }}>Level</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>12</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#a1a1aa' }}>Next level</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#4ade80' }}>2,140 XP</div>
          </div>
        </div>
        <div style={{ marginTop: 6, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '67%', background: 'linear-gradient(90deg, #16a34a, #4ade80)', borderRadius: 3 }} />
        </div>
        <div style={{ fontSize: 8, color: '#a1a1aa', marginTop: 3 }}>3,420 / 5,560 XP</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {[
          { stat: 'STR', value: 48, color: '#ef4444' },
          { stat: 'CON', value: 62, color: '#f59e0b' },
          { stat: 'DEX', value: 35, color: '#3b82f6' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 9, color: s.color, fontWeight: 700 }}>{s.stat}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 2 }}>{s.value}</div>
            <div style={{ marginTop: 4, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.value}%`, background: s.color, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>🎉</span>
        <div>
          <div style={{ fontSize: 8, color: '#86efac', fontWeight: 600 }}>LEVEL UP!</div>
          <div style={{ fontSize: 8, color: '#a1a1aa' }}>+5 STR from 7-day gym streak</div>
        </div>
      </div>
    </div>,
  ];

  return (
    <div style={{
      width: 160,
      height: 320,
      background: '#0d0d14',
      borderRadius: 28,
      border: '2px solid rgba(255,255,255,0.12)',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.6), 0 40px 80px rgba(0,0,0,0.6), 0 0 40px rgba(22,163,74,0.1)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Notch */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 60, height: 18, background: '#0d0d14',
        borderRadius: '0 0 14px 14px',
        zIndex: 10,
        borderLeft: '2px solid rgba(255,255,255,0.12)',
        borderRight: '2px solid rgba(255,255,255,0.12)',
        borderBottom: '2px solid rgba(255,255,255,0.12)',
      }} />
      {/* Status bar */}
      <div style={{ height: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 14px', position: 'relative', zIndex: 5 }}>
        <span style={{ fontSize: 7, color: '#fff', fontWeight: 600 }}>9:41</span>
        <span style={{ fontSize: 7, color: '#fff' }}>●●●</span>
      </div>
      {/* Screen content */}
      <div style={{ flex: 1, overflowY: 'hidden', height: 286 }}>
        {screens[Math.max(0, Math.min(screens.length - 1, feature))]}
      </div>
    </div>
  );
}

// ─── Sticky features section ──────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '🔥',
    title: 'Habit Tracking',
    subtitle: 'Build streaks that stick',
    desc: 'Track any habit with custom schedules, emoji icons, and completion grids. Streaks build momentum — GAINN keeps the fire alive.',
    color: '#16a34a',
  },
  {
    icon: '🏋️',
    title: 'Gym & Fitness',
    subtitle: 'Train smarter every session',
    desc: 'AI-generated workout plans, session logging, and GPS route recording. Every rep logged, every run mapped.',
    color: '#16a34a',
  },
  {
    icon: '🥗',
    title: 'AI Nutrition',
    subtitle: 'Photo-log your meals in seconds',
    desc: 'Snap a photo, get instant calorie and macro analysis. AI-generated meal plans tailored to your goals.',
    color: '#16a34a',
  },
  {
    icon: '💧',
    title: 'Smart Hydration',
    subtitle: 'Your body\'s personalised water goal',
    desc: 'AI calculates your daily water target based on your stats. Track intake with a beautiful ring progress view.',
    color: '#16a34a',
  },
  {
    icon: '😴',
    title: 'Sleep & Wake',
    subtitle: 'Rest is part of the grind',
    desc: 'Set wake targets, log check-ins, and track sleep quality over time. See how sleep affects your XP gains.',
    color: '#16a34a',
  },
  {
    icon: '👟',
    title: 'Steps & GPS',
    subtitle: 'Every step counts toward your stats',
    desc: 'Step counter, daily goals, GPS activity recording with route maps and floors climbed. Move more, level up faster.',
    color: '#16a34a',
  },
  {
    icon: '🤖',
    title: 'AI Personal Advisor',
    subtitle: 'Your always-on coach',
    desc: 'Chat with an AI that knows your habits, workouts, nutrition, and goals. Personalised advice, any time.',
    color: '#16a34a',
  },
  {
    icon: '⚔️',
    title: 'RPG Progression',
    subtitle: 'Your life, gamified',
    desc: 'Earn XP, gain levels, and build STR / CON / DEX stats from your real-world actions. Every good habit is a power-up.',
    color: '#16a34a',
  },
];

function StickyFeatures({ onGetStarted: _ }: { onGetStarted: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sectionRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveIdx(i); },
        { threshold: 0.5 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  return (
    <div style={{ background: '#050508', position: 'relative' }}>
      {/* Label */}
      <div style={{ textAlign: 'center', padding: '80px 0 0', fontSize: 12, color: '#16a34a', fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase' }}>
        Everything you need
      </div>

      {/* Two-column: text scrolls left, phone sticks right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: 1000, margin: '0 auto', padding: '0 40px', boxSizing: 'border-box' }}>

        {/* Left: each feature is 100vh */}
        <div>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              ref={el => { sectionRefs.current[i] = el; }}
              style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: 40 }}
            >
              <div style={{ fontSize: 52, marginBottom: 16 }}>{f.icon}</div>
              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>{f.subtitle}</div>
              <h3 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, marginBottom: 18 }}>{f.title}</h3>
              <p style={{ fontSize: 16, color: '#a1a1aa', lineHeight: 1.8, maxWidth: 380 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Right: sticky phone */}
        <div style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Dot nav */}
          <div style={{ position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {FEATURES.map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === activeIdx ? '#16a34a' : 'rgba(255,255,255,0.2)',
                transition: 'background 0.3s ease',
              }} />
            ))}
          </div>
          <Phone feature={activeIdx} />
        </div>
      </div>
    </div>
  );
}

// ─── Main LandingPage ─────────────────────────────────────────────────────────

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const { ref: socialRef, visible: socialVisible } = useFadeIn();
  const { ref: replaceRef, visible: replaceVisible } = useFadeIn();
  const { ref: aiRef, visible: aiVisible } = useFadeIn();
  const { ref: compRef, visible: compVisible } = useFadeIn();
  const { ref: pricingRef, visible: pricingVisible } = useFadeIn();
  const { ref: ctaRef, visible: ctaVisible } = useFadeIn();

  const [particles] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      duration: Math.random() * 8 + 4,
      delay: Math.random() * 6,
    }))
  );

  const [compRowsVisible, setCompRowsVisible] = useState(false);
  const compRowsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = compRowsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setCompRowsVisible(true); obs.disconnect(); } }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

  const competitors = [
    { name: 'Strava Premium', category: 'GPS & Fitness', price: '£7.99/mo' },
    { name: 'MyFitnessPal', category: 'Nutrition Tracking', price: '£8.99/mo' },
    { name: 'Habitify', category: 'Habit Tracking', price: '£2.99/mo' },
    { name: 'Sleep Cycle', category: 'Sleep Tracking', price: '£2.99/mo' },
    { name: 'WaterMinder', category: 'Hydration', price: '£1.99/mo' },
    { name: 'YNAB', category: 'Budget Tracking', price: '£5.99/mo' },
  ];

  const aiFeatures = [
    { icon: '📸', title: 'Meal Photo Analysis', desc: 'Snap your plate — AI identifies food and calculates calories and macros instantly.' },
    { icon: '🏋️', title: 'AI Gym Plan Generation', desc: 'Get a personalised workout plan built around your equipment, goals, and schedule.' },
    { icon: '🥗', title: 'AI Meal Plan Generation', desc: 'Receive a weekly meal plan matched to your calorie targets and preferences.' },
    { icon: '💧', title: 'AI Hydration Recommendation', desc: 'Your daily water goal calculated from your body stats, activity, and climate.' },
    { icon: '🤖', title: 'AI Personal Advisor', desc: 'Chat with an AI coach that knows every aspect of your health journey.' },
    { icon: '🍎', title: 'AI Food Suggestions', desc: 'Stuck on what to eat? AI suggests meals that fit your remaining macros.' },
  ];

  const replacesApps = ['Strava', 'MyFitnessPal', 'Habitify', 'Sleep Cycle', 'YNAB', 'WaterMinder'];

  return (
    <div style={{ background: '#050508', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif', overflowX: 'hidden' }}>

      {/* ── 1. Hero ─────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '80px 24px' }}>
        {/* Gradient background */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(22,163,74,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        {/* Particle field */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {particles.map(p => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                background: '#fff',
                opacity: p.opacity,
                animation: `twinkle ${p.duration}s ${p.delay}s ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>

        <style>{`
          @keyframes twinkle { from { opacity: 0.05; } to { opacity: 0.5; } }
          @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
          @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 20px rgba(22,163,74,0.3); } 50% { box-shadow: 0 0 40px rgba(22,163,74,0.6); } }
          @keyframes fade-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>

        {/* Logo */}
        <div style={{ marginBottom: 32, animation: 'fade-up 0.9s ease forwards' }}>
          <span style={{ fontSize: 80, fontWeight: 900, letterSpacing: -2, color: '#fff' }}>G</span>
          <span style={{ fontSize: 80, fontWeight: 900, letterSpacing: -2, color: '#16a34a' }}>AI</span>
          <span style={{ fontSize: 80, fontWeight: 900, letterSpacing: -2, color: '#fff' }}>NN</span>
        </div>

        {/* Tagline */}
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 800, textAlign: 'center', lineHeight: 1.15, maxWidth: 640, marginBottom: 16, animation: 'fade-up 0.9s 0.15s ease both' }}>
          Level up every part<br />of your life
        </h1>

        {/* Subtext */}
        <p style={{ fontSize: 20, color: '#a1a1aa', textAlign: 'center', marginBottom: 40, animation: 'fade-up 0.9s 0.3s ease both' }}>
          The all-in-one AI life tracker
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', animation: 'fade-up 0.9s 0.45s ease both' }}>
          <button
            onClick={onGetStarted}
            style={{
              padding: '16px 36px',
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              transition: `all 0.3s ${easing}`,
              animation: 'pulse-glow 3s ease-in-out infinite',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#15803d'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#16a34a'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            Get Started Free
          </button>
          <button
            onClick={onGetStarted}
            style={{
              padding: '16px 36px',
              background: 'transparent',
              color: '#fff',
              border: '1.5px solid rgba(255,255,255,0.25)',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              transition: `all 0.3s ${easing}`,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.6)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            Log In
          </button>
        </div>

        {/* Floating phone */}
        <div style={{ marginTop: 60, animation: 'float 6s ease-in-out infinite, fade-up 0.9s 0.6s ease both' }}>
          <Phone feature={7} />
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: 0.4 }}>
          <span style={{ fontSize: 12, color: '#a1a1aa', letterSpacing: 2, textTransform: 'uppercase' }}>Scroll</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, #16a34a, transparent)' }} />
        </div>
      </section>

      {/* ── 2. Social proof strip ────────────────────────────────────── */}
      <div
        ref={socialRef}
        style={{
          padding: '32px 24px',
          background: 'rgba(22,163,74,0.06)',
          borderTop: '1px solid rgba(22,163,74,0.15)',
          borderBottom: '1px solid rgba(22,163,74,0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          opacity: socialVisible ? 1 : 0,
          transform: socialVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: `all 0.7s ${easing}`,
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {[1,2,3,4,5].map(i => (
            <span key={i} style={{ color: '#fbbf24', fontSize: 20 }}>★</span>
          ))}
        </div>
        <p style={{ fontSize: 16, color: '#e4e4e7', fontWeight: 500, textAlign: 'center' }}>
          Join <span style={{ color: '#4ade80', fontWeight: 700 }}>thousands</span> already gaining
        </p>
        <p style={{ fontSize: 13, color: '#71717a' }}>Rated 5 stars by our community</p>
      </div>

      {/* ── 3. One app section ───────────────────────────────────────── */}
      <section
        ref={replaceRef}
        style={{
          padding: '120px 24px',
          textAlign: 'center',
          opacity: replaceVisible ? 1 : 0,
          transform: replaceVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: `all 0.7s ${easing}`,
        }}
      >
        <h2 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 40 }}>
          One app.<br />
          <span style={{ color: '#16a34a' }}>Infinite gains.</span>
        </h2>
        <p style={{ fontSize: 18, color: '#71717a', marginBottom: 60 }}>Replaces all of these:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', maxWidth: 700, margin: '0 auto' }}>
          {replacesApps.map((app, i) => (
            <div
              key={app}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 100,
                fontSize: 15,
                color: '#a1a1aa',
                opacity: replaceVisible ? 1 : 0,
                transform: replaceVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
                transition: `all 0.5s ${easing} ${0.15 + i * 0.08}s`,
                textDecoration: 'line-through',
                textDecorationColor: 'rgba(239,68,68,0.6)',
              }}
            >
              {app}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 48, fontSize: 'clamp(18px, 3vw, 28px)', color: '#4ade80', fontWeight: 700 }}>
          → One subscription. One app. Everything. ←
        </div>
      </section>

      {/* ── 4. Sticky features ──────────────────────────────────────── */}
      <StickyFeatures onGetStarted={onGetStarted} />

      {/* ── 5. AI section ───────────────────────────────────────────── */}
      <section
        ref={aiRef}
        style={{
          padding: '120px 24px',
          background: 'radial-gradient(ellipse 100% 80% at 50% 50%, rgba(22,163,74,0.08) 0%, transparent 70%)',
          opacity: aiVisible ? 1 : 0,
          transform: aiVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: `all 0.7s ${easing}`,
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>Intelligence built in</div>
          <h2 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, marginBottom: 20 }}>Powered by AI</h2>
          <p style={{ fontSize: 18, color: '#a1a1aa', marginBottom: 72 }}>Not just an app — your intelligent life operating system</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, textAlign: 'left' }}>
            {aiFeatures.map((f, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(22,163,74,0.06)',
                  border: '1px solid rgba(22,163,74,0.2)',
                  borderRadius: 16,
                  padding: '24px 24px',
                  opacity: aiVisible ? 1 : 0,
                  transform: aiVisible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.6s ${easing} ${i * 0.08}s`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, background: 'radial-gradient(circle, rgba(22,163,74,0.2) 0%, transparent 70%)', borderRadius: '50%' }} />
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 14, color: '#a1a1aa', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Competitor comparison ─────────────────────────────────── */}
      <section
        ref={compRef}
        style={{
          padding: '120px 24px',
          opacity: compVisible ? 1 : 0,
          transform: compVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: `all 0.7s ${easing}`,
        }}
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>The hidden cost</div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, marginBottom: 16 }}>Why pay for 6 apps?</h2>
            <p style={{ fontSize: 17, color: '#71717a' }}>This is what the piecemeal approach costs you every month</p>
          </div>

          <div ref={compRowsRef} style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            {competitors.map((c, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 24px',
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  opacity: compRowsVisible ? 1 : 0,
                  transform: compRowsVisible ? 'translateX(0)' : 'translateX(-20px)',
                  transition: `all 0.5s ${easing} ${i * 0.07}s`,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#e4e4e7' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#71717a' }}>{c.category}</div>
                </div>
                <div style={{ fontSize: 15, color: '#f87171', fontWeight: 600 }}>{c.price}</div>
              </div>
            ))}
            {/* Total */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              background: 'rgba(239,68,68,0.1)',
              borderTop: '2px solid rgba(239,68,68,0.3)',
              opacity: compRowsVisible ? 1 : 0,
              transform: compRowsVisible ? 'translateX(0)' : 'translateX(-20px)',
              transition: `all 0.5s ${easing} ${competitors.length * 0.07}s`,
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fca5a5' }}>TOTAL per month</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#ef4444' }}>£28.93/mo</div>
            </div>
          </div>

          {/* Green reveal */}
          <div
            style={{
              marginTop: 32,
              padding: '32px 32px',
              background: 'linear-gradient(135deg, rgba(22,163,74,0.2), rgba(22,163,74,0.08))',
              border: '1.5px solid rgba(22,163,74,0.4)',
              borderRadius: 20,
              textAlign: 'center',
              opacity: compRowsVisible ? 1 : 0,
              transform: compRowsVisible ? 'scale(1)' : 'scale(0.95)',
              transition: `all 0.6s ${easing} ${(competitors.length + 1) * 0.07}s`,
              boxShadow: '0 0 60px rgba(22,163,74,0.15)',
            }}
          >
            <div style={{ fontSize: 13, color: '#86efac', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>GAINN does ALL of this</div>
            <div style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900, color: '#4ade80' }}>£2.99/mo</div>
            <div style={{ fontSize: 15, color: '#86efac', marginTop: 8 }}>Save over £25 every month</div>
          </div>
        </div>
      </section>

      {/* ── 7. Pricing ───────────────────────────────────────────────── */}
      <section
        ref={pricingRef}
        style={{
          padding: '120px 24px',
          background: 'rgba(22,163,74,0.03)',
          borderTop: '1px solid rgba(22,163,74,0.1)',
          borderBottom: '1px solid rgba(22,163,74,0.1)',
          opacity: pricingVisible ? 1 : 0,
          transform: pricingVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: `all 0.7s ${easing}`,
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>Simple pricing</div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, marginBottom: 16 }}>One price. Everything included.</h2>
          <p style={{ fontSize: 17, color: '#71717a', marginBottom: 64 }}>No feature tiers. No paywalled sections. All of GAINN, for everyone.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 48 }}>
            {/* Monthly */}
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1.5px solid rgba(255,255,255,0.1)',
                borderRadius: 24,
                padding: '40px 36px',
                opacity: pricingVisible ? 1 : 0,
                transform: pricingVisible ? 'scale(1)' : 'scale(0.94)',
                transition: `all 0.6s ${easing} 0.1s`,
              }}
            >
              <div style={{ fontSize: 14, color: '#a1a1aa', fontWeight: 600, marginBottom: 16 }}>Monthly</div>
              <div style={{ fontSize: 52, fontWeight: 900, color: '#fff' }}>£2.99</div>
              <div style={{ fontSize: 14, color: '#71717a', marginBottom: 32 }}>per month</div>
              <button
                onClick={onGetStarted}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'transparent',
                  color: '#fff',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: `all 0.3s ${easing}`,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.5)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
              >
                Get Started
              </button>
            </div>

            {/* Annual */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(22,163,74,0.05))',
                border: '1.5px solid rgba(22,163,74,0.5)',
                borderRadius: 24,
                padding: '40px 36px',
                position: 'relative',
                boxShadow: '0 0 60px rgba(22,163,74,0.12)',
                opacity: pricingVisible ? 1 : 0,
                transform: pricingVisible ? 'scale(1)' : 'scale(0.94)',
                transition: `all 0.6s ${easing} 0.2s`,
              }}
            >
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 100, letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Best Value
              </div>
              <div style={{ fontSize: 14, color: '#86efac', fontWeight: 600, marginBottom: 16 }}>Annual</div>
              <div style={{ fontSize: 52, fontWeight: 900, color: '#fff' }}>£29.99</div>
              <div style={{ fontSize: 14, color: '#71717a', marginBottom: 4 }}>per year</div>
              <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 600, marginBottom: 32 }}>Save 16% vs monthly</div>
              <button
                onClick={onGetStarted}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: `all 0.3s ${easing}`,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#15803d'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#16a34a'; }}
              >
                Get Started
              </button>
            </div>
          </div>

          {/* Feature list */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            {['All features included', 'AI advisor', 'Cloud sync', 'All future updates'].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#a1a1aa' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Final CTA ─────────────────────────────────────────────── */}
      <section
        ref={ctaRef}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse 100% 80% at 50% 50%, rgba(22,163,74,0.18) 0%, #050508 70%)',
          textAlign: 'center',
          padding: '80px 24px',
          opacity: ctaVisible ? 1 : 0,
          transform: ctaVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: `all 0.7s ${easing}`,
        }}
      >
        <div style={{ fontSize: 'clamp(52px, 9vw, 100px)', fontWeight: 900, letterSpacing: '-3px', marginBottom: 24, lineHeight: 1 }}>
          <span style={{ color: '#ffffff' }}>G</span><span style={{ color: '#16a34a' }}>AI</span><span style={{ color: '#ffffff' }}>NN</span>
        </div>
        <h2 style={{ fontSize: 'clamp(40px, 7vw, 80px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 24 }}>
          Ready to<br />
          <span style={{ color: '#16a34a' }}>gain?</span>
        </h2>
        <p style={{ fontSize: 18, color: '#a1a1aa', marginBottom: 48, maxWidth: 400 }}>
          Join thousands levelling up their health, fitness, and finances — all in one app.
        </p>
        <button
          onClick={onGetStarted}
          style={{
            padding: '20px 56px',
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            fontSize: 18,
            fontWeight: 800,
            cursor: 'pointer',
            transition: `all 0.3s ${easing}`,
            boxShadow: '0 0 40px rgba(22,163,74,0.4)',
            animation: 'pulse-glow 3s ease-in-out infinite',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.06)'; (e.currentTarget as HTMLButtonElement).style.background = '#15803d'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.background = '#16a34a'; }}
        >
          Get Started Free
        </button>
        <p style={{ marginTop: 20, fontSize: 13, color: '#52525b' }}>No credit card required · Cancel any time</p>
      </section>

      {/* ── 9. Footer ────────────────────────────────────────────────── */}
      <footer style={{
        padding: '40px 24px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>
          <span style={{ color: '#fff' }}>G</span>
          <span style={{ color: '#16a34a' }}>AI</span>
          <span style={{ color: '#fff' }}>NN</span>
        </div>
        <p style={{ fontSize: 13, color: '#52525b' }}>© 2026 GAINN. All rights reserved.</p>
      </footer>
    </div>
  );
}
