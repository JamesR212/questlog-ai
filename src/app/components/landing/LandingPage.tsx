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

// ─── Finance & Vices animated screen ────────────────────────────────────────

function FinanceVicesScreen() {
  const [showFinances, setShowFinances] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    function cycle(current: boolean) {
      t = setTimeout(() => {
        setShowFinances(!current);
        cycle(!current);
      }, 2800);
    }
    cycle(false);
    return () => clearTimeout(t);
  }, []);

  const accent = '#7c3aed';
  const tabBar = (vicesActive: boolean) => (
    <div style={{ display: 'flex', background: APP.surface2, borderRadius: 10, padding: 3, gap: 2, margin: '0 0 5px' }}>
      <div style={{ flex: 1, textAlign: 'center', padding: '3px 0', borderRadius: 7, background: vicesActive ? accent : 'transparent', fontSize: 7, color: vicesActive ? '#fff' : APP.tx3, fontWeight: vicesActive ? 700 : 400 }}>🚫 Vices</div>
      <div style={{ flex: 1, textAlign: 'center', padding: '3px 0', borderRadius: 7, background: !vicesActive ? accent : 'transparent', fontSize: 7, color: !vicesActive ? '#fff' : APP.tx3, fontWeight: !vicesActive ? 700 : 400 }}>💳 Finances</div>
    </div>
  );

  const bottomNav = (
    <div style={{ height: 40, borderTop: `1px solid ${APP.border}`, display: 'flex', alignItems: 'center', background: APP.bg, flexShrink: 0 }}>
      {[{e:'🏠',n:'Home'},{e:'🥗',n:'Food'},{e:'📅',n:'Calendar'},{e:'💰',n:'Finance',active:true},{e:'💪',n:'Training'}].map((tab: {e:string;n:string;active?:boolean}) => (
        <div key={tab.n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <div style={{ padding: tab.active ? '2px 5px' : undefined, borderRadius: tab.active ? 7 : undefined, background: tab.active ? '#2d1854' : 'transparent' }}>
            <span style={{ fontSize: 12 }}>{tab.e}</span>
          </div>
          <span style={{ fontSize: 5, color: tab.active ? '#a855f7' : APP.tx3, fontWeight: tab.active ? 700 : 400 }}>{tab.n}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Sliding panels */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          display: 'flex', width: '200%', height: '100%',
          transform: showFinances ? 'translateX(-50%)' : 'translateX(0)',
          transition: 'transform 0.52s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}>
          {/* ── Panel 1: Vices ── */}
          <div style={{ width: '50%', height: '100%', overflow: 'hidden', padding: '5px 8px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: APP.tx }}>Finance</div>
            <div style={{ fontSize: 6, color: APP.tx3, marginTop: -3, marginBottom: 1 }}>Track what you skip and manage your money</div>
            {tabBar(true)}
            {/* Total Saved */}
            <div style={{ background: APP.surface, border: `1px solid rgba(251,191,36,0.4)`, borderRadius: 10, padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 6, color: APP.tx3, marginBottom: 2 }}>Total Saved</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#f97316', lineHeight: 1 }}>£108.00</div>
                <div style={{ fontSize: 5.5, color: APP.tx3, marginTop: 2 }}>13 entries logged</div>
              </div>
              <span style={{ fontSize: 22 }}>💰</span>
            </div>
            {/* Token Bank */}
            <div style={{ background: APP.surface, border: `1px solid ${APP.border}`, borderRadius: 10, padding: '6px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11 }}>🪙</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: APP.tx }}>Token Bank</span>
                </div>
                <div style={{ background: APP.surface2, borderRadius: 6, padding: '2px 6px', fontSize: 7, color: '#f59e0b', fontWeight: 700 }}>4 tokens</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 5.5, color: APP.tx3 }}>Progress to next token</span>
                <span style={{ fontSize: 5.5, color: APP.tx3 }}>1 / 3 skips</span>
              </div>
              <div style={{ height: 4, background: APP.surface2, borderRadius: 2, overflow: 'hidden', marginBottom: 3 }}>
                <div style={{ height: '100%', width: '33%', background: '#f59e0b', borderRadius: 2 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 5, color: APP.tx3 }}>Every 3 skips = 1 token · 4 earned total</span>
                <span style={{ fontSize: 5, color: APP.tx3, textDecoration: 'underline' }}>edit</span>
              </div>
              <div style={{ borderTop: `1px solid ${APP.border}`, paddingTop: 4 }}>
                <div style={{ fontSize: 6, color: APP.tx3, marginBottom: 4 }}>Redeem a reward</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[{e:'🍺',n:'Pint'},{e:'🍔',n:'Takeaway'}].map(r => (
                    <div key={r.n} style={{ flex: 1, background: APP.surface2, borderRadius: 8, padding: '5px 4px', textAlign: 'center' }}>
                      <span style={{ fontSize: 14 }}>{r.e}</span>
                      <div style={{ fontSize: 6.5, fontWeight: 700, color: APP.tx, marginTop: 2 }}>{r.n}</div>
                      <div style={{ fontSize: 6, color: '#f59e0b', marginTop: 1 }}>3 🪙</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Panel 2: Finances ── */}
          <div style={{ width: '50%', height: '100%', overflow: 'hidden', padding: '5px 8px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: APP.tx }}>Finance</div>
            <div style={{ fontSize: 6, color: APP.tx3, marginTop: -3, marginBottom: 1 }}>Track what you skip and manage your money</div>
            {tabBar(false)}
            {/* Salary / Variable sub-tabs */}
            <div style={{ display: 'flex', background: APP.surface2, borderRadius: 8, padding: 2, gap: 2 }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '2px 0', borderRadius: 6, fontSize: 6, color: APP.tx3 }}>💼 Salary</div>
              <div style={{ flex: 1, textAlign: 'center', padding: '2px 0', borderRadius: 6, background: accent, fontSize: 6, color: '#fff', fontWeight: 700 }}>📅 Variable</div>
            </div>
            {/* Paychecks */}
            <div style={{ background: APP.surface, border: `1px solid ${APP.border}`, borderRadius: 10, padding: '6px 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
                <div>
                  <div style={{ fontSize: 7.5, fontWeight: 800, color: APP.tx }}>Paychecks This Month</div>
                  <div style={{ fontSize: 5.5, color: APP.tx3 }}>£988 received so far</div>
                </div>
                <div style={{ border: `1px dashed ${accent}`, borderRadius: 6, padding: '2px 5px', fontSize: 5.5, color: accent }}>+ Log paycheck</div>
              </div>
              <div style={{ background: APP.surface2, borderRadius: 7, padding: '4px 7px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
                <span style={{ fontSize: 6, color: APP.tx3 }}>23 Mar 26</span>
                <span style={{ fontSize: 6.5, fontWeight: 700, color: APP.tx }}>£987.6 ×</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginTop: 5 }}>
                {[{e:'✅',v:'£969',l:'After subs',c:'#22c55e'},{e:'📋',v:'£19',l:'Subscriptions',c:'#f59e0b'},{e:'📊',v:'2%',l:'Sub %',c:APP.tx}].map((s,i) => (
                  <div key={i} style={{ background: APP.surface2, borderRadius: 7, padding: '4px 3px', textAlign: 'center' }}>
                    <span style={{ fontSize: 10 }}>{s.e}</span>
                    <div style={{ fontSize: 7.5, fontWeight: 800, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 4.5, color: APP.tx3, marginTop: 1 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                <span style={{ fontSize: 5.5, color: APP.tx3 }}>Subscription spend looks healthy</span>
              </div>
            </div>
            {/* Paycheck Planner */}
            <div style={{ background: APP.surface, border: `1px solid ${APP.border}`, borderRadius: 10, padding: '6px 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 7.5, fontWeight: 800, color: APP.tx }}>Paycheck Planner</div>
                  <div style={{ fontSize: 5.5, color: APP.tx3 }}>Tap a bucket to manage where money goes</div>
                </div>
                <div style={{ display: 'flex', gap: 3, flexShrink: 0, marginLeft: 4 }}>
                  <div style={{ background: accent, borderRadius: 6, padding: '2px 5px', fontSize: 6, color: '#fff', fontWeight: 700 }}>50/30/20</div>
                  <div style={{ background: APP.surface2, borderRadius: 6, padding: '2px 5px', fontSize: 6, color: APP.tx3 }}>custom</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {bottomNav}
    </div>
  );
}

function Phone({ feature }: { feature: number }) {
  const screens = [
    // 0 — Habit Tracking / Home (real screenshot, with bottom nav)
    <div key="home" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Scrollable body */}
      <div style={{ flex: 1, padding: '6px 9px 4px', display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
        {/* Greeting */}
        <div>
          <div style={{ fontSize: 7, color: APP.tx2 }}>Good evening, James</div>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: -0.5 }}>
            <span style={{ color: APP.tx }}>G</span><span style={{ color: '#16a34a' }}>AI</span><span style={{ color: APP.tx }}>NN</span>
          </div>
        </div>
        {/* Two stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          <div style={card({ padding: '7px 8px' })}>
            <div style={{ fontSize: 13, marginBottom: 2 }}>🔥</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: APP.tx, lineHeight: 1 }}>1</div>
            <div style={{ fontSize: 6, color: APP.tx3, marginTop: 2 }}>day in a row</div>
          </div>
          <div style={{ ...card({ padding: '7px 8px' }), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <svg width="36" height="36" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke={APP.surface2} strokeWidth="4" />
              <circle cx="18" cy="18" r="14" fill="none" stroke="#16a34a" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 14 * 0.08} ${2 * Math.PI * 14 * 0.92}`}
                strokeLinecap="round" transform="rotate(-90 18 18)" />
              <text x="18" y="16" textAnchor="middle" fill={APP.tx3} fontSize="4">£</text>
              <text x="18" y="22" textAnchor="middle" fill={APP.tx} fontSize="6.5" fontWeight="bold">500</text>
            </svg>
            <div style={{ fontSize: 8, fontWeight: 700, color: '#16a34a' }}>8%</div>
            <div style={{ fontSize: 5.5, color: APP.tx3 }}>savings goal</div>
          </div>
        </div>
        {/* Weekly Snapshot */}
        <div style={card({ padding: '7px 8px' })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
            <svg width="26" height="26" viewBox="0 0 26 26" style={{ flexShrink: 0 }}>
              <circle cx="13" cy="13" r="10" fill="none" stroke={APP.surface2} strokeWidth="3" />
              <circle cx="13" cy="13" r="10" fill="none" stroke="#16a34a" strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 10 * 0.75} ${2 * Math.PI * 10 * 0.25}`}
                strokeLinecap="round" transform="rotate(-90 13 13)" />
              <text x="13" y="17" textAnchor="middle" fill={APP.tx} fontSize="7" fontWeight="bold">75</text>
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 7.5, fontWeight: 800, color: APP.tx }}>Weekly Snapshot</div>
              <div style={{ fontSize: 5.5, color: '#16a34a', fontWeight: 600 }}>75% accuracy this week</div>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {['Detailed','Edit'].map(l => (
                <div key={l} style={{ fontSize: 5, color: APP.tx2, border: `1px solid ${APP.border}`, borderRadius: 4, padding: '2px 3px' }}>{l}</div>
              ))}
            </div>
          </div>
          {/* Day headers */}
          <div style={{ display: 'flex', marginBottom: 3, paddingLeft: 26 }}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i) => (
              <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: 5, color: i === 0 ? '#7c3aed' : APP.tx3, fontWeight: i === 0 ? 700 : 400 }}>{d}</div>
            ))}
          </div>
          {/* Rows */}
          {[
            { e: '🌙', n: 'Sleep',     cells: [null,     null, null, null, null, null, null], c: '#16a34a' },
            { e: '👟', n: 'Steps',     cells: ['52.0k',  null, null, null, null, null, null], c: '#16a34a' },
            { e: '🌅', n: 'Wake Up',   cells: [true,     null, null, null, null, null, null], c: '#16a34a' },
            { e: '🥗', n: 'Nutrition', cells: ['960',    null, null, null, null, null, null], c: '#f59e0b' },
            { e: '💧', n: 'Hydration', cells: [true,     null, null, null, null, null, null], c: '#f59e0b' },
          ].map((row, ri) => (
            <div key={ri} style={{ display: 'flex', alignItems: 'center', marginBottom: ri < 4 ? 2 : 0 }}>
              <div style={{ width: 26, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                <span style={{ fontSize: 8 }}>{row.e}</span>
                <span style={{ fontSize: 5, color: APP.tx3 }}>{row.n}</span>
              </div>
              {row.cells.map((c, ci) => (
                <div key={ci} style={{ flex: 1, height: 13, borderRadius: 3, margin: '0 1px', background: c ? row.c : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {c && typeof c === 'string' && <span style={{ fontSize: 4.5, color: '#fff', fontWeight: 700 }}>{c}</span>}
                </div>
              ))}
            </div>
          ))}
          {/* Legend */}
          <div style={{ display: 'flex', gap: 5, marginTop: 4, paddingTop: 3, borderTop: `1px solid ${APP.border}` }}>
            {[{c:'#16a34a',l:'Done'},{c:'#f59e0b',l:'Late'},{c:'#ef4444',l:'Missed'},{c:'',l:'N/A'}].map(({c,l}) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {c && <div style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />}
                <span style={{ fontSize: 5, color: APP.tx3 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Bottom nav bar */}
      <div style={{ height: 42, borderTop: `1px solid ${APP.border}`, display: 'flex', alignItems: 'center', background: APP.bg, flexShrink: 0 }}>
        {[
          { e: '🏠', n: 'Home',     active: true },
          { e: '🥗', n: 'Food',     active: false },
          { e: '📅', n: 'Calendar', active: false },
          { e: '💰', n: 'Finance',  active: false },
          { e: '💪', n: 'Training', active: false },
        ].map(tab => (
          <div key={tab.n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <div style={{ width: tab.active ? 28 : undefined, padding: tab.active ? '3px 6px' : undefined, borderRadius: tab.active ? 8 : undefined, background: tab.active ? '#3b1f6b' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13 }}>{tab.e}</span>
            </div>
            <span style={{ fontSize: 5, color: tab.active ? '#a855f7' : APP.tx3, fontWeight: tab.active ? 700 : 400 }}>{tab.n}</span>
          </div>
        ))}
      </div>
    </div>,

    // 1 — Customise (placeholder; sticky column shows CustomisePhonesPair instead)
    <div key="customise" style={{ display: 'none' }} />,

    // 2 — Gym & Fitness (Training Plans tab, AI-generated plan)
    <div key="gym" style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: APP.tx }}>Training</div>
        <div style={{ fontSize: 6, color: APP.tx3, marginTop: 1 }}>0/0 habits · 0 sessions · +20 XP habits · +75 XP workouts</div>
      </div>
      {/* Tab bar */}
      <div style={{ display: 'flex', background: APP.surface2, borderRadius: 10, padding: 3, gap: 2 }}>
        {[{e:'✅',n:'Habits'},{e:'🤸',n:'Plans',active:true},{e:'👟',n:'Steps'},{e:'📊',n:'Stats'},{e:'🗺️',n:'Track'}].map((t,i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', padding: '3px 1px', borderRadius: 7, background: t.active ? APP.accent : 'transparent' }}>
            <div style={{ fontSize: 7 }}>{t.e}</div>
            <div style={{ fontSize: 5, color: t.active ? '#fff' : APP.tx3, fontWeight: t.active ? 700 : 400, lineHeight: 1.2 }}>{t.n}</div>
          </div>
        ))}
      </div>
      {/* AI-Generated Plan card */}
      <div style={{ border: `1.5px solid rgba(255,255,255,0.25)`, borderRadius: 11, overflow: 'hidden' }}>
        {/* Card header */}
        <div style={{ padding: '5px 8px', borderBottom: `1px solid rgba(255,255,255,0.12)`, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 8 }}>✨</span>
          <span style={{ fontSize: 7, fontWeight: 700, color: APP.tx }}>AI-Generated Plan — Review before saving</span>
        </div>
        {/* Plan body */}
        <div style={{ padding: '5px 8px', background: APP.surface }}>
          {/* Plan title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
            <span style={{ fontSize: 12 }}>👟</span>
            <div>
              <div style={{ fontSize: 8, fontWeight: 800, color: APP.tx }}>First Steps Run</div>
              <div style={{ fontSize: 6, color: APP.tx3 }}>Mon · 7:00am – 8:00am</div>
            </div>
          </div>
          {/* Exercises */}
          {[
            { n: 'Rest / Walk — 10 min (Warm-up)',              s: '1×1 BW' },
            { n: 'Easy Run — 5 min',                            s: '1×1 BW' },
            { n: 'Run/Walk Intervals — 18 min',                 s: '1×1 BW' },
            { n: 'Rest / Walk — 7 min (Cool-down)',             s: '1×1 BW' },
          ].map((ex, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 3, marginBottom: 3, borderBottom: i < 3 ? `1px solid ${APP.border}` : 'none' }}>
              <span style={{ fontSize: 6, color: APP.tx2, flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' }}>{ex.n}</span>
              <span style={{ fontSize: 6, color: APP.tx3, flexShrink: 0, marginLeft: 4 }}>{ex.s}</span>
            </div>
          ))}
          {/* Buttons */}
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
            <div style={{ flex: 1, background: APP.accent, borderRadius: 7, padding: '4px 0', textAlign: 'center', fontSize: 7, fontWeight: 700, color: '#fff' }}>Save to My Plans</div>
            <div style={{ background: APP.surface2, borderRadius: 7, padding: '4px 8px', fontSize: 7, color: APP.tx2 }}>Discard</div>
          </div>
        </div>
      </div>
      {/* Bottom cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        <div style={{ ...card({ padding: '7px 8px' }) }}>
          <div style={{ fontSize: 12, marginBottom: 3 }}>✨</div>
          <div style={{ fontSize: 7, fontWeight: 800, color: APP.tx, marginBottom: 2 }}>AI Plan</div>
          <div style={{ fontSize: 6, color: APP.tx3, lineHeight: 1.3 }}>Answer a few questions, we&apos;ll build a tailored plan</div>
        </div>
        <div style={{ ...card({ padding: '7px 8px', background: APP.surface2 }) }}>
          <div style={{ fontSize: 12, marginBottom: 3 }}>🔧</div>
          <div style={{ fontSize: 7, fontWeight: 800, color: APP.tx, marginBottom: 2 }}>Custom Plan</div>
          <div style={{ fontSize: 6, color: APP.tx3, lineHeight: 1.3 }}>Build your own plan from scratch</div>
        </div>
      </div>
    </div>,

    // 2 — AI Nutrition (matching real app screenshot)
    <div key="nutrition" style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>

      {/* Today's Progress */}
      <div style={{ background: APP.surface, border: `1px solid ${APP.border}`, borderRadius: 11, padding: '6px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 7, fontWeight: 800, color: APP.tx }}>Today&apos;s Progress</span>
          <span style={{ fontSize: 5.5, color: APP.tx3 }}>960/2000 kcal</span>
        </div>
        {([
          { l: 'Calories', v: '960/2000kcal', pct: 0.48, c: '#a855f7' },
          { l: 'Protein',  v: '34/150g',      pct: 0.23, c: '#3b82f6' },
          { l: 'Carbs',    v: '103/200g',     pct: 0.52, c: '#eab308' },
          { l: 'Fat',      v: '49/65g',       pct: 0.75, c: '#22c55e' },
          { l: 'Sugar',    v: '14/50g',       pct: 0.28, c: '#ec4899' },
        ] as {l:string;v:string;pct:number;c:string}[]).map((m, i) => (
          <div key={i} style={{ marginBottom: i < 4 ? 3 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
              <span style={{ fontSize: 5.5, color: APP.tx3 }}>{m.l}</span>
              <span style={{ fontSize: 5.5, color: APP.tx2 }}>{m.v}</span>
            </div>
            <div style={{ height: 2.5, background: APP.surface2, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${m.pct*100}%`, background: m.c, borderRadius: 2 }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Meals */}
      <div style={{ background: APP.surface, border: `1px solid ${APP.border}`, borderRadius: 11, padding: '6px 8px' }}>
        {/* Header + buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 7, fontWeight: 800, color: APP.tx, flexShrink: 0 }}>Today&apos;s Meals</span>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            {['Library','Manual+'].map((t,i) => (
              <div key={i} style={{ background: APP.surface2, border: `1px solid ${APP.border}`, borderRadius: 5, padding: '2px 4px', fontSize: 5, color: APP.tx2 }}>{t}</div>
            ))}
          </div>
        </div>
        {/* AI Smart Log row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 5.5, color: APP.tx2, fontWeight: 700 }}>⚡ AI SMART LOG</span>
          <div style={{ background: APP.surface2, border: `1px solid ${APP.border}`, borderRadius: 5, padding: '2px 5px', fontSize: 5, color: APP.tx2 }}>📷 Photo</div>
        </div>
        {/* Input + AI */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0, background: APP.surface2, border: `1px solid ${APP.border}`, borderRadius: 7, padding: '4px 6px', fontSize: 5.5, color: APP.tx3, overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' }}>e.g. 2 scrambled eggs on toast...</div>
          <div style={{ flexShrink: 0, background: APP.accent, borderRadius: 7, padding: '4px 7px', fontSize: 6.5, fontWeight: 700, color: '#fff' }}>⚡ AI</div>
        </div>
        {/* Meal entry card */}
        <div style={{ background: APP.surface2, border: `1px solid ${APP.border}`, borderRadius: 8, padding: '5px 7px' }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 6, fontWeight: 700, color: APP.tx, lineHeight: 1.3, marginBottom: 2 }}>3 Scrambled Eggs with Baked Beans, Chips, and Side Salad</div>
              <div style={{ fontSize: 5, color: APP.tx3, overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' }}>960 kcal · P:34g · C:103g · F:49g · S:14g</div>
            </div>
            <span style={{ fontSize: 7, color: APP.tx3, flexShrink: 0, marginTop: 1 }}>×</span>
          </div>
        </div>
      </div>

      {/* Vitamins & Minerals */}
      <div style={{ background: APP.surface, border: `1px solid ${APP.border}`, borderRadius: 11, padding: '6px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 10, flexShrink: 0 }}>🧬</span>
            <span style={{ fontSize: 7, fontWeight: 700, color: APP.tx, overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' }}>Vitamins &amp; Minerals</span>
          </div>
          <span style={{ fontSize: 6.5, color: APP.tx3, flexShrink: 0, marginLeft: 4 }}>54%</span>
        </div>
        <div style={{ height: 3, background: APP.surface2, borderRadius: 2, marginBottom: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '54%', background: '#eab308', borderRadius: 2 }}/>
        </div>
        <div style={{ fontSize: 5.5, color: APP.tx3 }}>14 of 14 nutrients tracked today</div>
      </div>

    </div>,

    // 3 — Smart Hydration
    <div key="hydration" style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* Food / Drink pill switcher */}
      <div style={{ display: 'flex', background: APP.surface2, borderRadius: 10, padding: 3 }}>
        <div style={{ flex: 1, textAlign: 'center' as const, fontSize: 8, color: APP.tx3, padding: '4px 0', borderRadius: 8 }}>🥗 Food</div>
        <div style={{ flex: 1, textAlign: 'center' as const, fontSize: 8, color: '#fff', fontWeight: 700, padding: '4px 0', borderRadius: 8, background: APP.accent }}>💧 Drink</div>
      </div>

      {/* Main hydration card */}
      <div style={{ ...card({ padding: '10px 9px' }) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          {/* Ring */}
          <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
            <svg viewBox="0 0 52 52" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
              <circle cx="26" cy="26" r="21" fill="none" stroke={APP.surface2} strokeWidth="5.5"/>
              <circle cx="26" cy="26" r="21" fill="none" stroke="#3b82f6" strokeWidth="5.5"
                strokeDasharray={`${2*Math.PI*21*0.48} ${2*Math.PI*21}`} strokeLinecap="round"/>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: APP.tx, lineHeight: 1 }}>963</span>
              <span style={{ fontSize: 5.5, color: APP.tx3 }}>of 2.0L</span>
            </div>
          </div>
          {/* Right col — minWidth:0 prevents overflow */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: APP.tx, lineHeight: 1.25 }}>48% of daily goal</div>
            <div style={{ fontSize: 6.5, color: APP.tx3, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>3 drinks logged today</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <div style={{ ...card({ padding: '3px 5px', background: APP.surface2 }), fontSize: 6, color: APP.tx2, textAlign: 'center' as const, lineHeight: 1.3, flexShrink: 0 }}>{'Set\ngoal'}</div>
              <div style={{ flex: 1, minWidth: 0, ...card({ padding: '3px 4px', borderColor: `${APP.accent}66`, background: `${APP.accent}12` }), fontSize: 5.5, color: APP.accent, fontWeight: 600, textAlign: 'center' as const, overflow: 'hidden' }}>✨ AI rec.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick-add buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
        {['+150ml','+250ml','+330ml','+500ml'].map((label, i) => (
          <div key={i} style={{ ...card({ padding: '6px 0', textAlign: 'center' as const, background: APP.surface2 }), overflow: 'hidden' }}>
            <span style={{ fontSize: 6.5, color: APP.tx, fontWeight: 700 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Custom amount + Add */}
      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ flex: 1, minWidth: 0, ...card({ padding: '6px 8px', background: APP.surface2 }), fontSize: 7, color: APP.tx3, overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' }}>Custom amount (ml)…</div>
        <div style={{ flexShrink: 0, background: APP.accent, borderRadius: 9, padding: '6px 10px', fontSize: 7.5, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center' }}>Add</div>
      </div>

      {/* Today's log */}
      <div style={{ fontSize: 8.5, fontWeight: 800, color: APP.tx }}>Today&apos;s log</div>
      <div style={card({ padding: 0, overflow: 'hidden' })}>
        {[330,133,500].map((ml, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '6px 9px', borderBottom: i < 2 ? `1px solid ${APP.border}` : 'none' }}>
            <span style={{ fontSize: 10, marginRight: 7, flexShrink: 0 }}>💧</span>
            <span style={{ flex: 1, fontSize: 8, color: APP.tx }}>{ml} ml</span>
            <span style={{ fontSize: 8, color: APP.tx3, flexShrink: 0 }}>×</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 6.5, color: APP.tx3, textAlign: 'right' as const }}>Total: 963 ml</div>
    </div>,

    // 4 — Sleep & Wake (calendar + quests, matching real app screenshot)
    <div key="sleep" style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* Sleep / Wake quest rows */}
      <div style={card({ padding: '0' })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px', borderBottom: `1px solid ${APP.border}` }}>
          <span style={{ fontSize: 13 }}>🌙</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: APP.tx }}>Sleep</div>
            <div style={{ fontSize: 6, color: APP.tx3 }}>11:00pm · <span style={{ color: APP.accent }}>tap to change</span></div>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            <div style={{ fontSize: 6, color: '#fff', background: '#16a34a', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>Log</div>
            <div style={{ fontSize: 6, color: '#fff', background: '#dc2626', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>Miss</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px' }}>
          <span style={{ fontSize: 13 }}>🌅</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: APP.tx }}>Wake Up</div>
            <div style={{ fontSize: 6 }}><span style={{ color: APP.tx3 }}>7:00am · </span><span style={{ color: '#16a34a' }}>Done ✓</span></div>
          </div>
          <div style={{ fontSize: 6, color: APP.tx3 }}>Clear</div>
        </div>
      </div>

      {/* Mini calendar — March 2026 */}
      <div style={card({ padding: '7px 8px' })}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: APP.tx3 }}>‹ ›</span>
          <span style={{ fontSize: 8, fontWeight: 800, color: APP.tx }}>March 2026</span>
          <span style={{ fontSize: 6, color: APP.accent, fontWeight: 700, background: `${APP.accent}22`, padding: '1px 4px', borderRadius: 4 }}>Today</span>
        </div>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 5.5, color: APP.tx3, fontWeight: 600 }}>{d}</div>
          ))}
        </div>
        {/* Weeks — March 2026 starts Sunday */}
        {([
          [1,2,3,4,5,6,7],
          [8,9,10,11,12,13,14],
          [15,16,17,18,19,20,21],
          [22,23,24,25,26,27,28],
          [29,30,31,0,0,0,0],
        ] as number[][]).map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 1 }}>
            {week.map((day, di) => {
              const isToday = day === 23;
              const hasThree = [2,9,16,23,26,30].includes(day);
              return (
                <div key={di} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 6.5, fontWeight: 600, width: 13, height: 13, borderRadius: '50%',
                    margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isToday ? APP.accent : 'transparent',
                    color: isToday ? '#fff' : day ? APP.tx : 'transparent',
                  }}>{day || ''}</div>
                  {day > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 0.8, marginTop: 0.5 }}>
                      {hasThree ? (
                        <>
                          <div style={{ width: 1.8, height: 1.8, borderRadius: '50%', background: '#16a34a' }}/>
                          <div style={{ width: 1.8, height: 1.8, borderRadius: '50%', background: '#16a34a' }}/>
                          <div style={{ width: 1.8, height: 1.8, borderRadius: '50%', background: isToday ? APP.accent : '#16a34a' }}/>
                        </>
                      ) : (
                        <div style={{ width: 1.8, height: 1.8, borderRadius: '50%', background: APP.tx3, opacity: 0.4 }}/>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Day accuracy ring */}
      <div style={{ ...card(), display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', width: 30, height: 30, flexShrink: 0 }}>
          <svg viewBox="0 0 30 30" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="15" cy="15" r="11" fill="none" stroke={APP.surface2} strokeWidth="3.5"/>
            <circle cx="15" cy="15" r="11" fill="none" stroke="#3b82f6" strokeWidth="3.5"
              strokeDasharray={`${2*Math.PI*11*0.5} ${2*Math.PI*11}`} strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#3b82f6' }}>50%</div>
          <div style={{ fontSize: 6.5, color: APP.tx3 }}>Day accuracy</div>
        </div>
      </div>
    </div>,

    // 5 — Steps & GPS (Brighton seafront run)
    <div key="steps" style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
        <span style={{ fontSize: 16 }}>🏃</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: APP.tx }}>Run Complete</div>
          <div style={{ fontSize: 7, color: APP.tx3 }}>Brighton Seafront · 21:17</div>
        </div>
      </div>
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
        {[
          { v: '5.0 km', l: 'Distance' },
          { v: '28:32', l: 'Time' },
          { v: '5:42 /km', l: 'Avg Pace' },
          { v: '285 kcal', l: 'Calories (est.)' },
          { v: '8 m', l: 'Elevation Gain' },
          { v: '1 🏢', l: 'Floors Climbed' },
        ].map((s, i) => (
          <div key={i} style={card({ padding: '7px 9px' })}>
            <div style={{ fontSize: 12, fontWeight: 800, color: APP.tx }}>{s.v}</div>
            <div style={{ fontSize: 6, color: APP.tx3 }}>{s.l}</div>
          </div>
        ))}
      </div>
      {/* Map — Brighton seafront route (Hove → Marina) */}
      <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${APP.border}` }}>
        <svg viewBox="0 0 140 92" style={{ width: '100%', display: 'block' }}>
          {/* Land background (OSM #f2efe9) */}
          <rect width="140" height="92" fill="#f2efe9"/>

          {/* ── City block grid (north of seafront road) ── */}
          {/* Background streets grid */}
          <rect x="0" y="0" width="140" height="42" fill="#f2efe9"/>
          {/* N-S streets */}
          {[13,26,38,52,62,70,82,97,110,122,132].map((x,i) => (
            <rect key={i} x={x} y={0} width={1.5} height={42} fill="#ffffff" opacity="0.9"/>
          ))}
          {/* E-W streets within block */}
          <rect x="0" y="14" width="140" height="1.5" fill="#ffffff" opacity="0.8"/>
          <rect x="0" y="27" width="140" height="1.5" fill="#ffffff" opacity="0.8"/>
          {/* Building blocks */}
          {[
            [1,1,11,12],[14,1,11,12],[27,1,10,12],[39,1,11,12],[53,1,8,12],[63,1,6,12],[71,1,10,12],[83,1,13,12],[98,1,11,12],[111,1,10,12],[123,1,16,12],
            [1,16,11,10],[14,16,11,10],[27,16,10,10],[39,16,11,10],[53,16,8,10],[63,16,6,10],[71,16,10,10],[83,16,6,10],[98,16,11,10],[111,16,10,10],[123,16,16,10],
            [1,29,11,11],[14,29,11,11],[27,29,10,11],[39,29,11,11],[53,29,8,11],[63,29,6,11],[71,29,10,11],[83,29,6,11],[98,29,11,11],[111,29,10,11],[123,29,16,11],
          ].map(([x,y,w,h],i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill={i%3===0?'#d9d0c9':i%3===1?'#d4cbc4':'#ddd4cc'} rx="0.5"/>
          ))}

          {/* Old Steine gardens (green, north of Palace Pier) */}
          <rect x="83" y="1" width="13" height="39" fill="#c8dba8" rx="1"/>
          <rect x="84" y="2" width="11" height="37" fill="#d0e2b0" rx="1"/>

          {/* West St wider road gap at x=52 */}
          <rect x="51" y="0" width="3" height="42" fill="#ffffff"/>

          {/* ── A259 Kings Road / Marine Parade (seafront road) ── */}
          {/* Footway behind */}
          <rect x="0" y="41" width="140" height="9" fill="#ebe6dc"/>
          {/* Road surface */}
          <rect x="0" y="43" width="140" height="6" fill="#ffffff"/>
          {/* Centre dashes */}
          {[5,17,29,41,53,65,77,89,101,113,125].map((x,i) => (
            <rect key={i} x={x} y={45.5} width={7} height={0.8} fill="#e0dcd5"/>
          ))}

          {/* ── Lower promenade ── */}
          <rect x="0" y="49" width="140" height="6" fill="#f0e8d8"/>

          {/* ── Beach (pebble) ── */}
          <rect x="0" y="55" width="140" height="9" fill="#ddd0a8"/>

          {/* ── Sea (OSM #aad3df) ── */}
          <rect x="0" y="64" width="140" height="28" fill="#aad3df"/>

          {/* Wave lines */}
          <path d="M0 70 Q17 68 35 70 Q52 72 70 70 Q87 68 105 70 Q122 72 140 70" stroke="#88bdd4" strokeWidth="0.8" fill="none"/>
          <path d="M0 78 Q20 76 40 78 Q60 80 80 78 Q100 76 120 78 Q130 80 140 78" stroke="#88bdd4" strokeWidth="0.7" fill="none" opacity="0.6"/>

          {/* ── West Pier ruins (x≈28, ~1.6km west of Palace Pier) ── */}
          {/* Pier deck */}
          <rect x="25.5" y="55" width="4" height="14" fill="#b8a898" opacity="0.85"/>
          {/* Ruined pavilion */}
          <rect x="23" y="66" width="9" height="5" fill="#b8a898" opacity="0.8" rx="0.5"/>
          {/* Ruin breakup */}
          <rect x="23" y="68" width="3" height="3" fill="#c8b8a8" opacity="0.4"/>
          <rect x="30" y="67" width="2" height="2" fill="#c8b8a8" opacity="0.3"/>
          {/* i360 tower (slim vertical, just left of West Pier) */}
          <rect x="22" y="30" width="1.2" height="13" fill="#707880" opacity="0.75"/>
          <ellipse cx="22.6" cy="36" rx="3" ry="1.5" fill="#808890" opacity="0.5"/>

          {/* ── Palace Pier (x≈90, opposite Old Steine) ── */}
          {/* Entrance gates */}
          <rect x="87.5" y="52" width="7" height="4" fill="#c8a060" rx="0.5"/>
          {/* Pier walkway */}
          <rect x="89" y="55" width="4" height="20" fill="#c8a060"/>
          {/* Pier head pavilion */}
          <rect x="85.5" y="73" width="11" height="7" fill="#c8a060" rx="1"/>
          {/* Pier head roof detail */}
          <rect x="86.5" y="71" width="9" height="3" fill="#d4aa70" rx="0.5"/>
          {/* Pier supports */}
          {[57,60,63,66,69,72].map((y,i) => (
            <line key={i} x1="89" y1={y} x2="87" y2={y+1} stroke="#b09050" strokeWidth="0.6" opacity="0.7"/>
          ))}

          {/* ── Labels ── */}
          <text x="28" y="51.5" textAnchor="middle" fontSize="3" fill="#776655" fontFamily="sans-serif" fontWeight="600">West Pier</text>
          <text x="91" y="51.5" textAnchor="middle" fontSize="3" fill="#554433" fontFamily="sans-serif" fontWeight="600">Palace Pier</text>
          <text x="70" y="40" textAnchor="middle" fontSize="3.5" fill="#888880" fontFamily="sans-serif">Kings Road · Marine Parade</text>
          <text x="89" y="12" textAnchor="middle" fontSize="3" fill="#6a8a50" fontFamily="sans-serif">Old Steine</text>

          {/* ── Run route (Hove → Marina, along A259) ── */}
          <path d="M 7 46 L 133 46" stroke="#16a34a" strokeWidth="2.8" strokeLinecap="round" opacity="0.9"/>
          {/* Glowing halo */}
          <path d="M 7 46 L 133 46" stroke="#4ade80" strokeWidth="5" strokeLinecap="round" opacity="0.2"/>

          {/* Start (Hove, west) */}
          <circle cx="7" cy="46" r="4" fill="#22c55e"/>
          <circle cx="7" cy="46" r="2" fill="#ffffff"/>
          {/* End (Marina, east) */}
          <circle cx="133" cy="46" r="4" fill="#ef4444"/>
          <circle cx="133" cy="46" r="2" fill="#ffffff"/>
        </svg>
      </div>
      {/* XP reward */}
      <div style={{ ...card({ background: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.25)', padding: '5px 9px' }), display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 13 }}>⚡</span>
        <div>
          <div style={{ fontSize: 8, color: '#4ade80', fontWeight: 700 }}>+140 XP · +8 DEX</div>
          <div style={{ fontSize: 7, color: APP.tx3 }}>5 km run · personal best pace!</div>
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

    // 7 — Finance & Vices (animated slide between Vices and Finances)
    <FinanceVicesScreen key="finance" />,
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
    icon: '🎨',
    title: 'Customise Your Way',
    subtitle: 'Your app, your rules',
    desc: 'Toggle sections on or off, pick your theme, and choose exactly which stats appear on your dashboard. GAINN fits around your life — not the other way around.',
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
    desc: 'Step counter, daily goals, and GPS activity recording for runs, walks, and cycles — with route maps and floors climbed. Move more, level up faster.',
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
    icon: '💰',
    title: 'Finance & Vices',
    subtitle: 'Money and habits, tracked',
    desc: 'Budget by needs, wants and savings. Log vices like takeaways and drinks — every one avoided earns you gold.',
    color: '#16a34a',
  },
];

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const FEAT_COLORS = ['#16a34a','#a855f7','#3b82f6','#f97316','#06b6d4','#8b5cf6','#f43f5e','#10b981','#eab308'];

// ─── Customise phone (single phone — settings toggle + nav animate together) ────

const NAV_TABS = [
  { e: '🏠', n: 'Home'     },
  { e: '🥗', n: 'Food'     },
  { e: '📅', n: 'Calendar' },
  { e: '💰', n: 'Finance'  },
  { e: '💪', n: 'Training' },
];

const SECTIONS_DEMO = [
  { e: '🥗', n: 'Food'     },
  { e: '📅', n: 'Calendar' },
  { e: '💰', n: 'Finance'  },
  { e: '✅', n: 'Habits'   },
  { e: '💪', n: 'Fitness'  },
];

function CustomisePhone() {
  const [showFinance, setShowFinance] = useState(true);
  const [tapping,    setTapping]    = useState(false);

  // Sequence: wait 1.8s → show tap → 350ms → toggle off → wait 1.8s → show tap → 350ms → toggle on → repeat
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    function cycle(current: boolean) {
      t = setTimeout(() => {
        setTapping(true);
        t = setTimeout(() => {
          setTapping(false);
          const next = !current;
          setShowFinance(next);
          cycle(next);
        }, 300);
      }, 1530);
    }
    cycle(true);
    return () => clearTimeout(t);
  }, []);

  const accent = '#a855f7';

  return (
    <div style={{ width: 160, height: 320, background: '#0d0d14', borderRadius: 28, border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.7)', position: 'relative', overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Notch */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 52, height: 14, background: '#0d0d14', borderRadius: '0 0 12px 12px', zIndex: 10, borderLeft: '2px solid rgba(255,255,255,0.1)', borderRight: '2px solid rgba(255,255,255,0.1)', borderBottom: '2px solid rgba(255,255,255,0.1)' }} />
      {/* Status bar */}
      <div style={{ height: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 13px', flexShrink: 0 }}>
        <span style={{ fontSize: 7, color: '#fff', fontWeight: 600 }}>9:41</span>
        <span style={{ fontSize: 7, color: '#fff' }}>●●●</span>
      </div>

      {/* Settings screen */}
      <div style={{ flex: 1, padding: '4px 10px 0', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#f0f0f8' }}>Settings</div>
        <div style={{ fontSize: 6, color: '#6b6b8a', marginBottom: 1 }}>Customise your GAINN experience</div>

        {/* Visible Sections card */}
        <div style={{ fontSize: 7, fontWeight: 700, color: '#f0f0f8', marginBottom: 1 }}>Visible Sections</div>
        <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          {SECTIONS_DEMO.map((s, i) => {
            const isFinance = s.n === 'Finance';
            const on = !isFinance || showFinance;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px', borderBottom: i < SECTIONS_DEMO.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', position: 'relative' }}>
                <span style={{ fontSize: 10 }}>{s.e}</span>
                <span style={{ flex: 1, fontSize: 7, color: on ? '#f0f0f8' : '#6b6b8a', fontWeight: 500, transition: 'color 0.4s ease' }}>{s.n}</span>
                {/* Toggle */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {/* Tap ripple on Finance row */}
                  {isFinance && tapping && (
                    <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: 'rgba(168,85,247,0.25)', animation: 'none', zIndex: 5 }} />
                  )}
                  <div style={{ width: 26, height: 14, borderRadius: 7, background: on ? accent : '#252535', position: 'relative', transition: 'background 0.4s ease' }}>
                    <div style={{ position: 'absolute', top: 2, left: on ? 12 : 2, width: 10, height: 10, borderRadius: '50%', background: '#fff', transition: 'left 0.4s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>


      </div>

      {/* Bottom nav — Finance tab slides in/out in sync with toggle */}
      <div style={{ height: 44, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', background: '#0d0d14', overflow: 'hidden', flexShrink: 0 }}>
        {NAV_TABS.map((tab) => {
          const isFinance = tab.n === 'Finance';
          const visible = !isFinance || showFinance;
          return (
            <div
              key={tab.n}
              style={{
                flex: visible ? 1 : 0,
                maxWidth: visible ? '100px' : '0px',
                opacity: visible ? 1 : 0,
                overflow: 'hidden',
                transition: 'flex 0.45s ease, max-width 0.45s ease, opacity 0.35s ease',
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <span style={{ fontSize: 13 }}>{tab.e}</span>
              <span style={{ fontSize: 5, color: '#6b6b8a', whiteSpace: 'nowrap' as const }}>{tab.n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

          {/* Phone(s) with pop transition */}
          <div style={{
            opacity: phoneVisible ? 1 : 0,
            transform: phoneVisible ? 'scale(1) translateY(0px)' : 'scale(0.92) translateY(12px)',
            transition: `opacity 0.35s ${EASE}, transform 0.45s ${EASE}`,
          }}>
            {activeIdx === 1 ? <CustomisePhone /> : <Phone feature={activeIdx} />}
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

// ─── Theme Showcase ───────────────────────────────────────────────────────────

const THEME_PHONES = [
  { label: 'Dark',  bg: '#13131f', surface: '#1e1e2e', surface2: '#252535', accent: '#7c3aed', tx: '#f0f0f8', tx2: '#a1a1bb', tx3: '#6b6b8a', border: 'rgba(255,255,255,0.08)' },
  { label: 'Light', bg: '#f5f5f7', surface: '#ffffff', surface2: '#ebebef', accent: '#6d28d9', tx: '#1a1a2e', tx2: '#4a4a6a', tx3: '#8a8aaa', border: 'rgba(0,0,0,0.08)' },
  { label: 'Pink',  bg: '#fce4f0', surface: '#fff0f7', surface2: '#fbd5e8', accent: '#db2777', tx: '#1a0a12', tx2: '#6b3050', tx3: '#9b6080', border: 'rgba(219,39,119,0.15)' },
  { label: 'Blue',  bg: '#dbeafe', surface: '#eff6ff', surface2: '#dbeafe', accent: '#2563eb', tx: '#0a1a3a', tx2: '#304070', tx3: '#6080a0', border: 'rgba(37,99,235,0.15)' },
  { label: 'Green', bg: '#dcfce7', surface: '#f0fdf4', surface2: '#dcfce7', accent: '#16a34a', tx: '#0a1a12', tx2: '#205030', tx3: '#408060', border: 'rgba(22,163,74,0.15)' },
];

function ThemePhoneMini({ t }: { t: typeof THEME_PHONES[0] }) {
  const r = 11; const circ = 2 * Math.PI * r;
  return (
    <div style={{ width: 130, background: t.bg, borderRadius: 26, border: `2px solid ${t.border}`, overflow: 'hidden', boxShadow: `0 24px 60px rgba(0,0,0,0.35)`, boxSizing: 'border-box' as const }}>
      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px 4px', fontSize: 6, color: t.tx3, fontWeight: 600 }}>
        <span>20:55</span><span>48%</span>
      </div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 10px 6px', borderBottom: `1px solid ${t.border}` }}>
        <span style={{ fontSize: 11, fontWeight: 900 }}>
          <span style={{ color: t.tx }}>G</span><span style={{ color: '#16a34a' }}>AI</span><span style={{ color: t.tx }}>NN</span>
        </span>
        <span style={{ fontSize: 5.5, color: t.tx3 }}>Mon 23 Mar</span>
      </div>
      {/* Greeting */}
      <div style={{ padding: '6px 10px 4px' }}>
        <div style={{ fontSize: 5.5, color: t.tx2 }}>Good evening, James</div>
        <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: -0.5 }}>
          <span style={{ color: t.tx }}>G</span><span style={{ color: '#16a34a' }}>AI</span><span style={{ color: t.tx }}>NN</span>
        </div>
      </div>
      {/* Two cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: '0 8px 6px' }}>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: '6px' }}>
          <div style={{ fontSize: 11, marginBottom: 2 }}>🔥</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: t.tx }}>1</div>
          <div style={{ fontSize: 5, color: t.tx3 }}>day in a row</div>
        </div>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 30, height: 30 }}>
            <svg width="30" height="30" viewBox="0 0 30 30" style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
              <circle cx="15" cy="15" r={r} fill="none" stroke={t.surface2} strokeWidth="3"/>
              <circle cx="15" cy="15" r={r} fill="none" stroke={t.accent} strokeWidth="3" strokeDasharray={String(circ)} strokeDashoffset={String(circ * 0.92)} strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 6, color: '#16a34a', fontWeight: 700, marginTop: 2 }}>8%</div>
          <div style={{ fontSize: 4.5, color: t.tx3 }}>savings</div>
        </div>
      </div>
      {/* Weekly snapshot */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, margin: '0 8px 6px', padding: '6px' }}>
        <div style={{ fontSize: 6, fontWeight: 700, color: t.tx, marginBottom: 4 }}>Weekly Snapshot</div>
        <div style={{ display: 'flex', gap: 1.5, marginBottom: 3 }}>
          {['M','T','W','T','F','S','S'].map((d,i) => <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 4, color: i === 0 ? t.accent : t.tx3, fontWeight: i === 0 ? 700 : 400 }}>{d}</div>)}
        </div>
        {[
          { e:'🌙', cells:[1,0,0,0,0,0,0] },
          { e:'👟', cells:[1,0,0,0,0,0,0] },
          { e:'🥗', cells:[1,0,0,0,0,0,0] },
        ].map((row, ri) => (
          <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 1.5, marginBottom: 2 }}>
            <span style={{ fontSize: 7, width: 10, flexShrink: 0 }}>{row.e}</span>
            {row.cells.map((v, ci) => <div key={ci} style={{ flex: 1, height: 7, borderRadius: 2, background: v ? t.accent : t.surface2 }}/>)}
          </div>
        ))}
      </div>
      {/* Nav */}
      <div style={{ background: t.surface, borderTop: `2px solid ${t.accent}`, padding: '5px 4px 8px', display: 'flex', justifyContent: 'space-around' }}>
        {['🏠','🥗','📅','💰','💪'].map((icon, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <div style={{ fontSize: 11, ...(i === 0 ? { background: `${t.accent}22`, borderRadius: 7, padding: '2px 4px' } : {}) }}>{icon}</div>
            <div style={{ fontSize: 5, color: i === 0 ? t.accent : t.tx3, fontWeight: i === 0 ? 700 : 400 }}>{['Home','Food','Cal','Finance','Training'][i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemeShowcaseSection() {
  const { ref, visible } = useFadeIn(0.15);
  const AE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  // [far-left, left, centre, right, far-right]
  const xPos    = [-270, -135,   0, 135, 270];
  const scales  = [0.86,  0.93, 1.0, 0.93, 0.86];
  const zIdx    = [1,       2,   4,   2,    1];
  const yOffset = [12,      6,   0,   6,   12]; // slight droop on outer phones
  const delays  = [180,    90,   0,  90,  180]; // centre pops first

  return (
    <section style={{ padding: '120px 24px 100px', background: '#050508', textAlign: 'center' }}>
      <div ref={ref}>
        <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 16, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: `all 0.7s ${AE}` }}>
          Your style
        </div>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, color: '#fff', lineHeight: 1.08, marginBottom: 16, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: `all 0.7s ${AE} 0.1s` }}>
          5 themes. All beautiful.
        </h2>
        <p style={{ fontSize: 17, color: '#71717a', marginBottom: 80, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: `all 0.7s ${AE} 0.2s` }}>
          Make GAINN feel like yours
        </p>
      </div>

      {/* Fan */}
      <div style={{ position: 'relative', height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {THEME_PHONES.map((t, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              zIndex: zIdx[i],
              transform: visible
                ? `translateX(${xPos[i]}px) translateY(${yOffset[i]}px) scale(${scales[i]})`
                : `translateX(0px) translateY(30px) scale(0.65)`,
              opacity: visible ? 1 : 0,
              transition: `transform 0.9s ${AE} ${delays[i]}ms, opacity 0.6s ${AE} ${delays[i]}ms`,
            }}
          >
            <ThemePhoneMini t={t} />
            <div style={{
              marginTop: 10, fontSize: 11, fontWeight: 700,
              color: t.label === 'Dark' ? '#fff' : t.accent,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(8px)',
              transition: `all 0.5s ${AE} ${delays[i] + 350}ms`,
            }}>
              {t.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Analytics Timelapse Section ─────────────────────────────────────────────

const ANALYTICS_ROWS: Array<{ emoji: string; data: Array<'g'|'o'|'r'> }> = [
  { emoji: '🌙', data: ['g','g','g','r','g','g','g','r','r','g','g','g','r','g'] },
  { emoji: '👟', data: ['g','g','o','g','g','g','g','g','o','g','g','g','g','g'] },
  { emoji: '🌅', data: ['g','g','g','g','g','g','g','r','g','g','r','g','g','g'] },
  { emoji: '🥗', data: ['g','g','o','g','g','g','g','g','o','o','g','o','g','g'] },
  { emoji: '💧', data: ['g','o','g','g','g','g','g','o','o','g','g','g','g','g'] },
];
const CELL_C: Record<'g'|'o'|'r', string> = { g: '#16a34a', o: '#d97706', r: '#dc2626' };
const TOTAL_DAYS = 14;

function AnalyticsPhone({ visible }: { visible: boolean }) {
  const [days, setDays] = useState(0);

  useEffect(() => {
    if (!visible) { setDays(0); return; }
    let d = 0;
    const iv = setInterval(() => { d++; setDays(d); if (d >= TOTAL_DAYS) clearInterval(iv); }, 220);
    return () => clearInterval(iv);
  }, [visible]);

  const greenTotal = ANALYTICS_ROWS.reduce((s, r) => s + r.data.slice(0, days).filter(c => c === 'g').length, 0);
  const totalCells = days * ANALYTICS_ROWS.length;
  const accuracy = totalCells === 0 ? 0 : Math.round((greenTotal / totalCells) * 100);
  const R = 28; const circ = 2 * Math.PI * R;

  const analysisRows = ANALYTICS_ROWS.map((row) => {
    const revealed = row.data.slice(0, days);
    const done = revealed.filter(c => c === 'g').length;
    const pct = days === 0 ? 0 : Math.round((done / days) * 100);
    return { ...row, done, pct };
  });

  return (
    <div style={{ width: 230, background: APP.bg, borderRadius: 36, border: '2px solid rgba(255,255,255,0.13)', overflow: 'hidden', padding: '12px 8px 10px', boxSizing: 'border-box', boxShadow: '0 28px 90px rgba(0,0,0,0.75)' }}>
      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 12px 5px', fontSize: 8, color: APP.tx3, fontWeight: 600 }}>
        <span>20:14</span><span>45%</span>
      </div>
      {/* Month */}
      <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, color: APP.tx, marginBottom: 7, letterSpacing: -0.3 }}>March 2026</div>

      {/* Top stats */}
      <div style={{ display: 'flex', gap: 6, padding: '0 5px 7px', alignItems: 'center' }}>
        {/* Ring */}
        <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
          <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
            <circle cx="32" cy="32" r={R} fill="none" stroke={APP.surface2} strokeWidth="6" />
            <circle cx="32" cy="32" r={R} fill="none" stroke="#16a34a" strokeWidth="6"
              strokeDasharray={String(circ)}
              strokeDashoffset={String(circ - circ * accuracy / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.35s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>{accuracy}</span>
            <span style={{ fontSize: 5.5, color: APP.tx3 }}>%</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ l: 'Tracked', v: days }, { l: 'Done', v: greenTotal }].map(({ l, v }) => (
              <div key={l} style={{ flex: 1, ...card({ padding: '4px 5px', textAlign: 'center' as const }) }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: APP.tx }}>{v}</div>
                <div style={{ fontSize: 5.5, color: APP.tx3 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ ...card({ padding: '5px 6px' }) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 5.5, color: APP.tx3 }}>Done only</span>
              <span style={{ fontSize: 5.5, fontWeight: 700, color: APP.tx }}>{accuracy > 6 ? accuracy - 6 : 0}%</span>
            </div>
            <div style={{ height: 3.5, background: APP.surface2, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#16a34a', borderRadius: 2, width: `${accuracy > 6 ? accuracy - 6 : 0}%`, transition: 'width 0.35s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Habit grid */}
      <div style={{ padding: '2px 5px' }}>
        <div style={{ display: 'flex', marginLeft: 17, marginBottom: 2 }}>
          {Array.from({ length: TOTAL_DAYS }, (_, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 4, color: i < days ? APP.tx3 : 'transparent' }}>{i + 1}</div>
          ))}
        </div>
        {ANALYTICS_ROWS.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
            <span style={{ fontSize: 9, width: 15, flexShrink: 0 }}>{row.emoji}</span>
            <div style={{ flex: 1, display: 'flex', gap: 1.5 }}>
              {row.data.map((c, di) => {
                const revealed = di < days;
                const isNew = di === days - 1;
                return (
                  <div
                    key={di}
                    style={{
                      flex: 1,
                      height: 10,
                      borderRadius: 2.5,
                      background: revealed ? CELL_C[c] : APP.surface2,
                      animation: isNew ? 'cellPop 0.38s cubic-bezier(0.22,1,0.36,1) forwards' : 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {/* Day % row */}
        <div style={{ display: 'flex', marginLeft: 17, marginTop: 2, marginBottom: 4 }}>
          {Array.from({ length: TOTAL_DAYS }, (_, di) => {
            if (di >= days) return <div key={di} style={{ flex: 1 }} />;
            const pct = Math.round(ANALYTICS_ROWS.filter(r => r.data[di] === 'g').length / ANALYTICS_ROWS.length * 100);
            const col = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
            return <div key={di} style={{ flex: 1, textAlign: 'center', fontSize: 3.5, color: col, fontWeight: 700 }}>{pct}%</div>;
          })}
        </div>
      </div>

      {/* Chart */}
      {days >= 2 && (() => {
        const CW = 200, CH = 42, pad = 6;
        const aw = CW - pad * 2, ah = CH - pad * 2;
        const dayPcts = Array.from({ length: days }, (_, di) =>
          Math.round(ANALYTICS_ROWS.filter(r => r.data[di] === 'g').length / ANALYTICS_ROWS.length * 100)
        );
        const pts = dayPcts.map((p, i) => ({
          x: pad + (i / (TOTAL_DAYS - 1)) * aw,
          y: pad + (1 - p / 100) * ah,
          pct: p,
        }));
        const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
        const fillPath = `${linePath} L${pts[pts.length - 1].x},${CH} L${pts[0].x},${CH} Z`;
        return (
          <div key="chart" style={{ margin: '0 5px 5px', ...card({ padding: '5px 6px' }) }}>
            <span style={{ fontSize: 5, color: APP.tx3, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' as const }}>Chart</span>
            <svg width="100%" height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ display: 'block', marginTop: 2, overflow: 'visible' }}>
              {/* Subtle grid lines */}
              {[0, 50, 100].map(v => {
                const gy = pad + (1 - v / 100) * ah;
                return <line key={v} x1={pad} y1={gy} x2={CW - pad} y2={gy} stroke={APP.border} strokeWidth="0.6" />;
              })}
              {/* Fill */}
              <path d={fillPath} fill="rgba(22,163,74,0.10)" />
              {/* Line */}
              <path d={linePath} fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
              {/* Dots */}
              {pts.map((p, i) => {
                const col = p.pct >= 80 ? '#16a34a' : p.pct >= 50 ? '#d97706' : '#dc2626';
                return <circle key={i} cx={p.x} cy={p.y} r="2.8" fill={col} stroke={APP.bg} strokeWidth="1.2" />;
              })}
            </svg>
          </div>
        );
      })()}

      {/* Analysis table */}
      <div style={{ margin: '0 5px', background: APP.surface, borderRadius: 10, border: `1px solid ${APP.border}`, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: `1px solid ${APP.border}` }}>
          <span style={{ fontSize: 5.5, color: APP.tx3 }}>Habit</span>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ fontSize: 5.5, color: APP.tx3 }}>Done</span>
            <span style={{ fontSize: 5.5, color: APP.tx3 }}>%</span>
          </div>
        </div>
        {analysisRows.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: i < analysisRows.length - 1 ? `1px solid ${APP.border}` : 'none', gap: 5 }}>
            <span style={{ fontSize: 8 }}>{row.emoji}</span>
            <span style={{ fontSize: 6, color: APP.tx2, flex: 1 }}>{['Sleep','Steps','Wake Up','Nutrition','Hydration'][i]}</span>
            <span style={{ fontSize: 5.5, color: APP.tx3, width: 22, textAlign: 'right' }}>{row.done}/{days}</span>
            <span style={{ fontSize: 6, fontWeight: 700, color: row.pct >= 80 ? '#16a34a' : row.pct >= 60 ? '#d97706' : '#dc2626', width: 20, textAlign: 'right' }}>{row.pct}%</span>
            <div style={{ width: 28, height: 3.5, background: APP.surface2, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: row.pct >= 80 ? '#16a34a' : row.pct >= 60 ? '#d97706' : '#dc2626', borderRadius: 2, width: `${row.pct}%`, transition: 'width 0.35s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsSection({ onGetStarted }: { onGetStarted: () => void }) {
  const { ref: textRef, visible: textVisible } = useFadeIn(0.2);
  const phoneRef = useRef<HTMLDivElement>(null);
  const [phoneVisible, setPhoneVisible] = useState(false);

  useEffect(() => {
    const el = phoneRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setPhoneVisible(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const AE = 'cubic-bezier(0.22, 1, 0.36, 1)';

  const bullets = [
    { icon: '🟩', text: 'Full month grid — green, orange, red at a glance' },
    { icon: '🎯', text: 'Live accuracy ring shows your true completion rate' },
    { icon: '📊', text: 'Per-habit progress bars and done/scheduled counts' },
    { icon: '✏️', text: 'Tap any cell to manually correct your record' },
  ];

  return (
    <section style={{ background: '#06060a', padding: '120px 24px' }}>
      <div style={{ maxWidth: 1020, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 80, alignItems: 'center' }}>

        {/* Text */}
        <div ref={textRef}>
          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 16, opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(24px)', transition: `all 0.7s ${AE}` }}>
            Detailed Analytics
          </div>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 900, color: '#fff', lineHeight: 1.08, marginBottom: 20, opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(24px)', transition: `all 0.7s ${AE} 0.1s` }}>
            See exactly<br />how you&apos;re doing
          </h2>
          <p style={{ fontSize: 17, color: '#9ca3af', lineHeight: 1.85, marginBottom: 40, maxWidth: 400, opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(24px)', transition: `all 0.7s ${AE} 0.2s` }}>
            Every habit, every day. Colour-coded across a full monthly grid so you can spot patterns instantly — and actually fix them.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(18px)', transition: `all 0.6s ${AE} ${0.3 + i * 0.08}s` }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>{b.icon}</span>
                <span style={{ fontSize: 15, color: '#a1a1aa', lineHeight: 1.55 }}>{b.text}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 44, opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(18px)', transition: `all 0.6s ${AE} 0.65s` }}>
            <button
              onClick={onGetStarted}
              style={{ padding: '14px 32px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: `all 0.3s ${AE}` }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; (e.currentTarget as HTMLButtonElement).style.background = '#15803d'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.background = '#16a34a'; }}
            >
              View Detailed Analytics →
            </button>
          </div>
        </div>

        {/* Phone */}
        <div ref={phoneRef} style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: '-60px', background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(22,163,74,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ opacity: phoneVisible ? 1 : 0, transform: phoneVisible ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(24px)', transition: `opacity 0.7s ${AE}, transform 0.7s ${AE}` }}>
            <AnalyticsPhone visible={phoneVisible} />
          </div>
        </div>

      </div>
    </section>
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
    { name: 'Strava Premium', category: 'GPS & Fitness', price: '£8.99/mo' },
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
    <div style={{ background: '#050508', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif', overflow: 'clip' }}>

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
          @keyframes cellPop { 0% { transform: scale(0.2); opacity:0; } 65% { transform: scale(1.25); } 100% { transform: scale(1); opacity:1; } }
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
        <p style={{ fontSize: 20, color: '#a1a1aa', textAlign: 'center', marginBottom: 20, animation: 'fade-up 0.9s 0.3s ease both' }}>
          The all-in-one AI life tracker
        </p>

        {/* Personalisation pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100, padding: '7px 16px', marginBottom: 40, animation: 'fade-up 0.9s 0.42s ease both' }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontSize: 13, color: '#a1a1aa' }}>AI advice personalised to your <strong style={{ color: '#fff', fontWeight: 600 }}>height, weight, age &amp; goals</strong></span>
        </div>

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
            Get Started
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
          <Phone feature={0} />
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

      {/* ── 4.5 Analytics timelapse ─────────────────────────────────── */}
      <AnalyticsSection onGetStarted={onGetStarted} />

      {/* ── 5. AI section — sticky scroll ───────────────────────────── */}
      <section ref={aiRef} style={{ background: '#050508' }}>
        {/* Section heading */}
        <div style={{
          textAlign: 'center', paddingTop: 100,
          opacity: aiVisible ? 1 : 0,
          transform: aiVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: `all 0.7s ${easing}`,
        }}>
          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>Intelligence built in</div>
          <h2 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, marginBottom: 0 }}>Powered by AI</h2>
        </div>

        {/* Sticky two-column */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: 1020, margin: '0 auto', padding: '0 48px', boxSizing: 'border-box' as const }}>

          {/* Left: scrolling panels */}
          <div>
            {/* Panel 1 — AI Gym Plans */}
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: 48 }}>
              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>AI Gym Plans</div>
              <h3 style={{ fontSize: 'clamp(26px, 3.2vw, 42px)', fontWeight: 900, color: '#fff', lineHeight: 1.08, marginBottom: 20 }}>
                Your plan,<br />built by AI
              </h3>
              <p style={{ fontSize: 16, color: '#9ca3af', lineHeight: 1.85, marginBottom: 32, maxWidth: 420 }}>
                Tell GAINN your equipment, schedule, and goals — and get a fully personalised workout plan in seconds. Every exercise, every set, every rep. Built for you, not copied from a template.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'Exercises matched to your available equipment',
                  'Personalised using your height, weight, age, and goals',
                  'Muscular load radar shows exactly what you\'re training',
                  'Adjusts week by week as you log sessions',
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ color: '#16a34a', fontWeight: 800, fontSize: 15, marginTop: 2, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 15, color: '#a1a1aa' }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2 — Powered by Gemini + 6 features */}
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: 48 }}>
              {/* Gemini badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 16px', marginBottom: 32, alignSelf: 'flex-start' }}>
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                  <defs>
                    <linearGradient id="gem-v" x1="16" y1="1" x2="16" y2="31" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#4285F4"/><stop offset="0.5" stopColor="#9B72CB"/><stop offset="1" stopColor="#D96570"/>
                    </linearGradient>
                    <linearGradient id="gem-h" x1="1" y1="16" x2="31" y2="16" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#4285F4"/><stop offset="0.5" stopColor="#9B72CB"/><stop offset="1" stopColor="#D96570"/>
                    </linearGradient>
                  </defs>
                  <path d="M16 1 C16 1 18.2 9.5 21.5 16 C18.2 22.5 16 31 16 31 C16 31 13.8 22.5 10.5 16 C13.8 9.5 16 1 16 1Z" fill="url(#gem-v)"/>
                  <path d="M1 16 C1 16 9.5 13.8 16 10.5 C22.5 13.8 31 16 31 16 C31 16 22.5 18.2 16 21.5 C9.5 18.2 1 16 1 16Z" fill="url(#gem-h)"/>
                </svg>
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' as const }}>Powered by</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Google Gemini</div>
                </div>
              </div>

              <h3 style={{ fontSize: 'clamp(24px, 3vw, 38px)', fontWeight: 900, color: '#fff', lineHeight: 1.08, marginBottom: 16 }}>
                6 AI features,<br />one subscription
              </h3>

              <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.7, marginBottom: 28 }}>
                Every recommendation is tailored to <span style={{ color: '#a1a1aa', fontWeight: 600 }}>your height, weight, age, and goals</span> — not generic advice copied from the internet.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {aiFeatures.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{f.title}</div>
                      <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: sticky image */}
          <div style={{ position: 'sticky', top: 0, height: '100vh', alignSelf: 'start', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 48 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/gym-plan.jpg"
              alt="AI-generated gym plan with muscular load radar chart"
              style={{ maxHeight: '76vh', width: 'auto', maxWidth: '100%', borderRadius: 20, display: 'block' }}
            />
          </div>

        </div>
      </section>

      {/* ── 5.5 Theme showcase ───────────────────────────────────────── */}
      <ThemeShowcaseSection />

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
              <div style={{ fontSize: 22, fontWeight: 900, color: '#ef4444' }}>£29.93/mo</div>
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
          Get Started
        </button>
        <p style={{ marginTop: 20, fontSize: 13, color: '#52525b' }}>Cancel any time</p>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🍎</span>
          <span style={{ fontSize: 13, color: '#a1a1aa', fontWeight: 500 }}>Coming to App Store &amp; Google Play soon</span>
          <span style={{ fontSize: 20 }}>🤖</span>
        </div>
        <p style={{ fontSize: 13, color: '#52525b' }}>© 2026 GAINN. All rights reserved.</p>
      </footer>
    </div>
  );
}
