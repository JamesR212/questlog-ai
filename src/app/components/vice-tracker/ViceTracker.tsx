'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { ViceDef, SubscriptionCategory, BudgetBucket } from '@/types';
import AIAdvisor from '../shared/AIAdvisor';

const EMOJI_SUGGESTIONS = ['🍕','🍷','🎰','☕','🍫','🛒','🚗','📱','🎮','🍟','🧁','🍻'];

const PRESET_REWARDS = [
  { id: 'cig',  label: 'Cigarette', emoji: '🚬', cost: 1 },
  { id: 'pint', label: 'Pint',      emoji: '🍺', cost: 3 },
  { id: 'take', label: 'Takeaway',  emoji: '🍔', cost: 3 },
];

const REWARD_EMOJIS = ['🍕','🍷','🎮','☕','🍫','🛒','🎬','🍦','🏋️','🎯','🎁','🍾'];

const TOKENS_PER_EARN = 3; // vice entries per token

const SUB_EMOJIS = ['📺','🎵','☁️','💪','🧘','🎬','📰','🎮','🛒','💊','🚗','📦','🔐','🌐','✈️','🍔'];
const SUB_CATEGORIES: { id: SubscriptionCategory; label: string; emoji: string }[] = [
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'health',        label: 'Health',         emoji: '💪' },
  { id: 'utilities',     label: 'Utilities',      emoji: '☁️' },
  { id: 'food',          label: 'Food',           emoji: '🍔' },
  { id: 'transport',     label: 'Transport',      emoji: '🚗' },
  { id: 'other',         label: 'Other',          emoji: '📦' },
];

function monthlyAmount(amount: number, cycle: 'weekly' | 'monthly' | 'annual'): number {
  if (cycle === 'annual') return amount / 12;
  if (cycle === 'weekly') return (amount * 52) / 12;
  return amount;
}

// ── Vices Tab ──────────────────────────────────────────────────────────────────

