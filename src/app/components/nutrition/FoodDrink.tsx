'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import NutritionPlan from './NutritionPlan';
import WaterTracker from '../training/WaterTracker';

export default function FoodDrink() {
  const { nutritionTab, disabledSections } = useGameStore();
  const hydrationDisabled = disabledSections.includes('hydration');
  const [activeTab, setActiveTab] = useState<'food' | 'drink'>(nutritionTab ?? 'food');

  useEffect(() => {
    if (nutritionTab) setActiveTab(nutritionTab);
  }, [nutritionTab]);

  // If hydration is disabled and user is on drink tab, switch to food
  useEffect(() => {
    if (hydrationDisabled && activeTab === 'drink') setActiveTab('food');
  }, [hydrationDisabled, activeTab]);

  const visibleTabs = ([
    { id: 'food',  label: '🥗 Food'  },
    { id: 'drink', label: '💧 Drink' },
  ] as const).filter(tab => !(tab.id === 'drink' && hydrationDisabled));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-ql text-xl font-bold">Food &amp; Drink</h2>
        <p className="text-ql-3 text-xs mt-0.5">Track your nutrition and daily hydration</p>
      </div>

      {/* Tab switcher — only shown when both tabs are visible */}
      {visibleTabs.length > 1 && (
        <div className="flex gap-1 bg-ql-surface2 rounded-2xl p-1 border border-ql">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id ? 'bg-ql-accent text-white shadow-ql-sm' : 'text-ql-3 hover:text-ql'
              }`}
            >{tab.label}</button>
          ))}
        </div>
      )}

      {activeTab === 'food'  && <NutritionPlan />}
      {activeTab === 'drink' && !hydrationDisabled && <WaterTracker />}
    </div>
  );
}
