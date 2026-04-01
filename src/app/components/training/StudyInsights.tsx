'use client';

import { useGameStore } from '@/store/gameStore';
import type { GymPlan } from '@/types';

function isStudyPlan(plan: GymPlan): boolean {
  return plan.trackType === 'interleaved' || plan.split === 'study' || /study|revision|revise|exam|a-level|gcse/i.test(plan.name);
}

// Extract individual subject name from an exercise block name like "Maths – Topic Review 09:00–09:45"
function extractSubject(blockName: string): string {
  return blockName.split('–')[0].split('-')[0].replace(/\s+\d{2}:\d{2}.*$/, '').trim();
}

interface SubjectHours {
  subject: string;
  hours: number;
  pct: number;
  color: string;
}

const PALETTE = ['#e05a2b','#4a9eff','#22c55e','#a855f7','#f59e0b','#ec4899','#14b8a6','#f97316'];

export default function StudyInsights() {
  const gymPlans = useGameStore(s => s.gymPlans);
  const studyPlans = gymPlans.filter(isStudyPlan);

  if (studyPlans.length === 0) return null;

  // Build subject → total block count map (each block = studyBlockMins, but we don't store that,
  // so we count blocks as a proxy for time — equal weight per block is fair)
  const blockCounts: Record<string, number> = {};
  for (const plan of studyPlans) {
    const exercises = [
      ...(plan.exercises ?? []),
      ...(plan.weeks?.flatMap(w => w.exercises ?? []) ?? []),
    ];
    for (const ex of exercises) {
      if (/break|lunch|gym|☕|🍽|🏋/i.test(ex.name)) continue; // skip non-study blocks
      const subject = extractSubject(ex.name);
      if (!subject || subject.length < 2) continue;
      // Skip scheduling labels that aren't real subjects
      if (/^(exam\s+week|mock(\s+exam)?|revision\s+week|study\s+week|reading\s+week)$/i.test(subject)) continue;
      blockCounts[subject] = (blockCounts[subject] ?? 0) + 1;
    }
  }

  const entries = Object.entries(blockCounts);
  if (entries.length === 0) return null;

  const total = entries.reduce((s, [, c]) => s + c, 0);
  const subjects: SubjectHours[] = entries
    .sort((a, b) => b[1] - a[1])
    .map(([subject, count], i) => ({
      subject,
      hours: count,
      pct: Math.round((count / total) * 100),
      color: PALETTE[i % PALETTE.length],
    }));

  const dominant = subjects[0];
  const lightest = subjects[subjects.length - 1];
  const isImbalanced = subjects.length >= 2 && dominant.pct >= 70;

  return (
    <div className="rounded-2xl border border-ql bg-ql-surface p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-ql text-sm font-semibold">📊 Subject Split</p>
        <p className="text-ql-3 text-[10px]">{studyPlans.length} plan{studyPlans.length > 1 ? 's' : ''} · {total} blocks</p>
      </div>

      {/* Bar chart */}
      <div className="flex flex-col gap-2">
        {subjects.map(({ subject, pct, color }) => (
          <div key={subject} className="flex items-center gap-2">
            <p className="text-ql-3 text-[11px] w-28 truncate shrink-0">{subject}</p>
            <div className="flex-1 h-2 rounded-full bg-ql-surface2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <p className="text-ql-3 text-[11px] w-8 text-right shrink-0">{pct}%</p>
          </div>
        ))}
      </div>

      {/* Balance alert */}
      {isImbalanced && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 flex items-start gap-2">
          <span className="text-sm shrink-0">⚖️</span>
          <p className="text-amber-400 text-[11px] leading-snug">
            <span className="font-semibold">{dominant.subject}</span> is taking {dominant.pct}% of study time.{' '}
            <span className="font-semibold">{lightest.subject}</span> only gets {lightest.pct}%.{' '}
            Ask GAINN to rebalance if needed.
          </p>
        </div>
      )}
    </div>
  );
}
