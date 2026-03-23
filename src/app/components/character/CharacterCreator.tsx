'use client';

'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Race, GenderPresentation, Outfit } from '@/types';
import PixelCharacter from './PixelCharacter';

export const JEANS_COLORS  = [
  { hex: '#2868b0', label: 'Blue'  },
  { hex: '#1a3870', label: 'Navy'  },
  { hex: '#7aaad8', label: 'Pale'  },
  { hex: '#181820', label: 'Black' },
];
export const TSHIRT_COLORS = [
  { hex: '#d0603a', label: 'Coral'   },
  { hex: '#cc3333', label: 'Red'     },
  { hex: '#3388cc', label: 'Blue'    },
  { hex: '#338833', label: 'Green'   },
  { hex: '#9933cc', label: 'Purple'  },
  { hex: '#cc9922', label: 'Yellow'  },
  { hex: '#33aaaa', label: 'Teal'    },
  { hex: '#e8e8e8', label: 'White'   },
];
export const HOODIE_COLORS = [
  { hex: '#4a5566', label: 'Grey'   },
  { hex: '#181820', label: 'Black'  },
  { hex: '#1a3870', label: 'Navy'   },
  { hex: '#cc3333', label: 'Red'    },
  { hex: '#338844', label: 'Green'  },
  { hex: '#7033aa', label: 'Purple' },
  { hex: '#aa3355', label: 'Maroon' },
  { hex: '#337788', label: 'Teal'   },
];

const CREATOR_OUTFITS: { id: Outfit; label: string; icon: string; desc: string; premium?: boolean }[] = [
  { id: 'default',  label: 'Default',  icon: '👕', desc: 'Classic adventurer' },
  { id: 'jeans',    label: 'Jeans',    icon: '👖', desc: 'Casual denim' },
  { id: 'hoodie',   label: 'Hoodie',   icon: '🧥', desc: 'Cosy & comfortable' },
  { id: 'tshirt',   label: 'T-Shirt',  icon: '👔', desc: 'Clean & simple' },
  { id: 'ninja',    label: 'Ninja',    icon: '🥷', desc: 'Silent & deadly', premium: true },
  { id: 'pirate',   label: 'Pirate',   icon: '🏴‍☠️', desc: 'Arr, plunder!', premium: true },
  { id: 'princess', label: 'Princess', icon: '👑', desc: 'Royal elegance', premium: true },
];

const RACES: { id: Race; label: string; icon: string; desc: string; locked?: boolean; lockDesc?: string }[] = [
  { id: 'human',  label: 'Human',  icon: '🧑', desc: 'Balanced stats, adaptable' },
  { id: 'elf',    label: 'Elf',    icon: '🧝', desc: 'Swift, precise, long memory' },
  { id: 'orc',    label: 'Orc',    icon: '💪', desc: 'Brutal strength, high endurance' },
  { id: 'dwarf',  label: 'Dwarf',  icon: '⛏️', desc: 'Stubborn, resilient, bearded' },
  { id: 'undead', label: 'Undead', icon: '💀', desc: 'No sleep needed. Eternal grind.' },
];

const HAIR_NAMES = ['Crop', 'Parted', 'Long', 'Buzz', 'Spiky', 'Afro', 'Dreads', 'Bob', 'Ponytail', 'Waves'];
const BEARD_NAMES = ['None', 'Stubble', 'Short', 'Full', 'Braided'];

const SKIN_TONES = ['#ffe0bd', '#f5cba7', '#d4956a', '#c68642', '#8d5524', '#4a2912'];

const HAIR_COLORS = [
  '#1a0a00', '#3b1f0a', '#6b3d1e', '#a0522d', '#c8a96e',
  '#e8d5a3', '#f0f0f0', '#cc4444', '#4466cc', '#228b22',
];

const EYE_COLORS = [
  { hex: '#1a1a2e', label: 'Black'    },
  { hex: '#5c3d11', label: 'Brown'    },
  { hex: '#7b6012', label: 'Hazel'    },
  { hex: '#1a6b35', label: 'Green'    },
  { hex: '#1a4a8a', label: 'Blue'     },
  { hex: '#5bc8f5', label: 'Sky Blue' },
  { hex: '#607070', label: 'Grey'     },
  { hex: '#c06020', label: 'Amber'    },
];

const GENDERS: { id: GenderPresentation; label: string; icon: string }[] = [
  { id: 'masculine', label: 'Masc', icon: '♂' },
  { id: 'feminine',  label: 'Fem',  icon: '♀' },
  { id: 'neutral',   label: 'Neutral', icon: '⚧' },
];

