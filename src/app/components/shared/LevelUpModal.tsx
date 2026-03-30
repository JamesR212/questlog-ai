'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export default function LevelUpModal() {
  const { showLevelUp, levelUpMessage, dismissLevelUp, stats } = useGameStore();

  useEffect(() => {
    if (showLevelUp) {
      const timer = setTimeout(dismissLevelUp, 4000);
      return () => clearTimeout(timer);
    }
  }, [showLevelUp, dismissLevelUp]);

  if (!showLevelUp) return null;

  // Stats/level UI hidden for now — dismiss silently
  return null;

  // eslint-disable-next-line no-unreachable
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
    >
      <div className="levelup-anim w-full max-w-xs bg-ql-surface rounded-3xl shadow-ql overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-yellow-400 to-amber-500" />
        <div className="p-8 text-center">
          <div className="text-5xl mb-4">⚔️</div>
          <div className="text-yellow-500 text-xs font-semibold tracking-widest uppercase mb-1">
            Level Up
          </div>
          <div className="text-ql text-2xl font-bold mb-1">{levelUpMessage}</div>
          <p className="text-ql-3 text-sm mb-6">You have grown stronger.</p>

          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { label: 'STR', value: stats.str, color: 'text-red-500' },
              { label: 'CON', value: stats.con, color: 'text-emerald-500' },
              { label: 'DEX', value: stats.dex, color: 'text-blue-500' },
              { label: 'GOLD', value: stats.gold, color: 'text-amber-500' },
            ].map((s) => (
              <div key={s.label} className="bg-ql-surface2 rounded-2xl py-3">
                <div className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</div>
                <div className="text-ql-3 text-[10px] font-medium">{s.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={dismissLevelUp}
            className="w-full py-3 bg-ql-accent hover:bg-ql-accent-h text-white font-semibold rounded-2xl text-sm transition-colors"
          >
            Continue Quest
          </button>
        </div>
      </div>
    </div>
  );
}
