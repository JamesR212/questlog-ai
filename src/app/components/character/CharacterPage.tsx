'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Outfit } from '@/types';
import PixelCharacter from './PixelCharacter';
import CharacterCreator from './CharacterCreator';
import { JEANS_COLORS, TSHIRT_COLORS, HOODIE_COLORS } from './CharacterCreator';

const OUTFITS: { id: Outfit; label: string; icon: string; desc: string; premium?: boolean }[] = [
  { id: 'default',  label: 'Default',   icon: '👕', desc: 'Classic adventurer look' },
  { id: 'jeans',    label: 'Jeans',     icon: '👖', desc: 'Casual denim fit' },
  { id: 'hoodie',   label: 'Hoodie',    icon: '🧥', desc: 'Cosy street style' },
  { id: 'tshirt',   label: 'T-Shirt',   icon: '👔', desc: 'Plain & clean' },
  { id: 'ninja',    label: 'Ninja',     icon: '🥷', desc: 'Silent. Deadly. Stylish.', premium: true },
  { id: 'pirate',   label: 'Pirate',    icon: '🏴‍☠️', desc: 'Arr, plunder awaits.', premium: true },
  { id: 'princess', label: 'Princess',  icon: '👑', desc: 'Royal elegance.', premium: true },
];

const STAGE_LABELS = ['Soft', 'Base', 'Toned', 'Strong', 'Elite'];
const STAGE_DESCS = [
  'Just getting started. The journey begins.',
  'Building the foundation. Consistency is key.',
  'Looking defined. Real progress showing.',
  'Noticeably stronger. People can tell.',
  'Peak form. Elite tier achieved.',
];

function getMorphStage(gymSessions: number, streak: number): number {
  const score = gymSessions * 2 + streak;
  if (score < 10) return 0;
  if (score < 30) return 1;
  if (score < 60) return 2;
  if (score < 100) return 3;
  return 4;
}