function computeStreak(dates: string[]): number {
  const activeDays = new Set(dates.map(d => new Date(d).toDateString()));
  let streak = 0;
  const cur = new Date();
  if (!activeDays.has(cur.toDateString())) cur.setDate(cur.getDate() - 1);
  while (activeDays.has(cur.toDateString())) { streak++; cur.setDate(cur.getDate() - 1); }
  return streak;
}

export default function CharacterCreator() {
  const { characterAppearance, setCharacterAppearance, stats, habitLog, gymSessions, wakeQuest, vices, unlockedOutfits } = useGameStore();
  const allDates = [
    ...habitLog.map(e => e.date),
    ...(gymSessions ?? []).map(e => e.date),
    ...wakeQuest.checkIns.map(e => e.date),
    ...vices.map(e => e.date),
  ];
  const streak = computeStreak(allDates);
  const [local, setLocal] = useState({ ...characterAppearance });
  const [step, setStep]   = useState(0);

  const update = (patch: Partial<typeof local>) => setLocal(prev => ({ ...prev, ...patch }));
  const save = () => { setCharacterAppearance({ ...local, hasCreated: true }); };

  const steps = ['Race', 'Look', 'Body', 'Style'];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-ql text-xl font-bold">Create Your Hero</h2>
        <p className="text-ql-3 text-sm mt-0.5">Your character evolves as you level up</p>
      </div>

      {/* Step pills */}
      <div className="flex gap-2">
        {steps.map((s, i) => (
          <button key={s} onClick={() => setStep(i)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              step === i ? 'bg-ql-accent text-white' : 'bg-ql-surface2 text-ql-3'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Character preview — centered, large */}
      <div className="bg-ql-surface rounded-2xl border border-ql py-5 flex flex-col items-center gap-1.5">
        <PixelCharacter appearance={local} morphStage={0} size={154} />
        <span className="text-ql-accent text-xs font-bold mt-1">
          {RACES.find(r => r.id === local.race)?.icon ?? '🐧'} {RACES.find(r => r.id === local.race)?.label}
        </span>
        <span className="text-ql-3 text-[10px]">
          {local.height}cm · {local.startingWeight}kg
        </span>
      </div>

      {/* Step content */}
      <div className="flex-1 min-w-0">
          {/* ── Step 0: Race ── */}
          {step === 0 && (
            <div className="flex flex-col gap-2">
              {RACES.map(r => {
                const selected = local.race === r.id;
                return (
                  <button key={r.id} onClick={() => update({ race: r.id })}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selected
                        ? 'border-ql-accent bg-ql-surface2 shadow-ql'
                        : 'border-ql bg-ql-surface'
                    }`}
                  >
                    <span className="text-2xl">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${selected ? 'text-ql-accent' : 'text-ql'}`}>{r.label}</p>
                      <p className="text-ql-3 text-[11px]">{r.desc}</p>
                    </div>
                    {selected && <span className="ml-auto text-ql-accent text-sm">✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Step 1: Appearance ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              {/* Gender */}
              <div>
                <p className="text-ql text-xs font-semibold mb-2">Gender Presentation</p>
                <div className="flex gap-2">
                  {GENDERS.map(g => (
                    <button key={g.id} onClick={() => update({ gender: g.id })}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        local.gender === g.id
                          ? 'border-ql-accent bg-ql-surface2 text-ql-accent'
                          : 'border-ql bg-ql-surface text-ql-3'
                      }`}
                    >
                      {g.icon} {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skin tone */}
              <div>
                <p className="text-ql text-xs font-semibold mb-2">Skin Tone</p>
                <div className="flex gap-2 flex-wrap">
                  {SKIN_TONES.map(tone => (
                    <button key={tone} onClick={() => update({ skinTone: tone })}
                      className={`w-9 h-9 rounded-full border-2 transition-transform ${
                        local.skinTone === tone ? 'border-ql-accent scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: tone }}
                    />
                  ))}
                </div>
              </div>

              {/* Hair style — 10 options */}
              <div>
                <p className="text-ql text-xs font-semibold mb-2">Hair Style</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {HAIR_NAMES.map((name, i) => (
                    <button key={i} onClick={() => update({ hairStyle: i })}
                      className={`py-1.5 rounded-xl text-[10px] font-medium border transition-all ${
                        local.hairStyle === i
                          ? 'border-ql-accent bg-ql-surface2 text-ql-accent'
                          : 'border-ql bg-ql-surface text-ql-3'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Beard */}
              <div>
                <p className="text-ql text-xs font-semibold mb-2">
                  Beard
                  {local.race === 'dwarf' && <span className="text-ql-3 text-[10px] font-normal ml-2">Dwarfs always have a beard</span>}
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {BEARD_NAMES.map((name, i) => {
                    const forcedMin = local.race === 'dwarf' && i === 0;
                    return (
                      <button key={i}
                        onClick={() => !forcedMin && update({ beardStyle: i })}
                        disabled={forcedMin}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          (local.beardStyle ?? 0) === i
                            ? 'border-ql-accent bg-ql-surface2 text-ql-accent'
                            : forcedMin
                              ? 'border-ql bg-ql-surface text-ql-3 opacity-30 cursor-not-allowed'
                              : 'border-ql bg-ql-surface text-ql-3'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hair colour */}
              <div>
                <p className="text-ql text-xs font-semibold mb-2">Hair Colour</p>
                <div className="flex gap-2 flex-wrap">
                  {HAIR_COLORS.map(c => (
                    <button key={c} onClick={() => update({ hairColor: c })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        local.hairColor === c ? 'border-ql-accent scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Eye colour */}
              <div>
                <p className="text-ql text-xs font-semibold mb-2">Eye Colour</p>
                <div className="flex gap-2 flex-wrap">
                  {EYE_COLORS.map(c => (
                    <button key={c.hex} onClick={() => update({ eyeColor: c.hex })}
                      title={c.label}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        (local.eyeColor ?? '#1a1a2e') === c.hex ? 'border-ql-accent scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Body ── */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              {/* AI disclaimer */}
              <div className="bg-ql-accent/10 border border-ql-accent/30 rounded-xl px-3.5 py-3 flex gap-2.5 items-start">
                <span className="text-base shrink-0">✨</span>
                <p className="text-ql-3 text-[11px] leading-relaxed">
                  <span className="text-ql font-semibold">AI uses this data</span> to personalise advice, recommend daily water intake, estimate calorie goals, and tailor fitness suggestions to your body type and activity level. It is never shared with third parties.
                </p>
              </div>

              {/* Age */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-ql text-xs font-semibold">Age</p>
                  <span className="text-ql-accent text-xs font-bold tabular-nums">{local.age} yrs</span>
                </div>
                <input type="range" min={18} max={60} value={local.age}
                  onChange={e => update({ age: Number(e.target.value) })}
                  className="w-full accent-ql-accent"
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-ql-3 text-[10px]">18</span>
                  <span className="text-ql-3 text-[10px]">60</span>
                </div>
              </div>

              {/* Height */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-ql text-xs font-semibold">Height</p>
                  <span className="text-ql-accent text-xs font-bold tabular-nums">
                    {local.height} cm
                    <span className="text-ql-3 font-normal ml-1">
                      ({local.height < 163 ? 'Short' : local.height > 180 ? 'Tall' : 'Average'})
                    </span>
                  </span>
                </div>
                <input type="range" min={150} max={200} value={local.height}
                  onChange={e => update({ height: Number(e.target.value) })}
                  className="w-full accent-ql-accent"
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-ql-3 text-[10px]">150cm</span>
                  <span className="text-ql-3 text-[10px]">200cm</span>
                </div>
              </div>

              {/* Starting weight */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-ql text-xs font-semibold">Starting Weight</p>
                  <span className="text-ql-accent text-xs font-bold tabular-nums">
                    {local.startingWeight} kg
                    <span className="text-ql-3 font-normal ml-1">
                      ({local.startingWeight < 65 ? 'Lean' : local.startingWeight > 100 ? 'Heavy' : 'Average'})
                    </span>
                  </span>
                </div>
                <input type="range" min={50} max={140} value={local.startingWeight}
                  onChange={e => update({ startingWeight: Number(e.target.value) })}
                  className="w-full accent-ql-accent"
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-ql-3 text-[10px]">50 kg</span>
                  <span className="text-ql-3 text-[10px]">140 kg</span>
                </div>
              </div>

              {/* Body evolves note */}
              <div className="bg-ql-surface2 rounded-xl p-3 border border-ql">
                <p className="text-ql text-xs font-semibold mb-1">Your body evolves automatically</p>
                <p className="text-ql-3 text-[11px]">
                  Log gym sessions and keep streaks to transform through 5 stages — from your starting build to elite.
                </p>
              </div>

              {/* Morph stage mini preview */}
              <div>
                <p className="text-ql text-xs font-semibold mb-2">Body Stage Preview</p>
                <div className="flex gap-1.5 justify-between">
                  {[0, 1, 2, 3, 4].map(stage => (
                    <div key={stage} className="flex flex-col items-center gap-1">
                      <PixelCharacter appearance={local} morphStage={stage} size={37} />
                      <span className="text-ql-3 text-[9px] text-center">
                        {['Soft', 'Base', 'Toned', 'Strong', 'Elite'][stage]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Style ── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-ql text-xs font-semibold mb-0.5">Starting Outfit</p>
                <p className="text-ql-3 text-[11px]">Choose your look. More styles can be unlocked in the Wardrobe.</p>
              </div>

              {/* Free outfits */}
              <div className="grid grid-cols-2 gap-2">
                {CREATOR_OUTFITS.filter(o => !o.premium).map(o => {
                  const active = (local.outfit ?? 'default') === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => update({ outfit: o.id, outfitColor: undefined })}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                        active ? 'border-ql-accent bg-ql-surface2 shadow-ql-sm' : 'border-ql bg-ql-surface'
                      }`}
                    >
                      <span className="text-xl shrink-0">{o.icon}</span>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${active ? 'text-ql-accent' : 'text-ql'}`}>{o.label}</p>
                        <p className="text-ql-3 text-[10px]">{o.desc}</p>
                      </div>
                      {active && <span className="ml-auto text-ql-accent text-xs shrink-0">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Colour picker for jeans / hoodie / tshirt */}
              {['jeans', 'hoodie', 'tshirt'].includes(local.outfit ?? 'default') && (() => {
                const colors =
                  local.outfit === 'jeans'  ? JEANS_COLORS  :
                  local.outfit === 'hoodie' ? HOODIE_COLORS : TSHIRT_COLORS;
                const label  =
                  local.outfit === 'jeans'  ? 'Jeans Colour' :
                  local.outfit === 'hoodie' ? 'Hoodie Colour' : 'T-Shirt Colour';
                return (
                  <div>
                    <p className="text-ql text-xs font-semibold mb-2">{label}</p>
                    <div className="flex gap-2 flex-wrap">
                      {colors.map(c => {
                        const active = (local.outfitColor ?? colors[0].hex) === c.hex;
                        return (
                          <button
                            key={c.hex}
                            onClick={() => update({ outfitColor: c.hex })}
                            title={c.label}
                            className={`w-9 h-9 rounded-full border-2 transition-transform ${active ? 'border-ql-accent scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c.hex }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Premium outfits */}
              <div>
                <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wide mb-2">Premium — 100,000 💰</p>
                <div className="flex flex-col gap-2">
                  {CREATOR_OUTFITS.filter(o => o.premium).map(o => {
                    const owned  = unlockedOutfits.includes(o.id);
                    const active = (local.outfit ?? 'default') === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => owned && update({ outfit: o.id, outfitColor: undefined })}
                        disabled={!owned}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          active ? 'border-ql-accent bg-ql-surface2' : owned ? 'border-ql bg-ql-surface hover:bg-ql-surface2' : 'border-ql bg-ql-surface opacity-50'
                        }`}
                      >
                        <span className="text-xl shrink-0">{owned ? o.icon : '🔒'}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${active ? 'text-ql-accent' : 'text-ql'}`}>{o.label}</p>
                          <p className="text-ql-3 text-[10px]">{owned ? o.desc : 'Unlock in Wardrobe for 100,000 gold'}</p>
                        </div>
                        {active && <span className="text-ql-accent text-xs shrink-0">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Nav */}
      <div className="flex gap-3 mt-2">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 py-3 rounded-2xl bg-ql-surface2 text-ql text-sm font-semibold border border-ql"
          >
            Back
          </button>
        )}
        {step < steps.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)}
            className="flex-1 py-3 rounded-2xl bg-ql-accent text-white text-sm font-semibold"
          >
            Next →
          </button>
        ) : (
          <>
            <button onClick={save}
              className="flex-1 py-3 rounded-2xl bg-ql-accent hover:bg-ql-accent-h disabled:opacity-40 text-white text-sm font-bold transition-colors"
            >
              ⚔️ Begin Quest
            </button>
          </>
        )}
      </div>
    </div>
  );
}
