'use client';

import { useGameStore } from '@/store/gameStore';
import type { ActiveSection } from '@/types';

const NAV_ITEMS: { section: ActiveSection; icon: string; label: string; alwaysShow?: boolean }[] = [
  { section: 'dashboard', icon: '🏠',  label: 'Home'     },
  { section: 'nutrition', icon: '🥗',  label: 'Food'     },
  { section: 'calendar',  icon: '📅',  label: 'Calendar' },
  { section: 'vices',     icon: '💰',  label: 'Finance'  },
  { section: 'training',  icon: '💪',  label: 'Training' },
];

export default function NavBar() {
  const { activeSection, setActiveSection, stats, competitionMode, financialMode, hiddenSections } = useGameStore();
  const xpPct = Math.min(100, (stats.xp / stats.xpToNext) * 100);

  const visibleItems = NAV_ITEMS.filter(item =>
    item.alwaysShow || competitionMode || !hiddenSections.includes(item.section)
  );

  return (
    <div className="shrink-0 z-40 bg-ql-hdr backdrop-blur-xl border-t border-ql">
      {/* XP bar */}
      <div className="h-[2px] bg-ql-surface2">
        <div
          className="h-full bg-ql-accent transition-all duration-1000"
          style={{ width: `${xpPct}%` }}
        />
      </div>

      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-2 pb-[env(safe-area-inset-bottom,8px)]">
        {visibleItems.map((item) => {
          const active = activeSection === item.section;
          return (
            <button
              key={item.section}
              onClick={() => setActiveSection(item.section)}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl transition-all duration-200 ${
                active ? 'bg-ql-nav-active' : ''
              }`}
            >
              <span className={`text-xl transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                {item.section === 'vices' && !financialMode ? '🚫' : item.icon}
              </span>
              <span className={`text-[10px] font-medium transition-colors duration-200 ${
                active ? 'text-ql-accent' : 'text-ql-3'
              }`}>
                {item.section === 'vices' && !financialMode ? 'Vices' : item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
