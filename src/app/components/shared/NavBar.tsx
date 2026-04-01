'use client';

import { useGameStore } from '@/store/gameStore';
import type { ActiveSection } from '@/types';

const NAV_ITEMS: { section: ActiveSection; icon: string; label: string; alwaysShow?: boolean }[] = [
  { section: 'dashboard',    icon: '🏠',  label: 'Home'     },
  { section: 'nutrition',    icon: '🥗',  label: 'Food'     },
  { section: 'vices',        icon: '💰',  label: 'Finance'  },
  { section: 'calendarview', icon: '📅',  label: 'Calendar' },
  { section: 'training',     icon: '✅',  label: 'Habits'   },
  { section: 'gym',          icon: '🏃',  label: 'Exercise' },
];

export default function NavBar() {
  const { activeSection, setActiveSection, stats, hiddenSections, disabledSections } = useGameStore();
  const xpPct = Math.min(100, (stats.xp / stats.xpToNext) * 100);

  const trainingAllOff = ['habits','plans','steps','stats','track'].every(s => disabledSections.includes(s));
  const habitsOnly     = ['plans','steps','stats','track'].every(s => disabledSections.includes(s)) && !disabledSections.includes('habits');

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.section === 'dashboard') return true;
    if (item.section === 'training') return !trainingAllOff;
    // Hard-disabled via disabledSections (not overridden by competition mode)
    if (item.section === 'gym'       && disabledSections.includes('gym')) return false;
    if (item.section === 'nutrition' && disabledSections.includes('food')) return false;
    if (item.section === 'calendar'  && disabledSections.includes('calendar')) return false;
    if (item.section === 'vices'     && disabledSections.includes('finance') && disabledSections.includes('vices')) return false;
    // hiddenSections (user-controlled visibility, not overridden by competition mode)
    if (hiddenSections.includes(item.section)) return false;
    return true;
  });

  return (
    <div className="shrink-0 z-40 bg-ql-hdr backdrop-blur-xl border-t border-ql">
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
                {item.section === 'vices' && disabledSections.includes('finance') ? '🚫' : item.icon}
              </span>
              <span className={`text-[10px] font-medium transition-colors duration-200 ${
                active ? 'text-white' : 'text-ql-3'
              }`}>
                {item.section === 'vices' && disabledSections.includes('finance') ? 'Vices' : item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
