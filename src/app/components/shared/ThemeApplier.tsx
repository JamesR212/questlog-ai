'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export default function ThemeApplier() {
  const theme = useGameStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return null;
}