function VicesTab() {
  const {
    vices, viceDefs, logVice, addCustomVice, removeCustomVice, updateViceRate,
    currencySymbol, tokensSpent, tokenRedemptions, redeemTokens,
    customRewards, addCustomReward, removeCustomReward,
    hiddenPresetRewardIds, hidePresetReward,
    tokensPerEarn, setTokensPerEarn,
  } = useGameStore();

  const [counts, setCounts]         = useState<Record<string, number>>({});
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [rateInput, setRateInput]   = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVice, setNewVice]       = useState({ name: '', icon: '🎯', goldRate: '' });
  const [redeemed, setRedeemed]     = useState<string | null>(null);
  const [showAddReward, setShowAddReward] = useState(false);
  const [newReward, setNewReward]   = useState({ label: '', emoji: '🎁', cost: '' });
  const [editingTokenRate, setEditingTokenRate] = useState(false);
  const [tokenRateInput, setTokenRateInput]     = useState(String(tokensPerEarn));

  const sym        = currencySymbol;
  const totalSaved = vices.reduce((sum, v) => sum + v.goldSaved, 0);
  const todayStr   = new Date().toDateString();
  const todayVices = vices.filter((v) => new Date(v.date).toDateString() === todayStr);

  const tokensEarned = Math.floor(vices.length / tokensPerEarn);
  const available    = tokensEarned - tokensSpent;
  const progress     = vices.length % tokensPerEarn;
  const progressPct  = (progress / tokensPerEarn) * 100;

  const getCount = (id: string) => counts[id] ?? 0;

  const handleLog = (viceId: string) => {
    const count = getCount(viceId);
    if (count <= 0) return;
    logVice(viceId, count);
    setCounts({ ...counts, [viceId]: 0 });
  };

  const startEditRate = (def: ViceDef) => { setEditingRate(def.id); setRateInput(String(def.goldRate)); };
  const saveRate = (id: string) => {
    const val = parseFloat(rateInput);
    if (!isNaN(val) && val > 0) updateViceRate(id, val);
    setEditingRate(null);
  };

  const handleRedeem = (reward: { id: string; label: string; emoji: string; cost: number }) => {
    const ok = redeemTokens(reward.cost, reward.label, reward.emoji);
    if (ok) { setRedeemed(reward.id); setTimeout(() => setRedeemed(null), 3000); }
  };

  const handleAddReward = () => {
    const cost = parseInt(newReward.cost);
    if (!newReward.label.trim() || isNaN(cost) || cost <= 0) return;
    addCustomReward({ label: newReward.label.trim(), emoji: newReward.emoji, cost });
    setNewReward({ label: '', emoji: '🎁', cost: '' });
    setShowAddReward(false);
  };

  const allRewards = [
    ...PRESET_REWARDS.filter(r => !hiddenPresetRewardIds.includes(r.id)),
    ...customRewards,
  ];

  const handleAddVice = () => {
    const rate = parseFloat(newVice.goldRate);
    if (!newVice.name.trim() || isNaN(rate) || rate <= 0) return;
    addCustomVice({ name: newVice.name.trim(), icon: newVice.icon, goldRate: rate });
    setNewVice({ name: '', icon: '🎯', goldRate: '' });
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Total saved */}
      <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql px-5 py-4 flex items-center justify-between pulse-gold">
        <div>
          <p className="text-ql-3 text-xs font-medium mb-0.5">Total Saved</p>
          <div className="text-3xl font-bold text-amber-500 tabular-nums">{sym}{totalSaved.toFixed(2)}</div>
          <p className="text-ql-3 text-xs mt-0.5">{vices.length} entries logged</p>
        </div>
        <div className="text-5xl">💰</div>
      </div>

      {/* Token Bank */}
      <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-ql">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🪙</span>
              <span className="text-ql text-sm font-semibold">Token Bank</span>
            </div>
            <div className="flex items-center gap-1.5 bg-ql-surface2 rounded-xl px-3 py-1">
              <span className="text-amber-500 font-bold text-lg tabular-nums">{available}</span>
              <span className="text-ql-3 text-xs font-medium">tokens</span>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-ql-3 font-medium mb-1">
              <span>Progress to next token</span>
              <span className="tabular-nums">{progress} / {tokensPerEarn} skips</span>
            </div>
            <div className="h-1.5 bg-ql-surface3 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-ql-3 text-[10px]">Every {tokensPerEarn} skips = 1 token · {tokensEarned} earned total</p>
              {editingTokenRate ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number" min={1} max={50}
                    value={tokenRateInput}
                    onChange={e => setTokenRateInput(e.target.value)}
                    className="w-10 bg-ql-input border border-ql-input rounded-lg px-1 py-0.5 text-[10px] text-ql text-center outline-none focus:border-ql-accent"
                  />
                  <button
                    onClick={() => { const n = parseInt(tokenRateInput); if (n >= 1) setTokensPerEarn(n); setEditingTokenRate(false); }}
                    className="text-emerald-400 text-[10px] font-semibold">✓</button>
                  <button onClick={() => setEditingTokenRate(false)} className="text-ql-3 text-[10px]">✕</button>
                </div>
              ) : (
                <button onClick={() => { setTokenRateInput(String(tokensPerEarn)); setEditingTokenRate(true); }}
                  className="text-ql-3 text-[10px] underline underline-offset-2">edit</button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4">
          <p className="text-ql-3 text-xs font-medium mb-3">Redeem a reward</p>
          <div className="grid grid-cols-3 gap-2">
            {allRewards.map((r) => {
              const canAfford    = available >= r.cost;
              const justRedeemed = redeemed === r.id;
              const isCustom     = !PRESET_REWARDS.find(p => p.id === r.id);
              return (
                <div key={r.id} className="relative">
                  <button
                    onClick={() => handleRedeem(r)}
                    disabled={!canAfford}
                    className={`w-full flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-2xl border transition-all ${
                      justRedeemed ? 'bg-emerald-500/15 border-emerald-500/40' : canAfford ? 'bg-ql-surface2 border-ql hover:border-ql-accent' : 'bg-ql-surface2 border-ql opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span className={`text-3xl transition-transform duration-300 ${justRedeemed ? 'scale-125' : ''}`}>{r.emoji}</span>
                    <span className="text-ql text-xs font-semibold">{r.label}</span>
                    <div className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${justRedeemed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>
                      {justRedeemed ? '✓ Enjoy it!' : `${r.cost} 🪙`}
                    </div>
                  </button>
                  <button
                    onClick={() => isCustom ? removeCustomReward(r.id) : hidePresetReward(r.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ql-surface3 border border-ql rounded-full text-ql-3 hover:text-red-500 text-[10px] flex items-center justify-center transition-colors"
                  >✕</button>
                </div>
              );
            })}
          </div>

          {showAddReward ? (
            <div className="mt-3 bg-ql-surface2 rounded-2xl border border-ql p-3 flex flex-col gap-2">
              <p className="text-ql text-xs font-semibold">New Reward</p>
              <div className="flex flex-wrap gap-1.5">
                {REWARD_EMOJIS.map(e => (
                  <button key={e} onClick={() => setNewReward({ ...newReward, emoji: e })}
                    className={`text-xl w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${newReward.emoji === e ? 'bg-ql-accent text-white' : 'bg-ql-surface hover:bg-ql-surface3'}`}
                  >{e}</button>
                ))}
              </div>
              <input type="text" placeholder="Reward name..." value={newReward.label}
                onChange={e => setNewReward({ ...newReward, label: e.target.value })}
                className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
              />
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Token cost" min={1} value={newReward.cost}
                  onChange={e => setNewReward({ ...newReward, cost: e.target.value })}
                  onFocus={e => e.target.select()}
                  className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
                />
                <span className="text-ql-3 text-xs">🪙 tokens</span>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddReward} className="flex-1 py-2 bg-ql-accent hover:bg-ql-accent-h text-white text-sm font-medium rounded-xl transition-colors">Add Reward</button>
                <button onClick={() => setShowAddReward(false)} className="px-4 py-2 bg-ql-surface3 text-ql-2 text-sm rounded-xl">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddReward(true)} className="w-full mt-3 py-2.5 border border-dashed border-ql rounded-2xl text-ql-3 hover:text-ql hover:border-ql-accent text-xs font-medium transition-colors">
              + Add custom reward
            </button>
          )}

          {available === 0 && !showAddReward && (
            <p className="text-ql-3 text-xs text-center mt-3">Keep skipping vices to earn tokens 💪</p>
          )}
        </div>

        {tokenRedemptions.length > 0 && (
          <div className="border-t border-ql px-4 py-3">
            <p className="text-ql-3 text-[10px] font-medium mb-2">Recent redemptions</p>
            <div className="flex flex-col gap-1.5">
              {tokenRedemptions.slice(-4).reverse().map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span>{r.emoji}</span>
                    <span className="text-ql-2">{r.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 font-medium">−{r.cost} 🪙</span>
                    <span className="text-ql-3">{new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Vice cards */}
      <div className="flex flex-col gap-3">
        {viceDefs.map((def) => {
          const todayCount    = todayVices.filter((v) => v.type === def.id).reduce((s, v) => s + v.count, 0);
          const count         = getCount(def.id);
          const potential     = def.goldRate * count;
          const isEditingThis = editingRate === def.id;

          return (
            <div key={def.id} className="bg-ql-surface rounded-2xl shadow-ql border border-ql px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{def.icon}</span>
                  <div>
                    <p className="text-ql text-sm font-semibold">{def.name}</p>
                    {isEditingThis ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-ql-3 text-xs">{sym}</span>
                        <input type="number" step="0.01" value={rateInput}
                          onChange={(e) => setRateInput(e.target.value)}
                          onBlur={() => saveRate(def.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveRate(def.id); if (e.key === 'Escape') setEditingRate(null); }}
                          autoFocus
                          className="w-16 bg-ql-input border border-ql-accent rounded-lg px-2 py-0.5 text-xs text-ql outline-none"
                        />
                        <span className="text-ql-3 text-xs">per skip</span>
                      </div>
                    ) : (
                      <button onClick={() => startEditRate(def)} className="text-ql-3 text-xs mt-0.5 hover:text-ql-accent transition-colors text-left">
                        {sym}{def.goldRate.toFixed(2)} per skip · <span className="underline underline-offset-2">edit</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {todayCount > 0 && (
                    <div className="bg-ql-surface2 rounded-xl px-2.5 py-1">
                      <span className="text-ql text-xs font-semibold tabular-nums">{todayCount} today</span>
                    </div>
                  )}
                  <button onClick={() => removeCustomVice(def.id)} className="text-ql-3 hover:text-red-500 text-xs transition-colors">✕</button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setCounts({ ...counts, [def.id]: Math.max(0, count - 1) })}
                  className="w-9 h-9 flex items-center justify-center bg-ql-surface3 hover:bg-ql-surface2 rounded-xl text-ql font-semibold text-lg transition-colors">−</button>
                <span className="text-xl font-bold text-ql w-8 text-center tabular-nums">{count}</span>
                <button onClick={() => setCounts({ ...counts, [def.id]: count + 1 })}
                  className="w-9 h-9 flex items-center justify-center bg-ql-surface3 hover:bg-ql-surface2 rounded-xl text-ql font-semibold text-lg transition-colors">+</button>
                <button onClick={() => handleLog(def.id)} disabled={count === 0}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white transition-colors">
                  {potential > 0 ? `Save +${sym}${potential.toFixed(2)}` : 'Log Skipped'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add custom vice */}
      {showAddForm ? (
        <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-4 flex flex-col gap-3">
          <p className="text-ql text-sm font-semibold">Add Custom Vice</p>
          <div>
            <p className="text-ql-3 text-xs font-medium mb-1.5">Icon</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {EMOJI_SUGGESTIONS.map((e) => (
                <button key={e} onClick={() => setNewVice({ ...newVice, icon: e })}
                  className={`text-xl w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${newVice.icon === e ? 'bg-ql-accent text-white' : 'bg-ql-surface2 hover:bg-ql-surface3'}`}
                >{e}</button>
              ))}
            </div>
            <input type="text" placeholder="Or type any emoji..." value={newVice.icon}
              onChange={(e) => setNewVice({ ...newVice, icon: e.target.value })}
              className="w-full bg-ql-input border border-ql-input rounded-xl px-3.5 py-2.5 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
            />
          </div>
          <input type="text" placeholder="Vice name (e.g. Takeaway, Wine)" value={newVice.name}
            onChange={(e) => setNewVice({ ...newVice, name: e.target.value })}
            className="w-full bg-ql-input border border-ql-input rounded-xl px-3.5 py-2.5 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
          />
          <div className="flex items-center gap-2">
            <span className="text-ql-3 text-sm font-medium">{sym}</span>
            <input type="number" placeholder="0.00" min="0.01" step="0.01" value={newVice.goldRate}
              onChange={(e) => setNewVice({ ...newVice, goldRate: e.target.value })}
              className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3.5 py-2.5 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
            />
            <span className="text-ql-3 text-xs">saved per skip</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddVice} className="flex-1 py-2.5 bg-ql-accent hover:bg-ql-accent-h text-white text-sm font-medium rounded-xl transition-colors">Add Vice</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2.5 bg-ql-surface3 text-ql-2 text-sm rounded-xl">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddForm(true)} className="w-full py-3 border border-dashed border-ql rounded-2xl text-ql-3 hover:text-ql hover:border-ql-accent text-sm font-medium transition-colors">
          + Add your own vice
        </button>
      )}

      {/* Recent log */}
      {vices.length > 0 && (
        <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql overflow-hidden">
          <div className="px-4 py-3 border-b border-ql">
            <p className="text-ql text-sm font-semibold">Recent Restraint</p>
          </div>
          <div className="px-4 py-3 flex flex-col gap-2.5">
            {vices.slice(-6).reverse().map((v) => {
              const def = viceDefs.find((d) => d.id === v.type);
              const dateLabel = new Date(v.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
              return (
                <div key={v.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <span>{def?.icon ?? '✓'}</span>
                    <div className="min-w-0">
                      <span className="text-ql-2">Skipped {v.count}× {def?.name ?? v.type}</span>
                      <p className="text-ql-3 text-[10px]">{dateLabel}</p>
                    </div>
                  </div>
                  <span className="text-amber-500 text-sm font-semibold tabular-nums shrink-0 ml-2">+{sym}{v.goldSaved.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AIAdvisor section="vices" />
    </div>
  );
}

// ── Small toggle switch ────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${on ? 'bg-ql-accent' : 'bg-ql-surface3'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${on ? 'left-[18px]' : 'left-0.5'}`}
      />
    </button>
  );
}

// Convert any frequency to a monthly amount
function toMonthly(amount: number, frequency: 'weekly' | 'monthly' | 'annual' | 'one_off'): number {
  if (frequency === 'weekly')  return (amount * 52) / 12;
  if (frequency === 'annual')  return amount / 12;
  if (frequency === 'one_off') return 0; // one-off payments don't count toward recurring monthly budget
  return amount;
}

const BUDGET_EMOJIS = ['🏠','🛒','🚗','💊','🍔','🎉','🍺','☕','🎬','🎮','👗','✈️','🐾','💳','📚','💡'];

// ── Period spend helper ────────────────────────────────────────────────────────
function getMonday(d: Date): Date {
  const dd = new Date(d);
  dd.setDate(dd.getDate() - ((dd.getDay() + 6) % 7));
  dd.setHours(0, 0, 0, 0);
  return dd;
}

function getPeriodSpend(
  log: import('@/types').SpendingEntry[],
  itemId: string,
  frequency: 'weekly' | 'monthly' | 'annual' | 'one_off',
): number {
  const now = new Date();
  return log
    .filter(e => e.budgetItemId === itemId)
    .filter(e => {
      if (frequency === 'one_off') return true; // show all-time total
      const d = new Date(e.date + 'T00:00:00');
      if (frequency === 'weekly') {
        const start = getMonday(now);
        const end   = new Date(start); end.setDate(start.getDate() + 7);
        return d >= start && d < end;
      }
      if (frequency === 'monthly') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      return d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + e.amount, 0);
}

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Budget Item Row (with spend logging) ──────────────────────────────────────
function BudgetItemRow({ item, sym }: { item: import('@/types').BudgetItem; sym: string }) {
  const { spendingLog, addSpendingEntry, removeSpendingEntry, updateBudgetItem, removeBudgetItem, addCalendarEvent, deleteCalendarEvent } = useGameStore();

  function getBudgetPaymentDates(frequency: import('@/types').BudgetItem['frequency']): string[] {
    const dates: string[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const anchor = item.startDate ? new Date(item.startDate + 'T00:00:00') : new Date(today);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (frequency === 'one_off') {
      dates.push(fmt(anchor < today ? today : anchor));
    } else if (frequency === 'weekly') {
      const limit = new Date(today); limit.setFullYear(limit.getFullYear() + 1);
      const cur = new Date(anchor);
      while (cur < today) cur.setDate(cur.getDate() + 7);
      while (cur <= limit) { dates.push(fmt(cur)); cur.setDate(cur.getDate() + 7); }
    } else if (frequency === 'monthly') {
      const limit = new Date(today); limit.setFullYear(limit.getFullYear() + 1);
      const cur = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
      while (cur < today) cur.setMonth(cur.getMonth() + 1);
      while (cur <= limit) { dates.push(fmt(cur)); cur.setMonth(cur.getMonth() + 1); }
    } else {
      const far = new Date(today); far.setFullYear(far.getFullYear() + 3);
      const cur = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
      while (cur < today) cur.setFullYear(cur.getFullYear() + 1);
      while (cur <= far) { dates.push(fmt(cur)); cur.setFullYear(cur.getFullYear() + 1); }
    }
    return dates;
  }

  function toggleCalendarSync() {
    if (item.syncToCalendar) {
      for (const id of item.linkedCalendarEventIds ?? []) deleteCalendarEvent(id);
      updateBudgetItem(item.id, { syncToCalendar: false, linkedCalendarEventIds: [] });
    } else {
      const dates = getBudgetPaymentDates(item.frequency);
      const freqLabel = item.frequency === 'weekly' ? 'weekly' : item.frequency === 'annual' ? 'annual' : item.frequency === 'one_off' ? 'one-off' : 'monthly';
      for (const date of dates) {
        addCalendarEvent({
          title: `${item.emoji} ${item.name} payment`,
          date,
          startTime: '', endTime: '', allDay: true,
          location: '',
          notes: `${freqLabel} budget item · ${sym}${item.amount.toFixed(2)}`,
          color: '#ff9500',
          reminder: 0,
        });
      }
      const { calendarEvents } = useGameStore.getState();
      const newIds = calendarEvents.slice(-dates.length).map(e => e.id);
      updateBudgetItem(item.id, { syncToCalendar: true, linkedCalendarEventIds: newIds });
    }
  }
  const [logging, setLogging]   = useState(false);
  const [spendAmt, setSpendAmt] = useState('');
  const [spendNote, setSpendNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const freqLabel   = item.frequency === 'weekly' ? 'wk' : item.frequency === 'annual' ? 'yr' : item.frequency === 'one_off' ? '1x' : 'mo';
  const periodLabel = item.frequency === 'weekly' ? 'this week' : item.frequency === 'annual' ? 'this year' : item.frequency === 'one_off' ? 'total' : 'this month';
  const mo          = toMonthly(item.amount, item.frequency);
  const spent       = getPeriodSpend(spendingLog, item.id, item.frequency);
  const budget      = item.amount;
  const remaining   = budget - spent;
  const spentPct    = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const over        = spent > budget;

  const itemHistory = spendingLog
    .filter(e => e.budgetItemId === item.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const handleLog = () => {
    const amount = parseFloat(spendAmt);
    if (isNaN(amount) || amount <= 0) return;
    addSpendingEntry({ budgetItemId: item.id, amount, note: spendNote.trim(), date: todayDateStr() });
    setSpendAmt('');
    setSpendNote('');
    setLogging(false);
  };

  return (
    <div className="bg-ql-surface rounded-xl border border-ql overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-2">
        <span className="text-xl shrink-0">{item.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-ql text-xs font-semibold truncate">{item.name}</p>
          <p className="text-ql-3 text-[10px]">
            {sym}{item.amount.toFixed(2)}/{freqLabel}
            {item.frequency !== 'monthly' && item.frequency !== 'one_off' && <span className="ml-1">· {sym}{mo.toFixed(2)}/mo</span>}
            {item.startDate && <span className="ml-1">· from {item.startDate}</span>}
          </p>
        </div>
        {/* Pin to home toggle */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <Toggle on={item.pinToHome} onToggle={() => updateBudgetItem(item.id, { pinToHome: !item.pinToHome })} />
          <span className="text-ql-3 text-[8px] font-medium">Home</span>
        </div>
        {/* Log spend button */}
        <button
          onClick={() => { setLogging(l => !l); setShowHistory(false); }}
          className="shrink-0 px-2.5 py-1.5 bg-ql-accent text-white text-[11px] font-semibold rounded-lg transition-colors hover:bg-ql-accent-h"
        >+ Spend</button>
        <button onClick={() => removeBudgetItem(item.id)} className="text-ql-3 hover:text-red-500 text-xs transition-colors shrink-0">✕</button>
      </div>

      {/* Progress bar */}
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-semibold tabular-nums ${over ? 'text-red-400' : 'text-ql-3'}`}>
            {sym}{spent.toFixed(2)} spent {periodLabel}
          </span>
          <span className={`text-[10px] font-semibold tabular-nums ${over ? 'text-red-400' : 'text-emerald-400'}`}>
            {over ? `${sym}${(spent - budget).toFixed(2)} over` : `${sym}${remaining.toFixed(2)} left`}
          </span>
        </div>
        <div className="h-1.5 bg-ql-surface3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : spentPct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
            style={{ width: `${spentPct}%` }}
          />
        </div>
        {itemHistory.length > 0 && (
          <button onClick={() => { setShowHistory(h => !h); setLogging(false); }}
            className="text-ql-3 text-[10px] mt-1 hover:text-ql transition-colors"
          >{showHistory ? 'Hide history' : `${itemHistory.length} entries — view`}</button>
        )}
      </div>

      {/* Calendar sync toggle */}
      <div className="flex items-center gap-2 px-3 pb-2">
        <Toggle on={!!item.syncToCalendar} onToggle={toggleCalendarSync} />
        <span className="text-ql-3 text-[10px]">
          {item.syncToCalendar ? '📅 Synced to calendar' : 'Sync with calendar'}
        </span>
      </div>

      {/* Log spend form */}
      {logging && (
        <div className="border-t border-ql px-3 py-3 flex flex-col gap-2 bg-ql-surface2">
          <p className="text-ql text-xs font-semibold">Log a spend</p>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-ql-3 text-sm">{sym}</span>
              <input
                type="number" placeholder="0.00" min="0.01" step="0.01"
                value={spendAmt}
                onChange={e => setSpendAmt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLog()}
                autoFocus
                className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent"
              />
            </div>
            <input
              type="text" placeholder="Note (optional)"
              value={spendNote}
              onChange={e => setSpendNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLog()}
              className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleLog} className="flex-1 py-2 bg-ql-accent hover:bg-ql-accent-h text-white text-xs font-semibold rounded-xl">Save</button>
            <button onClick={() => setLogging(false)} className="px-4 py-2 bg-ql-surface3 text-ql-2 text-xs rounded-xl">Cancel</button>
          </div>
        </div>
      )}

      {/* Spend history */}
      {showHistory && itemHistory.length > 0 && (
        <div className="border-t border-ql px-3 py-2 flex flex-col gap-1.5 bg-ql-surface2">
          {itemHistory.map(entry => (
            <div key={entry.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-ql-3 text-[10px] shrink-0">
                  {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
                {entry.note && <span className="text-ql-2 truncate">{entry.note}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-ql font-semibold tabular-nums">{sym}{entry.amount.toFixed(2)}</span>
                <button onClick={() => removeSpendingEntry(entry.id)} className="text-ql-3 hover:text-red-500 text-[10px] transition-colors">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Budget Bucket Panel ────────────────────────────────────────────────────────
function BucketPanel({
  bucket, label, icon, bucketColor, bucketBar, bucketBg, budgetAmount, sym, viceSavings = 0,
}: {
  bucket: BudgetBucket;
  label: string;
  icon: string;
  bucketColor: string;
  bucketBar: string;
  bucketBg: string;
  budgetAmount: number;
  sym: string;
  viceSavings?: number;
}) {
  const { budgetItems, spendingLog, addBudgetItem } = useGameStore();
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', emoji: '🏠', amount: '', frequency: 'monthly' as 'weekly' | 'monthly' | 'annual' | 'one_off', startDate: todayDateStr() });

  const items           = budgetItems.filter(i => i.bucket === bucket);
  const allocatedMonthly = items.reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0) + viceSavings;
  const remaining        = budgetAmount - allocatedMonthly;
  const allocPct         = budgetAmount > 0 ? Math.min(100, (allocatedMonthly / budgetAmount) * 100) : 0;

  // Total spent this period across all items in bucket (using each item's own frequency)
  const totalSpent = items.reduce((s, i) => s + getPeriodSpend(spendingLog, i.id, i.frequency), 0);

  const handleAdd = () => {
    const amount = parseFloat(newItem.amount);
    if (!newItem.name.trim() || isNaN(amount) || amount <= 0) return;
    addBudgetItem({ bucket, name: newItem.name.trim(), emoji: newItem.emoji, amount, frequency: newItem.frequency, startDate: newItem.startDate || undefined, pinToHome: false });
    setNewItem({ name: '', emoji: '🏠', amount: '', frequency: 'monthly' as 'weekly' | 'monthly' | 'annual' | 'one_off', startDate: todayDateStr() });
    setShowAdd(false);
  };

  return (
    <div className={`rounded-xl border border-ql overflow-hidden bg-ql-surface2`}>
      {/* Header row — always visible, click to expand */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) setShowAdd(false); }}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ${bucketBg}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-bold ${bucketColor}`}>{label}</p>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <span className="text-ql-3 text-[10px] tabular-nums">{sym}{totalSpent.toFixed(0)} spent</span>
              )}
              <span className="text-ql text-xs font-bold tabular-nums">{sym}{budgetAmount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
          <div className="h-1 bg-ql-surface3 rounded-full overflow-hidden">
            <div className={`h-full ${bucketBar} rounded-full transition-all`} style={{ width: `${allocPct}%` }} />
          </div>
          {items.length > 0 && (
            <p className="text-ql-3 text-[10px] mt-1">
              {sym}{allocatedMonthly.toFixed(0)} allocated · {sym}{Math.abs(remaining).toFixed(0)} {remaining >= 0 ? 'free' : 'over budget'}
            </p>
          )}
        </div>
        <span className={`text-ql-3 text-xs ml-1 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-ql px-3 pb-3 pt-2 flex flex-col gap-2">
          {items.length === 0 && !showAdd && (
            <p className="text-ql-3 text-[11px] text-center py-2">No items yet — add your first allocation.</p>
          )}

          {items.map(item => (
            <BudgetItemRow key={item.id} item={item} sym={sym} />
          ))}

          {/* Vice savings contribution */}
          {viceSavings > 0 && (
            <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2.5">
              <span className="text-lg shrink-0">🍺</span>
              <div className="flex-1 min-w-0">
                <p className="text-emerald-400 text-xs font-semibold">Vice Savings</p>
                <p className="text-ql-3 text-[10px]">Saved by skipping vices — all time</p>
              </div>
              <span className="text-emerald-400 text-sm font-bold tabular-nums shrink-0">+{sym}{viceSavings.toFixed(2)}</span>
            </div>
          )}

          {/* Add item form */}
          {showAdd ? (
            <div className="bg-ql-surface rounded-xl border border-ql p-3 flex flex-col gap-2 mt-0.5">
              <p className="text-ql text-xs font-semibold">New {label} item</p>
              <div className="flex flex-wrap gap-1.5">
                {BUDGET_EMOJIS.map(e => (
                  <button key={e} onClick={() => setNewItem({ ...newItem, emoji: e })}
                    className={`text-lg w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${newItem.emoji === e ? 'bg-ql-accent text-white' : 'bg-ql-surface2 hover:bg-ql-surface3'}`}
                  >{e}</button>
                ))}
              </div>
              <input type="text" placeholder="e.g. Food allowance, Pub night..." value={newItem.name}
                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent"
              />
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-ql-3 text-sm">{sym}</span>
                  <input type="number" placeholder="0.00" min="0.01" step="0.01" value={newItem.amount}
                    onChange={e => setNewItem({ ...newItem, amount: e.target.value })}
                    className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent"
                  />
                </div>
                <div className="flex gap-0.5 bg-ql-surface2 rounded-xl p-0.5 border border-ql">
                  {(['weekly', 'monthly', 'annual', 'one_off'] as const).map(f => (
                    <button key={f} onClick={() => setNewItem({ ...newItem, frequency: f })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${newItem.frequency === f ? 'bg-ql-accent text-white' : 'text-ql-3'}`}
                    >{{ weekly: 'Wk', monthly: 'Mo', annual: 'Yr', one_off: '1×' }[f]}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-ql-3 text-xs whitespace-nowrap">Start date</label>
                <input type="date" value={newItem.startDate}
                  onChange={e => setNewItem({ ...newItem, startDate: e.target.value })}
                  className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} className="flex-1 py-2 bg-ql-accent hover:bg-ql-accent-h text-white text-xs font-semibold rounded-xl">Add</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-ql-surface3 text-ql-2 text-xs rounded-xl">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)}
              className="w-full py-2 border border-dashed border-ql rounded-xl text-ql-3 hover:text-ql hover:border-ql-accent text-xs font-medium transition-colors"
            >+ Add item</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Subscription row with inline edit ─────────────────────────────────────────
function SubRow({
  s, sym, onToggleSync,
}: {
  s: import('@/types').Subscription;
  sym: string;
  onToggleSync: (s: import('@/types').Subscription) => void;
}) {
  const { updateSubscription, removeSubscription } = useGameStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: s.name,
    emoji: s.emoji,
    amount: String(s.amount),
    cycle: s.cycle,
    category: s.category,
    startDate: s.startDate ?? '',
  });

  const monthly = monthlyAmount(s.amount, s.cycle);

  const saveEdit = () => {
    const amount = parseFloat(draft.amount);
    if (!draft.name.trim() || isNaN(amount) || amount <= 0) return;
    updateSubscription(s.id, {
      name: draft.name.trim(),
      emoji: draft.emoji,
      amount,
      cycle: draft.cycle,
      category: draft.category,
      startDate: draft.startDate || undefined,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-ql-surface2 rounded-xl border border-ql-accent/40 p-3 flex flex-col gap-2 mb-1.5">
        <div className="flex flex-wrap gap-1.5">
          {SUB_EMOJIS.map(e => (
            <button key={e} onClick={() => setDraft({ ...draft, emoji: e })}
              className={`text-xl w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${draft.emoji === e ? 'bg-ql-accent text-white' : 'bg-ql-surface hover:bg-ql-surface3'}`}
            >{e}</button>
          ))}
        </div>
        <input type="text" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
          className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent"
        />
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <span className="text-ql-3 text-sm">{sym}</span>
            <input type="number" placeholder="0.00" min="0.01" step="0.01" value={draft.amount}
              onChange={e => setDraft({ ...draft, amount: e.target.value })}
              className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent"
            />
          </div>
          <div className="flex gap-0.5 bg-ql-surface rounded-xl p-0.5 border border-ql">
            {(['weekly', 'monthly', 'annual'] as const).map(c => (
              <button key={c} onClick={() => setDraft({ ...draft, cycle: c })}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${draft.cycle === c ? 'bg-ql-accent text-white' : 'text-ql-3'}`}
              >{{ weekly: 'Wk', monthly: 'Mo', annual: 'Yr' }[c]}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-ql-3 text-xs whitespace-nowrap">Start date</label>
          <input type="date" value={draft.startDate} onChange={e => setDraft({ ...draft, startDate: e.target.value })}
            className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUB_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setDraft({ ...draft, category: cat.id })}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-medium transition-colors border ${draft.category === cat.id ? 'border-ql-accent bg-ql-accent/10 text-ql-accent' : 'border-ql bg-ql-surface text-ql-3'}`}
            >{cat.emoji} {cat.label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={saveEdit} className="flex-1 py-2 bg-ql-accent text-white text-xs font-semibold rounded-xl">Save</button>
          <button onClick={() => setEditing(false)} className="px-4 py-2 bg-ql-surface3 text-ql-2 text-xs rounded-xl">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-ql-surface2 rounded-xl border border-ql mb-1.5 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <span className="text-2xl shrink-0">{s.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-ql text-xs font-semibold truncate">{s.name}</p>
          <p className="text-ql-3 text-[10px]">
            {sym}{s.amount.toFixed(2)} / {s.cycle === 'annual' ? 'yr' : s.cycle === 'weekly' ? 'wk' : 'mo'}
            {s.cycle !== 'monthly' && <span className="ml-1">· {sym}{monthly.toFixed(2)}/mo</span>}
            {s.startDate && <span className="ml-1">· from {s.startDate}</span>}
          </p>
        </div>
        <button onClick={() => setEditing(true)} className="text-ql-3 hover:text-ql text-xs transition-colors shrink-0 px-1">✏️</button>
        <button onClick={() => removeSubscription(s.id)} className="text-ql-3 hover:text-red-500 text-xs transition-colors shrink-0">✕</button>
      </div>
      <div className="flex items-center gap-2 px-3 pb-2.5">
        <Toggle on={!!s.syncToCalendar} onToggle={() => onToggleSync(s)} />
        <span className="text-ql-3 text-[10px]">
          {s.syncToCalendar ? '📅 Synced to calendar' : 'Sync with calendar'}
        </span>
      </div>
    </div>
  );
}

// ── Finances Tab ───────────────────────────────────────────────────────────────

function FinancesTab() {
  const {
    subscriptions, addSubscription, updateSubscription, removeSubscription,
    paycheckIncome, setPaycheckIncome,
    paycheckFrequency, setPaycheckFrequency,
    incomeMode, setIncomeMode,
    paycheckLog, addPaycheckEntry, removePaycheckEntry,
    currencySymbol,
    addCalendarEvent, deleteCalendarEvent,
    vices,
  } = useGameStore();

  const totalViceSavings = vices.reduce((sum, v) => sum + v.goldSaved, 0);
  const sym = currencySymbol;

  const [showAddSub, setShowAddSub] = useState(false);
  const [newSub, setNewSub] = useState({ name: '', emoji: '📺', amount: '', cycle: 'monthly' as 'weekly' | 'monthly' | 'annual', category: 'entertainment' as SubscriptionCategory, startDate: todayDateStr() });
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [splitMode, setSplitMode] = useState<'50/30/20' | 'custom'>('50/30/20');
  const [customSplit, setCustomSplit] = useState({ needs: '50', wants: '30', savings: '20' });
  const [showAddPaycheck, setShowAddPaycheck] = useState(false);
  const [newPaycheck, setNewPaycheck] = useState({ amount: '', date: todayDateStr(), note: '' });

  const monthlySubTotal = subscriptions.reduce((sum, s) => sum + monthlyAmount(s.amount, s.cycle), 0);

  // Build upcoming payment dates for a subscription
  function getPaymentDates(s: import('@/types').Subscription): string[] {
    const dates: string[] = [];
    const anchor = s.startDate ? new Date(s.startDate + 'T00:00:00') : new Date();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const limit = new Date(today); limit.setFullYear(limit.getFullYear() + 1);
    // Find the first occurrence on or after today
    const cur = new Date(anchor);
    if (s.cycle === 'weekly') {
      while (cur < today) cur.setDate(cur.getDate() + 7);
      while (cur <= limit) {
        dates.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`);
        cur.setDate(cur.getDate() + 7);
      }
    } else if (s.cycle === 'monthly') {
      while (cur < today) cur.setMonth(cur.getMonth() + 1);
      while (cur <= limit) {
        dates.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`);
        cur.setMonth(cur.getMonth() + 1);
      }
    } else {
      // annual — up to 3 years
      const far = new Date(today); far.setFullYear(far.getFullYear() + 3);
      while (cur < today) cur.setFullYear(cur.getFullYear() + 1);
      while (cur <= far) {
        dates.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`);
        cur.setFullYear(cur.getFullYear() + 1);
      }
    }
    return dates;
  }

  function toggleCalendarSync(s: import('@/types').Subscription) {
    if (s.syncToCalendar) {
      // Remove previously linked events
      for (const evId of s.linkedCalendarEventIds ?? []) deleteCalendarEvent(evId);
      updateSubscription(s.id, { syncToCalendar: false, linkedCalendarEventIds: [] });
    } else {
      const dates = getPaymentDates(s);
      const cycleLabel = s.cycle === 'weekly' ? 'weekly' : s.cycle === 'annual' ? 'annual' : 'monthly';
      for (const date of dates) {
        // addCalendarEvent returns void, so we capture the id via the store directly after
        addCalendarEvent({
          title: `${s.emoji} ${s.name} payment`,
          date,
          startTime: '',
          endTime: '',
          allDay: true,
          location: '',
          notes: `${cycleLabel} subscription · ${currencySymbol}${s.amount.toFixed(2)}`,
          color: '#007aff',
          reminder: 0,
        });
      }
      // Grab the newly added event IDs (they'll be the last N in the store)
      const { calendarEvents } = useGameStore.getState();
      const newIds = calendarEvents.slice(-dates.length).map(e => e.id);
      updateSubscription(s.id, { syncToCalendar: true, linkedCalendarEventIds: newIds });
    }
  }

  const handleAddSub = () => {
    const amount = parseFloat(newSub.amount);
    if (!newSub.name.trim() || isNaN(amount) || amount <= 0) return;
    addSubscription({ name: newSub.name.trim(), emoji: newSub.emoji, amount, cycle: newSub.cycle, category: newSub.category, startDate: newSub.startDate || undefined });
    setNewSub({ name: '', emoji: '📺', amount: '', cycle: 'monthly' as 'weekly' | 'monthly' | 'annual', category: 'entertainment', startDate: todayDateStr() });
    setShowAddSub(false);
  };

  const saveIncome = () => {
    const val = parseFloat(incomeInput);
    if (!isNaN(val) && val >= 0) setPaycheckIncome(val);
    setEditingIncome(false);
  };

  const handleAddPaycheck = () => {
    const amount = parseFloat(newPaycheck.amount);
    if (isNaN(amount) || amount <= 0) return;
    addPaycheckEntry({ amount, date: newPaycheck.date, note: newPaycheck.note.trim() || undefined });
    setNewPaycheck({ amount: '', date: todayDateStr(), note: '' });
    setShowAddPaycheck(false);
  };

  // Monthly income: salary mode converts by frequency; variable = sum of this month's paychecks
  const salaryMonthly = toMonthly(paycheckIncome, paycheckFrequency);
  const now = new Date();
  const variableMonthly = paycheckLog
    .filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((s, e) => s + e.amount, 0);

  const effectiveMonthly = incomeMode === 'salary' ? salaryMonthly : variableMonthly;
  const hasIncome = effectiveMonthly > 0;

  const needs   = splitMode === '50/30/20' ? effectiveMonthly * 0.5  : effectiveMonthly * (parseFloat(customSplit.needs)   / 100);
  const wants   = splitMode === '50/30/20' ? effectiveMonthly * 0.3  : effectiveMonthly * (parseFloat(customSplit.wants)   / 100);
  const savings = splitMode === '50/30/20' ? effectiveMonthly * 0.2  : effectiveMonthly * (parseFloat(customSplit.savings) / 100);
  const freeMoney = Math.max(0, effectiveMonthly - monthlySubTotal);
  const subPct = hasIncome ? Math.min(100, (monthlySubTotal / effectiveMonthly) * 100) : 0;

  const byCategory: Partial<Record<SubscriptionCategory, typeof subscriptions>> = {};
  for (const s of subscriptions) {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category]!.push(s);
  }

  const freqLabel = { weekly: '/week', monthly: '/month', annual: '/year' }[paycheckFrequency];

  return (
    <div className="flex flex-col gap-4">

      {/* ── Monthly Overview ────────────────────────────────── */}
      <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql p-5">
        {/* Income mode switcher */}
        <div className="flex gap-1 bg-ql-surface2 rounded-xl p-0.5 border border-ql mb-4">
          {([
            { id: 'salary',   label: '💼 Salary' },
            { id: 'variable', label: '📅 Variable' },
          ] as const).map(m => (
            <button key={m.id} onClick={() => setIncomeMode(m.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${incomeMode === m.id ? 'bg-ql-accent text-white' : 'text-ql-3 hover:text-ql'}`}
            >{m.label}</button>
          ))}
        </div>

        {/* Salary mode — fixed income + frequency */}
        {incomeMode === 'salary' && (
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-ql text-sm font-semibold">Take-home Pay</p>
              <p className="text-ql-3 text-xs mt-0.5">Your net pay after tax</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {/* Frequency picker */}
              <div className="flex gap-0.5 bg-ql-surface2 rounded-xl p-0.5 border border-ql">
                {(['weekly', 'monthly', 'annual'] as const).map(f => (
                  <button key={f} onClick={() => setPaycheckFrequency(f)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${paycheckFrequency === f ? 'bg-ql-accent text-white' : 'text-ql-3'}`}
                  >{{ weekly: 'Wk', monthly: 'Mo', annual: 'Yr' }[f]}</button>
                ))}
              </div>
              {editingIncome ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-ql-3 text-sm">{sym}</span>
                  <input type="number" value={incomeInput}
                    onChange={e => setIncomeInput(e.target.value)}
                    onBlur={saveIncome}
                    onKeyDown={e => { if (e.key === 'Enter') saveIncome(); if (e.key === 'Escape') setEditingIncome(false); }}
                    autoFocus
                    className="w-24 bg-ql-input border border-ql-accent rounded-xl px-3 py-1.5 text-sm text-ql outline-none text-right"
                  />
                </div>
              ) : (
                <button
                  onClick={() => { setIncomeInput(String(paycheckIncome)); setEditingIncome(true); }}
                  className={`text-right ${paycheckIncome > 0 ? 'text-ql text-xl font-bold' : 'text-ql-accent text-sm font-medium border border-dashed border-ql-accent rounded-xl px-3 py-1.5'}`}
                >
                  {paycheckIncome > 0 ? `${sym}${paycheckIncome.toLocaleString()}${freqLabel}` : '+ Set income'}
                </button>
              )}
              {paycheckIncome > 0 && paycheckFrequency !== 'monthly' && (
                <span className="text-ql-3 text-[10px]">{sym}{salaryMonthly.toFixed(0)}/month</span>
              )}
            </div>
          </div>
        )}

        {/* Variable mode — log individual paychecks */}
        {incomeMode === 'variable' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-ql text-sm font-semibold">Paychecks This Month</p>
                <p className="text-ql-3 text-xs mt-0.5">{sym}{variableMonthly.toLocaleString('en-GB', { maximumFractionDigits: 0 })} received so far</p>
              </div>
              <button
                onClick={() => setShowAddPaycheck(a => !a)}
                className="text-ql-accent text-xs font-semibold border border-dashed border-ql-accent rounded-xl px-3 py-1.5"
              >+ Log paycheck</button>
            </div>

            {showAddPaycheck && (
              <div className="bg-ql-surface2 rounded-xl border border-ql p-3 flex flex-col gap-2 mb-3">
                <p className="text-ql text-xs font-semibold">Log a paycheck</p>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-ql-3 text-sm">{sym}</span>
                    <input type="number" placeholder="0.00" min="0.01" step="0.01" value={newPaycheck.amount}
                      onChange={e => setNewPaycheck({ ...newPaycheck, amount: e.target.value })}
                      autoFocus
                      className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent"
                    />
                  </div>
                  <input type="date" value={newPaycheck.date}
                    onChange={e => setNewPaycheck({ ...newPaycheck, date: e.target.value })}
                    className="bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent"
                  />
                </div>
                <input type="text" placeholder="Note (e.g. Freelance — May project)" value={newPaycheck.note}
                  onChange={e => setNewPaycheck({ ...newPaycheck, note: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleAddPaycheck()}
                  className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddPaycheck} className="flex-1 py-2 bg-ql-accent hover:bg-ql-accent-h text-white text-xs font-semibold rounded-xl">Save</button>
                  <button onClick={() => setShowAddPaycheck(false)} className="px-4 py-2 bg-ql-surface3 text-ql-2 text-xs rounded-xl">Cancel</button>
                </div>
              </div>
            )}

            {paycheckLog.length > 0 && (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {[...paycheckLog].sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
                  <div key={entry.id} className="flex items-center justify-between bg-ql-surface2 rounded-xl px-3 py-2.5 border border-ql">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-ql-3 text-[10px] shrink-0">
                        {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </span>
                      {entry.note && <span className="text-ql-2 text-xs truncate">{entry.note}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-ql text-sm font-bold tabular-nums">{sym}{entry.amount.toLocaleString('en-GB', { maximumFractionDigits: 2 })}</span>
                      <button onClick={() => removePaycheckEntry(entry.id)} className="text-ql-3 hover:text-red-500 text-xs transition-colors">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {paycheckLog.length === 0 && !showAddPaycheck && (
              <p className="text-ql-3 text-xs text-center py-2">No paychecks logged yet — tap + to add one.</p>
            )}
          </div>
        )}

        {hasIncome && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'After subs', val: freeMoney, color: 'text-emerald-400', icon: '✅' },
                { label: 'Subscriptions', val: monthlySubTotal, color: 'text-amber-400', icon: '📋' },
                { label: 'Sub %', val: subPct, color: subPct > 30 ? 'text-red-400' : 'text-ql', icon: '📊', isPercent: true },
              ].map(({ label, val, color, icon, isPercent }) => (
                <div key={label} className="bg-ql-surface2 rounded-xl p-3 border border-ql text-center">
                  <div className="text-base mb-0.5">{icon}</div>
                  <div className={`text-sm font-bold tabular-nums ${color}`}>
                    {isPercent ? `${val.toFixed(0)}%` : `${sym}${val.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`}
                  </div>
                  <div className="text-ql-3 text-[10px] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <div className="h-2 bg-ql-surface3 rounded-full overflow-hidden mb-1">
              <div
                className={`h-full rounded-full transition-all duration-500 ${subPct > 30 ? 'bg-red-500' : subPct > 20 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${subPct}%` }}
              />
            </div>
            <p className="text-ql-3 text-[10px]">
              {subPct > 30 ? '⚠️ Subscriptions are eating a big chunk — consider cutting some' : subPct > 20 ? 'Subscriptions are manageable but watch them' : 'Subscription spend looks healthy'}
            </p>
          </>
        )}
      </div>

      {/* ── Paycheck Planner ─────────────────────────────── */}
      {hasIncome && (
        <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql overflow-hidden">
          <div className="px-4 py-3 border-b border-ql flex items-center justify-between">
            <div>
              <p className="text-ql text-sm font-semibold">Paycheck Planner</p>
              <p className="text-ql-3 text-[11px] mt-0.5">Tap a bucket to manage where money goes</p>
            </div>
            <div className="flex gap-1 bg-ql-surface2 rounded-xl p-0.5">
              {(['50/30/20', 'custom'] as const).map(m => (
                <button key={m} onClick={() => setSplitMode(m)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${splitMode === m ? 'bg-ql-accent text-white' : 'text-ql-3'}`}
                >{m}</button>
              ))}
            </div>
          </div>

          {splitMode === 'custom' && (
            <div className="px-4 pt-3 pb-0 flex gap-2">
              {(['needs', 'wants', 'savings'] as const).map(k => (
                <div key={k} className="flex-1">
                  <p className="text-ql-3 text-[10px] mb-1 capitalize">{k} %</p>
                  <input type="number" min={0} max={100} value={customSplit[k]}
                    onChange={e => setCustomSplit({ ...customSplit, [k]: e.target.value })}
                    className="w-full bg-ql-input border border-ql-input rounded-xl px-2 py-1.5 text-xs text-ql outline-none focus:border-ql-accent text-center"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="p-4 flex flex-col gap-2">
            <BucketPanel bucket="needs"   label="Needs"   icon="🏠" bucketColor="text-blue-400"    bucketBar="bg-blue-500"    bucketBg="bg-blue-500/20"    budgetAmount={needs}   sym={sym} />
            <BucketPanel bucket="wants"   label="Wants"   icon="🎉" bucketColor="text-purple-400"  bucketBar="bg-purple-500"  bucketBg="bg-purple-500/20"  budgetAmount={wants}   sym={sym} />
            <BucketPanel bucket="savings" label="Savings" icon="💰" bucketColor="text-emerald-400" bucketBar="bg-emerald-500" bucketBg="bg-emerald-500/20" budgetAmount={savings} sym={sym} viceSavings={totalViceSavings} />

            {monthlySubTotal > 0 && (
              <div className="bg-ql-surface2 rounded-xl p-3 border border-dashed border-amber-500/30 mt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <div>
                      <p className="text-xs font-bold text-amber-400">Subscriptions</p>
                      <p className="text-ql-3 text-[10px]">Deduct from Wants bucket</p>
                    </div>
                  </div>
                  <span className="text-amber-400 text-sm font-bold tabular-nums">−{sym}{monthlySubTotal.toLocaleString('en-GB', { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Subscriptions Manager ────────────────────────── */}
      <div className="bg-ql-surface rounded-2xl shadow-ql border border-ql overflow-hidden">
        <div className="px-4 py-3 border-b border-ql flex items-center justify-between">
          <div>
            <p className="text-ql text-sm font-semibold">Subscriptions</p>
            <p className="text-ql-3 text-[11px] mt-0.5">
              {sym}{monthlySubTotal.toLocaleString('en-GB', { maximumFractionDigits: 2 })} / month total
            </p>
          </div>
          <span className="text-2xl">📋</span>
        </div>

        <div className="p-4 flex flex-col gap-2">
          {subscriptions.length === 0 && !showAddSub && (
            <p className="text-ql-3 text-xs text-center py-3">No subscriptions added yet.</p>
          )}

          {SUB_CATEGORIES.filter(cat => byCategory[cat.id]?.length).map(cat => (
            <div key={cat.id}>
              <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wide mb-1.5 mt-1">{cat.emoji} {cat.label}</p>
              {byCategory[cat.id]!.map(s => (
                <SubRow key={s.id} s={s} sym={sym} onToggleSync={toggleCalendarSync} />
              ))}
            </div>
          ))}

          {showAddSub ? (
            <div className="bg-ql-surface2 rounded-2xl border border-ql p-3 flex flex-col gap-2 mt-1">
              <p className="text-ql text-xs font-semibold">New Subscription</p>
              <div className="flex flex-wrap gap-1.5">
                {SUB_EMOJIS.map(e => (
                  <button key={e} onClick={() => setNewSub({ ...newSub, emoji: e })}
                    className={`text-xl w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${newSub.emoji === e ? 'bg-ql-accent text-white' : 'bg-ql-surface hover:bg-ql-surface3'}`}
                  >{e}</button>
                ))}
              </div>
              <input type="text" placeholder="Name (e.g. Netflix, Spotify)" value={newSub.name}
                onChange={e => setNewSub({ ...newSub, name: e.target.value })}
                className="w-full bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
              />
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-ql-3 text-sm">{sym}</span>
                  <input type="number" placeholder="0.00" min="0.01" step="0.01" value={newSub.amount}
                    onChange={e => setNewSub({ ...newSub, amount: e.target.value })}
                    className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
                  />
                </div>
                <div className="flex gap-0.5 bg-ql-surface rounded-xl p-0.5 border border-ql">
                  {(['weekly', 'monthly', 'annual'] as const).map(c => (
                    <button key={c} onClick={() => setNewSub({ ...newSub, cycle: c })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${newSub.cycle === c ? 'bg-ql-accent text-white' : 'text-ql-3'}`}
                    >{{ weekly: 'Wk', monthly: 'Mo', annual: 'Yr' }[c]}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-ql-3 text-xs whitespace-nowrap">Start date</label>
                <input type="date" value={newSub.startDate}
                  onChange={e => setNewSub({ ...newSub, startDate: e.target.value })}
                  className="flex-1 bg-ql-input border border-ql-input rounded-xl px-3 py-2 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUB_CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setNewSub({ ...newSub, category: cat.id })}
                    className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-medium transition-colors border ${newSub.category === cat.id ? 'border-ql-accent bg-ql-accent/10 text-ql-accent' : 'border-ql bg-ql-surface text-ql-3 hover:border-ql-accent/50'}`}
                  >{cat.emoji} {cat.label}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddSub} className="flex-1 py-2 bg-ql-accent hover:bg-ql-accent-h text-white text-sm font-medium rounded-xl transition-colors">Add</button>
                <button onClick={() => setShowAddSub(false)} className="px-4 py-2 bg-ql-surface3 text-ql-2 text-sm rounded-xl">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddSub(true)} className="w-full py-3 border border-dashed border-ql rounded-2xl text-ql-3 hover:text-ql hover:border-ql-accent text-sm font-medium transition-colors mt-1">
              + Add subscription
            </button>
          )}
        </div>
      </div>

      <AIAdvisor section="vices" />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ViceTracker() {
  const { financialMode } = useGameStore();
  const [activeTab, setActiveTab] = useState<'vices' | 'finances'>('vices');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-ql text-xl font-bold">{financialMode ? 'Vices & Finances' : 'Vice Tracker'}</h2>
        <p className="text-ql-3 text-xs mt-0.5">
          {financialMode ? 'Track what you skip and manage your money' : 'Log what you skipped — earn gold and tokens'}
        </p>
      </div>

      {/* Tab switcher — only shown in financial mode */}
      {financialMode && (
        <div className="flex gap-1 bg-ql-surface2 rounded-2xl p-1 border border-ql">
          {([
            { id: 'vices',    label: '🚫 Vices' },
            { id: 'finances', label: '💳 Finances' },
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
      )}

      {(!financialMode || activeTab === 'vices')    && <VicesTab />}
      {(financialMode  && activeTab === 'finances') && <FinancesTab />}
    </div>
  );
}
