'use client';

import { useGameStore } from '@/store/gameStore';
import type { Theme } from '@/types';

const THEMES: { id: Theme; bg: string; ring: string; label: string }[] = [
  { id: 'dark',  bg: '#13131f', ring: '#7c3aed', label: 'Dark' },
  { id: 'white', bg: '#f5f5f7', ring: '#a1a1aa', label: 'Light' },
  { id: 'pink',  bg: '#fce9f1', ring: '#d6306a', label: 'Pink' },
  { id: 'blue',  bg: '#0b1524', ring: '#3b82f6', label: 'Blue' },
  { id: 'green', bg: '#1a3028', ring: '#4ade80', label: 'Green' },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useGameStore();

  return (
    <div className="flex items-center gap-1.5" title="Switch theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          title={t.label}
          className="w-4 h-4 rounded-full transition-transform duration-150 hover:scale-110"
          style={{
            background: t.bg,
            border: `1.5px solid ${theme === t.id ? t.ring : 'rgba(128,128,128,0.3)'}`,
            boxShadow: theme === t.id ? `0 0 0 2px ${t.ring}44` : 'none',
            transform: theme === t.id ? 'scale(1.2)' : undefined,
          }}
        />
      ))}
    </div>
  );
}
