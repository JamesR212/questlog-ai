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

// Real app colours
const APP = {
  bg: '#13131f', surface: '#1e1e2e', surface2: '#252535',
  border: 'rgba(255,255,255,0.08)', accent: '#7c3aed',
  tx: '#f0f0f8', tx2: '#a1a1bb', tx3: '#6b6b8a',
};
const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: APP.surface, border: `1px solid ${APP.border}`,
  borderRadius: 14, padding: '10px 12px', ...extra,
});

function Phone({ feature }: { feature: number }) {
  const screens = [
    // 0 — Home dashboard (real app layout)
    <div key="home" style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: -0.5 }}><span style={{ color: APP.tx }}>G</span><span style={{ color: '#16a34a' }}>AI</span><span style={{ color: APP.tx }}>NN</span></div>
        <span style={{ fontSize: 8, color: APP.tx3 }}>Mon 23 Mar</span>
      </div>
      <div>
        <div style={{ fontSize: 8, color: APP.tx2 }}>Good morning, James</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: APP.tx }}>Your Dashboard</div>
      </div>
      {/* Streak card */}
      <div style={{ ...card(), display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>🔥</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: APP.tx }}>12</div>
          <div style={{ fontSize: 7, color: APP.tx3 }}>day streak</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 8, color: APP.accent, fontWeight: 600 }}>Keep it up!</div>
        </div>
      </div>
      {/* Weekly snapshot mini */}
      <div style={card()}>
        <div style={{ fontSize: 7, color: APP.tx3, marginBottom: 5, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>Weekly Snapshot</div>
        <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
          {['M','T','W','T','F','S','S'].map((d,i) => <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 6, color: APP.tx3 }}>{d}</div>)}
        </div>
        {[['🔥','✅','✅','✅','✅','✅','⬜'],['👟','✅','⬜','✅','✅','✅','⬜'],['💧','✅','✅','✅','⬜','✅','⬜']].map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
            <div style={{ fontSize: 7, width: 12 }}>{row[0]}</div>
            {row.slice(1).map((v, i) => <div key={i} style={{ flex: 1, height: 8, borderRadius: 2, background: v === '✅' ? APP.accent : APP.surface2 }} />)}
          </div>
        ))}
      </div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {[{l:'STR',v:48,c:'#ef4444'},{l:'CON',v:62,c:'#f59e0b'},{l:'DEX',v:35,c:'#3b82f6'}].map((s,i) => (
          <div key={i} style={{ ...card({ padding: '6px 6px' }), textAlign: 'center' }}>
            <div style={{ fontSize: 7, color: s.c, fontWeight: 700 }}>{s.l}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: APP.tx }}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>,

    // 1 — Habits (real training tab)
    <div key="habits" style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: APP.tx, marginBottom: 2 }}>Training</div>
      <div style={{ fontSize: 8, color: APP.tx3, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 2 }}>Today's Habits</div>
      {[
        { e: '🏃', n: 'Morning Run', c: '#16a34a', done: true },
        { e: '📚', n: 'Read 30 mins', c: '#2563eb', done: true },
        { e: '🧘', n: 'Meditate', c: APP.accent, done: false },
        { e: '💊', n: 'Vitamins', c: '#d97706', done: true },
        { e: '✍️', n: 'Journal', c: '#db2777', done: false },
      ].map((h, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, ...card({ padding: '6px 8px', borderColor: h.done ? h.c + '40' : APP.border }) }}>
          <span style={{ fontSize: 11 }}>{h.e}</span>
          <span style={{ flex: 1, fontSize: 9, color: h.done ? APP.tx : APP.tx3, fontWeight: 500 }}>{h.n}</span>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: h.done ? h.c : 'transparent', border: `1.5px solid ${h.done ? h.c : APP.tx3}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {h.done && <span style={{ fontSize: 8, color: '#fff' }}>✓</span>}
          </div>
        </div>
      ))}
      {/* Habit grid */}
      <div style={card()}>
        <div style={{ fontSize: 7, color: APP.tx3, marginBottom: 4 }}>This week</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {[1,1,1,1,0,1,0, 1,0,1,1,1,0,0, 1,1,0,1,1,1,0].map((v, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: 2, background: v ? APP.accent : APP.surface2 }} />
          ))}
        </div>
      </div>
    </div>,

    // 2 — Gym/Fitness (real fitness tab)
    <div key="fitness" style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: APP.tx, marginBottom: 2 }}>Fitness</div>
      <div style={{ ...card({ background: `${APP.accent}22`, borderColor: `${APP.accent}44` }) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 8, color: '#c4b5fd' }}>Active session</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: APP.tx }}>Push Day A</div>
            <div style={{ fontSize: 8, color: APP.tx3 }}>45 min · 9 sets done</div>
          </div>
          <div style={{ fontSize: 16 }}>💪</div>
        </div>
      </div>
      {[
        { n: 'Bench Press', s: '4×8', w: '80kg', done: true },
        { n: 'OHP', s: '3×10', w: '50kg', done: true },
        { n: 'Tricep Dips', s: '3×12', w: 'BW', done: false },
        { n: 'Lat Raises', s: '3×15', w: '10kg', done: false },
      ].map((ex, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...card({ padding: '6px 9px' }) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: ex.done ? '#4ade80' : APP.tx3 }} />
            <span style={{ fontSize: 9, color: ex.done ? APP.tx : APP.tx3 }}>{ex.n}</span>
          </div>
          <span style={{ fontSize: 8, color: ex.done ? '#4ade80' : APP.tx3, fontWeight: 600 }}>{ex.s} · {ex.w}</span>
        </div>
      ))}
      <div style={{ height: 32, background: APP.surface2, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', display: 'flex', alignItems: 'flex-end', padding: '0 6px', gap: 3 }}>
          {[60,80,55,90,70,85,95].map((h, i) => (
            <div key={i} style={{ flex: 1, background: `${APP.accent}80`, borderRadius: '2px 2px 0 0', height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>,

    // 3 — Nutrition (real food tab)
    <div key="nutrition" style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: APP.tx, marginBottom: 2 }}>Nutrition</div>
      {/* Calorie ring */}
      <div style={{ ...card(), display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
          <svg viewBox="0 0 64 64" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="32" cy="32" r="26" fill="none" stroke={APP.surface2} strokeWidth="7" />
            <circle cx="32" cy="32" r="26" fill="none" stroke={APP.accent} strokeWidth="7" strokeDasharray={`${2*Math.PI*26*0.72} ${2*Math.PI*26*0.28}`} strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: APP.tx }}>1,840</span>
            <span style={{ fontSize: 6, color: APP.tx3 }}>kcal</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {[{l:'Protein',v:72,c:'#3b82f6'},{l:'Carbs',v:58,c:'#f59e0b'},{l:'Fat',v:45,c:'#ef4444'}].map((m,i)=>(
            <div key={i} style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 7, color: APP.tx3 }}>{m.l}</span>
                <span style={{ fontSize: 7, color: m.c, fontWeight: 600 }}>{m.v}g</span>
              </div>
              <div style={{ height: 3, background: APP.surface2, borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${m.v}%`, background: m.c, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Meals */}
      {[{e:'🥣',n:'Breakfast',k:420},{e:'🥗',n:'Lunch',k:680},{e:'🍎',n:'Snack',k:140},{e:'🍗',n:'Dinner',k:600}].map((m,i)=>(
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...card({ padding: '5px 9px' }) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11 }}>{m.e}</span>
            <span style={{ fontSize: 9, color: APP.tx }}>{m.n}</span>
          </div>
          <span style={{ fontSize: 8, color: APP.tx2, fontWeight: 600 }}>{m.k} kcal</span>
        </div>
      ))}
    </div>,

    // 4 — Hydration (real water tracker)
    <div key="hydration" style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: APP.tx, alignSelf: 'flex-start' }}>Hydration</div>
      <div style={{ ...card({ width: '100%', boxSizing: 'border-box' as const }), display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
          <svg viewBox="0 0 72 72" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="36" cy="36" r="30" fill="none" stroke={APP.surface2} strokeWidth="8" />
            <circle cx="36" cy="36" r="30" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray={`${2*Math.PI*30*0.63} ${2*Math.PI*30*0.37}`} strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: APP.tx }}>1.5L</span>
            <span style={{ fontSize: 6, color: APP.tx3 }}>of 2.4L</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: APP.tx }}>63% of goal</div>
          <div style={{ fontSize: 8, color: APP.tx3 }}>4 drinks logged</div>
          <div style={{ marginTop: 4, fontSize: 8, color: '#3b82f6', fontWeight: 600 }}>✨ AI goal: 2.4L</div>
        </div>
      </div>
      {/* Quick-add buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, width: '100%' }}>
        {[150,250,330,500].map((ml) => (
          <div key={ml} style={{ ...card({ padding: '5px 3px', textAlign: 'center' as const }) }}>
            <div style={{ fontSize: 9, color: APP.tx, fontWeight: 600 }}>+{ml}</div>
            <div style={{ fontSize: 7, color: APP.tx3 }}>ml</div>
          </div>
        ))}
      </div>
      {/* Log entries */}
      <div style={{ width: '100%' }}>
        <div style={{ fontSize: 7, color: APP.tx3, marginBottom: 4, fontWeight: 600 }}>TODAY'S LOG</div>
        {[{t:'08:30',ml:250},{t:'10:15',ml:500},{t:'12:45',ml:330},{t:'15:00',ml:250}].map((e,i)=>(
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: `1px solid ${APP.border}` }}>
            <span style={{ fontSize: 8, color: APP.tx3 }}>{e.t}</span>
            <span style={{ fontSize: 8, color: '#93c5fd', fontWeight: 600 }}>💧 {e.ml}ml</span>
          </div>
        ))}
      </div>
    </div>,

    // 5 — Sleep & Wake (real wake quest)
    <div key="sleep" style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: APP.tx, marginBottom: 2 }}>Sleep & Wake</div>
      {/* Wake quest */}
      <div style={{ ...card({ background: `${APP.accent}18`, borderColor: `${APP.accent}44` }) }}>
        <div style={{ fontSize: 7, color: '#c4b5fd', fontWeight: 600, marginBottom: 4 }}>WAKE QUEST</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: APP.tx }}>06:30</div>
            <div style={{ fontSize: 7, color: APP.tx3 }}>target wake time</div>
          </div>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✓</div>
        </div>
      </div>
      {/* Sleep chart */}
      <div style={card()}>
        <div style={{ fontSize: 7, color: APP.tx3, marginBottom: 5 }}>This week</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 6, color: APP.tx3, marginBottom: 2 }}>{d}</div>
              <div style={{ height: 28, background: APP.surface2, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: APP.accent, height: `${[80,65,90,75,85,70,88][i]}%`, borderRadius: '3px 3px 0 0' }} />
              </div>
              <div style={{ fontSize: 6, color: APP.tx3, marginTop: 2 }}>{['7h','6h','8h','7h','8h','7h','8h'][i]}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Last night */}
      <div style={{ ...card(), display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 7, color: APP.tx3 }}>Last night</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: APP.tx }}>7h 32m</div>
          <div style={{ fontSize: 7, color: APP.tx3 }}>11pm → 6:32am</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 7, color: APP.tx3 }}>On time</div>
          <div style={{ fontSize: 18 }}>🌅</div>
        </div>
      </div>
    </div>,

    // 6 — AI Advisor (real chat)
    <div key="ai" style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: APP.tx, marginBottom: 2 }}>AI Advisor</div>
      <div style={{ ...card({ background: `${APP.accent}18`, borderColor: `${APP.accent}44`, padding: '7px 9px' }), display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 16 }}>🤖</span>
        <div>
          <div style={{ fontSize: 8, color: '#c4b5fd', fontWeight: 600 }}>GAINN AI</div>
          <div style={{ fontSize: 7, color: APP.tx3 }}>Your personal coach</div>
        </div>
      </div>
      {[
        { from: 'user', text: "I skipped leg day again 😬" },
        { from: 'ai', text: "Let's fix that — here's a 30-min leg session for your equipment:" },
        { from: 'ai', text: "Goblet Squats 3×12 · RDLs 3×10 · Lunges 3×10 💪" },
        { from: 'user', text: "Perfect, logging it now!" },
      ].map((msg, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start' }}>
          <div style={{
            maxWidth: '82%', fontSize: 8, color: APP.tx, lineHeight: 1.5, padding: '5px 8px',
            background: msg.from === 'user' ? `${APP.accent}44` : APP.surface2,
            border: `1px solid ${msg.from === 'user' ? `${APP.accent}66` : APP.border}`,
            borderRadius: msg.from === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
          }}>{msg.text}</div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
        <div style={{ flex: 1, ...card({ padding: '5px 8px' }), fontSize: 8, color: APP.tx3 }}>Ask anything…</div>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: APP.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>↑</div>
      </div>
    </div>,

    // 7 — RPG Character (real character page)
    <div key="rpg" style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: APP.tx, marginBottom: 2 }}>Character</div>
      {/* Level card */}
      <div style={{ ...card({ background: `${APP.accent}18`, borderColor: `${APP.accent}44` }) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 7, color: '#c4b5fd' }}>LEVEL</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: APP.tx, lineHeight: 1 }}>12</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8, color: APP.tx2, fontWeight: 600 }}>3,420 / 5,560 XP</div>
            <div style={{ fontSize: 7, color: APP.tx3 }}>next level</div>
          </div>
        </div>
        <div style={{ height: 5, background: APP.surface2, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '62%', background: APP.accent, borderRadius: 3 }} />
        </div>
      </div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
        {[{l:'⚔️ STR',v:48,c:'#ef4444',max:150},{l:'🛡️ CON',v:62,c:'#f59e0b',max:150},{l:'🏹 DEX',v:35,c:'#3b82f6',max:150},{l:'💰 GOLD',v:840,c:'#fbbf24',max:1000}].map((s,i)=>(
          <div key={i} style={card({ padding: '7px 8px' })}>
            <div style={{ fontSize: 8, color: s.c, fontWeight: 700, marginBottom: 3 }}>{s.l}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: APP.tx, marginBottom: 4 }}>{s.v}</div>
            <div style={{ height: 3, background: APP.surface2, borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${(s.v/s.max)*100}%`, background: s.c, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
      {/* Level up toast */}
      <div style={{ ...card({ background: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.3)', padding: '6px 9px' }), display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>🎉</span>
        <div>
          <div style={{ fontSize: 8, color: '#4ade80', fontWeight: 700 }}>LEVEL UP!</div>
          <div style={{ fontSize: 7, color: APP.tx3 }}>+5 STR · 7-day gym streak</div>
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

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const FEAT_COLORS = ['#16a34a','#3b82f6','#f97316','#06b6d4','#8b5cf6','#f43f5e','#10b981','#eab308'];

function FeatureSection({ f, i, onActive }: { f: (typeof FEATURES)[0]; i: number; onActive: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVis(true); onActive(); }
    }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [onActive]);

  const anim = (delay: number): React.CSSProperties => ({
    opacity: vis ? 1 : 0,
    transform: vis ? 'translateY(0px)' : 'translateY(44px)',
    transition: `opacity 0.85s ${EASE} ${delay}ms, transform 0.85s ${EASE} ${delay}ms`,
  });

  return (
    <div ref={ref} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: 60, paddingLeft: 8 }}>
      <div style={{ fontSize: 56, marginBottom: 20, ...anim(0) }}>{f.icon}</div>
      <div style={{ fontSize: 11, color: FEAT_COLORS[i % FEAT_COLORS.length], fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 12, ...anim(80) }}>{f.subtitle}</div>
      <h3 style={{ fontSize: 'clamp(30px, 3.8vw, 48px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, marginBottom: 20, ...anim(160) }}>{f.title}</h3>
      <p style={{ fontSize: 17, color: '#9ca3af', lineHeight: 1.85, maxWidth: 400, ...anim(240) }}>{f.desc}</p>
    </div>
  );
}

function StickyFeatures({ onGetStarted: _ }: { onGetStarted: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [phoneVisible, setPhoneVisible] = useState(true);
  const activeIdxRef = useRef(0);

  // Stable callback — never recreated, so FeatureSection observers never disconnect
  const handleActive = useCallback((i: number) => {
    if (i === activeIdxRef.current) return;
    activeIdxRef.current = i;
    setPhoneVisible(false);
    setTimeout(() => { setActiveIdx(i); setPhoneVisible(true); }, 220);
  }, []);

  const glowColor = FEAT_COLORS[activeIdx % FEAT_COLORS.length];

  return (
    <div style={{ background: '#050508' }}>
      {/* Section header */}
      <div style={{ textAlign: 'center', paddingTop: 100, paddingBottom: 0 }}>
        <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>Everything you need</div>
        <h2 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, color: '#fff', lineHeight: 1.05 }}>One app.<br />Infinite gains.</h2>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: 1020, margin: '0 auto', padding: '0 48px', boxSizing: 'border-box' }}>

        {/* Left: scrolling feature sections */}
        <div>
          {FEATURES.map((f, i) => (
            <FeatureSection key={i} f={f} i={i} onActive={() => handleActive(i)} />
          ))}
        </div>

        {/* Right: sticky phone */}
        <div style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Animated glow behind phone */}
          <div style={{
            position: 'absolute',
            width: 320, height: 320,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${glowColor}22 0%, transparent 70%)`,
            transition: `background 1s ${EASE}`,
            pointerEvents: 'none',
          }} />

          {/* Phone with pop transition */}
          <div style={{
            opacity: phoneVisible ? 1 : 0,
            transform: phoneVisible ? 'scale(1) translateY(0px)' : 'scale(0.92) translateY(12px)',
            transition: `opacity 0.35s ${EASE}, transform 0.45s ${EASE}`,
          }}>
            <Phone feature={activeIdx} />
          </div>

          {/* Dot nav */}
          <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {FEATURES.map((_, i) => (
              <div key={i} style={{
                width: i === activeIdx ? 8 : 5,
                height: i === activeIdx ? 8 : 5,
                borderRadius: '50%',
                background: i === activeIdx ? glowColor : 'rgba(255,255,255,0.18)',
                transition: `all 0.4s ${EASE}`,
                boxShadow: i === activeIdx ? `0 0 6px ${glowColor}` : 'none',
              }} />
            ))}
          </div>
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
              <div style={{ fontSize: 52, fontWeight: 900, color: '#fff' }}>£24.99</div>
              <div style={{ fontSize: 14, color: '#71717a', marginBottom: 4 }}>per year</div>
              <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 600, marginBottom: 32 }}>Save 30% vs monthly</div>
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