export default function CharacterPage() {
  const { characterAppearance, habitLog, gymSessions, wakeQuest, vices, stats, setCharacterAppearance, unlockedOutfits, purchaseOutfit } = useGameStore();
  const [editing, setEditing] = useState(!characterAppearance.hasCreated);
  const [previewOutfit, setPreviewOutfit] = useState<Outfit | null>(null);

  // Compute streak
  const activeDays = new Set<string>();
  [...habitLog, ...(gymSessions ?? []), ...wakeQuest.checkIns, ...vices].forEach(e =>
    activeDays.add(new Date(e.date).toDateString())
  );
  let streak = 0;
  const d = new Date();
  if (!activeDays.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (activeDays.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }

  const morphStage = getMorphStage(habitLog.length + (gymSessions?.length ?? 0), streak);
  const xpPct = Math.min(100, (stats.xp / stats.xpToNext) * 100);

  if (editing) {
    return (
      <div className="flex flex-col gap-4">
        <CharacterCreator />
        {characterAppearance.hasCreated && (
          <button
            onClick={() => setEditing(false)}
            className="text-ql-3 text-xs text-center underline"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-ql text-xl font-bold">Your Character</h2>
          <p className="text-ql-3 text-sm">{STAGE_LABELS[morphStage]}</p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-ql-3 text-xs border border-ql rounded-xl px-3 py-1.5"
        >
          Edit
        </button>
      </div>

      {/* Character card */}
      <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-6 flex flex-col items-center gap-4">
        {/* Character sprite */}
        <div className="relative">
          <PixelCharacter
            appearance={{ ...characterAppearance, outfit: previewOutfit ?? (characterAppearance.outfit ?? 'default'), outfitColor: previewOutfit ? undefined : characterAppearance.outfitColor }}
            morphStage={morphStage}
            size={120}
          />
          {previewOutfit && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-ql-surface border border-ql rounded-full px-2 py-0.5 text-[9px] text-ql-accent font-semibold whitespace-nowrap">
              Preview
            </div>
          )}
        </div>

        {/* Morph stage */}
        <div className="w-full bg-ql-surface2 rounded-xl p-3 border border-ql">
          <div className="flex items-center justify-between mb-1">
            <span className="text-ql text-xs font-semibold">Body Stage {morphStage + 1}/5</span>
            <span className="text-ql-accent text-xs font-bold">{STAGE_LABELS[morphStage]}</span>
          </div>
          <p className="text-ql-3 text-[11px]">{STAGE_DESCS[morphStage]}</p>
          {/* Stage dots */}
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-all ${
                  i <= morphStage ? 'bg-ql-accent' : 'bg-ql-surface3'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Progress to next morph */}
      {morphStage < 4 && (
        <div className="bg-ql-surface rounded-2xl border border-ql p-4">
          <p className="text-ql text-sm font-semibold mb-1">Next Stage: {STAGE_LABELS[morphStage + 1]}</p>
          <p className="text-ql-3 text-xs">
            Keep logging good habits and maintaining your streak to evolve your character.
          </p>
          <div className="flex gap-3 mt-3">
            <div className="flex-1 text-center">
              <div className="text-ql text-base font-bold tabular-nums">{habitLog.length + (gymSessions?.length ?? 0)}</div>
              <div className="text-ql-3 text-[10px]">Activities logged</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-ql text-base font-bold tabular-nums">{streak}</div>
              <div className="text-ql-3 text-[10px]">Day streak</div>
            </div>
          </div>
        </div>
      )}

      {morphStage === 4 && (
        <div className="bg-ql-surface rounded-2xl border border-ql-accent p-4 text-center">
          <div className="text-2xl mb-1">🏆</div>
          <p className="text-ql-accent text-sm font-bold">Elite Status Achieved</p>
          <p className="text-ql-3 text-xs mt-0.5">Maximum body stage reached. Legendary.</p>
        </div>
      )}

      {/* ── Wardrobe ─────────────────────────────────────────────────────── */}
      <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-ql text-sm font-semibold">Wardrobe</p>
            <p className="text-ql-3 text-[11px] mt-0.5">Tap to equip</p>
          </div>
          <span />
        </div>

        {/* Free outfits */}
        <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wide mb-2">Free</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {OUTFITS.filter(o => !o.premium).map(o => {
            const active = (characterAppearance.outfit ?? 'default') === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setCharacterAppearance({ outfit: o.id, outfitColor: undefined })}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  active ? 'border-ql-accent bg-ql-surface2 shadow-ql-sm' : 'border-ql bg-ql-surface2 hover:bg-ql-surface3'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0 ${active ? 'bg-ql-accent/10' : 'bg-ql-surface3'}`}>
                  {o.icon}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${active ? 'text-ql-accent' : 'text-ql'}`}>{o.label}</p>
                  <p className="text-ql-3 text-[10px] truncate">{o.desc}</p>
                </div>
                {active && <span className="ml-auto text-ql-accent text-xs shrink-0">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Colour picker — shown when jeans / hoodie / tshirt is active */}
        {['jeans', 'hoodie', 'tshirt'].includes(characterAppearance.outfit ?? 'default') && (() => {
          const outfit = characterAppearance.outfit!;
          const colors =
            outfit === 'jeans'  ? JEANS_COLORS  :
            outfit === 'hoodie' ? HOODIE_COLORS : TSHIRT_COLORS;
          const label =
            outfit === 'jeans'  ? 'Jeans colour' :
            outfit === 'hoodie' ? 'Hoodie colour' : 'T-shirt colour';
          const current = characterAppearance.outfitColor ?? colors[0].hex;
          return (
            <div className="mb-4 bg-ql-surface2 rounded-xl border border-ql p-3">
              <p className="text-ql text-xs font-semibold mb-2.5">{label}</p>
              <div className="flex gap-2 flex-wrap">
                {colors.map(c => {
                  const active = current === c.hex;
                  return (
                    <button
                      key={c.hex}
                      onClick={() => setCharacterAppearance({ outfitColor: c.hex })}
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
        <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wide mb-2">Premium — 100,000 💰 each</p>
        <div className="flex flex-col gap-2">
          {OUTFITS.filter(o => o.premium).map(o => {
            const owned      = unlockedOutfits.includes(o.id);
            const active     = (characterAppearance.outfit ?? 'default') === o.id;
            const canBuy     = !owned; // gold requirement hidden for now
            const isPreviewing = previewOutfit === o.id;
            return (
              <div
                key={o.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  active || isPreviewing ? 'border-ql-accent bg-ql-surface2' : 'border-ql bg-ql-surface2'
                }`}
              >
                {/* Mini character — always tappable for preview */}
                <button
                  onClick={() => setPreviewOutfit(isPreviewing ? null : o.id)}
                  className="w-14 h-14 rounded-xl bg-ql-surface3 shrink-0 overflow-hidden flex items-center justify-center relative"
                >
                  <PixelCharacter
                    appearance={{ ...characterAppearance, outfit: o.id, outfitColor: undefined }}
                    morphStage={morphStage}
                    size={56}
                  />
                  {/* Small lock badge — doesn't block the preview click */}
                  {!owned && !isPreviewing && (
                    <div className="absolute top-0.5 right-0.5 bg-black/50 rounded-full w-4 h-4 flex items-center justify-center text-[9px]">🔒</div>
                  )}
                  {isPreviewing && (
                    <div className="absolute bottom-0 left-0 right-0 bg-ql-accent/90 text-[8px] text-white text-center font-bold py-0.5">
                      PREVIEW
                    </div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className={`text-xs font-semibold ${active ? 'text-ql-accent' : owned ? 'text-ql' : 'text-ql-3'}`}>{o.label}</p>
                    {!owned && <span className="text-[10px] bg-amber-500/15 text-amber-500 px-1.5 py-0.5 rounded-full font-medium">100k 💰</span>}
                    {owned && !active && <span className="text-[10px] bg-ql-accent/10 text-ql-accent px-1.5 py-0.5 rounded-full font-medium">Owned</span>}
                    {active && <span className="text-[10px] bg-ql-accent text-white px-1.5 py-0.5 rounded-full font-medium">Equipped</span>}
                  </div>
                  <p className="text-ql-3 text-[10px] mt-0.5">{o.desc}</p>
                </div>

                {owned ? (
                  <button
                    onClick={() => { setPreviewOutfit(null); setCharacterAppearance({ outfit: o.id, outfitColor: undefined }); }}
                    disabled={active}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      active ? 'bg-ql-accent text-white opacity-50' : 'bg-ql-accent text-white hover:bg-ql-accent-h'
                    }`}
                  >
                    {active ? 'On' : 'Wear'}
                  </button>
                ) : (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => setPreviewOutfit(isPreviewing ? null : o.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        isPreviewing ? 'bg-ql-accent text-white' : 'bg-ql-surface3 text-ql-2 hover:bg-ql-surface2'
                      }`}
                    >
                      {isPreviewing ? '✓ On' : 'Preview'}
                    </button>
                    <button
                      onClick={() => { if (purchaseOutfit(o.id)) { setPreviewOutfit(null); setCharacterAppearance({ outfit: o.id }); } }}
                      disabled={!canBuy}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        canBuy ? 'bg-amber-500 text-white hover:bg-amber-400' : 'bg-ql-surface3 text-ql-3 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {canBuy ? 'Buy' : '🔒 Buy'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
