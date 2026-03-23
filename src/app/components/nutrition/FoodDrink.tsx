'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import NutritionPlan from './NutritionPlan';
import WaterTracker from '../training/WaterTracker';

export default function FoodDrink() {
  const { nutritionTab } = useGameStore();
  const [activeTab, setActiveTab] = useState<'food' | 'drink'>(nutritionTab ?? 'food');

  useEffect(() => {
    if (nutritionTab) setActiveTab(nutritionTab);
  }, [nutritionTab]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-ql text-xl font-bold">Food &amp; Drink</h2>
        <p className="text-ql-3 text-xs mt-0.5">Track your nutrition and daily hydration</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-ql-surface2 rounded-2xl p-1 border border-ql">
        {([
          { id: 'food',  label: '🥗 Food'  },
          { id: 'drink', label: '💧 Drink' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-ql-accent text-white shadow-ql-sm' : 'text-ql-3 hover:text-ql'
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {activeTab === 'food'  && <NutritionPlan />}
      {activeTab === 'drink' && <WaterTracker />}
    </div>
  );
}
