'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { GymPlan, GymExercise } from '@/types';

function isStudyPlan(plan: GymPlan): boolean {
  return plan.trackType === 'interleaved' || plan.split === 'study' || /study|revision|revise|exam|a-level|gcse/i.test(plan.name);
}

function extractSubject(blockName: string): string {
  return blockName.split('–')[0].split('-')[0].replace(/\s+\d{2}:\d{2}.*$/, '').trim();
}

function isBreakBlock(name: string): boolean {
  return /break|lunch|gym|☕|🍽|🏋|run|walk|jog|exercise|sport|swim|cycle|yoga|stretch|nap|rest|activity|🏃|🚶|🧘|🚴|🏊/i.test(name);
}

function isSchedulingLabel(subject: string): boolean {
  return /^(exam\s+week|mock(\s+exam)?|revision\s+week|study\s+week|reading\s+week)$/i.test(subject);
}

// Parse duration in minutes from a block name containing "HH:MM–HH:MM"
function blockMins(name: string): number {
  const m = name.match(/(\d{1,2}):(\d{2})\s*[–\-]\s*(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  const start = parseInt(m[1]) * 60 + parseInt(m[2]);
  const end   = parseInt(m[3]) * 60 + parseInt(m[4]);
  return Math.max(0, end - start);
}

// All exercises for a plan (progressive plans: use all weeks; repeating: flat list)
function allExercises(plan: GymPlan): GymExercise[] {
  if (plan.weeks && plan.weeks.length > 0) {
    return plan.weeks.flatMap(w => w.exercises ?? []);
  }
  return plan.exercises ?? [];
}

// Study minutes per unique day session in a plan (one week's worth of sessions)
// For a progressive plan each week may differ slightly, but we average across all weeks.
function minsPerSession(plan: GymPlan): number {
  // Use first week as representative for session duration
  const exs = plan.weeks && plan.weeks.length > 0
    ? (plan.weeks[0]?.exercises ?? [])
    : (plan.exercises ?? []);
  return exs.reduce((sum, ex) => isBreakBlock(ex.name) ? sum : sum + blockMins(ex.name), 0);
}

// Total planned sessions for a plan (scheduleDays × weeks programmed)
function totalPlannedSessions(plan: GymPlan): number {
  const weeks = plan.weeks && plan.weeks.length > 0 ? plan.weeks.length : 1;
  return plan.scheduleDays.length * weeks;
}

const PALETTE = ['#e05a2b','#4a9eff','#22c55e','#a855f7','#f59e0b','#ec4899','#14b8a6','#f97316'];

interface SubjectStats {
  subject:        string;
  color:          string;
  pct:            number;
  totalBlocks:    number;
  totalMins:      number;   // total study mins scheduled across all sessions
  doneMins:       number;   // study mins in completed sessions
  doneSessions:   number;
  totalSessions:  number;
  plans:          GymPlan[];
}

export default function StudyInsights() {
  const gymPlans    = useGameStore(s => s.gymPlans);
  const gymSessions = useGameStore(s => s.gymSessions);
  const studyPlans  = gymPlans.filter(isStudyPlan);
  const [selected, setSelected] = useState<string | null>(null);

  if (studyPlans.length === 0) return null;

  // ── Build per-subject stats ─────────────────────────────────────────────
  const subjectMap: Record<string, {
    blocks: number; totalMins: number; doneMins: number;
    doneSessions: number; totalSessions: number; plans: GymPlan[];
  }> = {};

  for (const plan of studyPlans) {
    const sessionsDone  = gymSessions.filter(s => s.planId === plan.id).length;
    const minsPerSess   = minsPerSession(plan);
    const totalSess     = totalPlannedSessions(plan);

    for (const ex of allExercises(plan)) {
      if (isBreakBlock(ex.name)) continue;
      const subject = extractSubject(ex.name);
      if (!subject || subject.length < 2) continue;
      if (isSchedulingLabel(subject)) continue;

      const mins = blockMins(ex.name);

      if (!subjectMap[subject]) {
        subjectMap[subject] = {
          blocks: 0, totalMins: 0, doneMins: 0,
          doneSessions: 0, totalSessions: 0, plans: [],
        };
      }
      const s = subjectMap[subject];
      s.blocks++;
      s.totalMins += mins;
      // Done mins: pro-rate based on how many sessions were completed out of total per plan
      const doneRatio = totalSess > 0 ? Math.min(sessionsDone / totalSess, 1) : 0;
      s.doneMins += Math.round(mins * doneRatio);

      if (!s.plans.find(p => p.id === plan.id)) {
        s.plans.push(plan);
        s.doneSessions  += sessionsDone;
        s.totalSessions += totalSess;
      }
    }
  }

  const entries = Object.entries(subjectMap);
  if (entries.length === 0) return null;

  const totalBlocks = entries.reduce((s, [, v]) => s + v.blocks, 0);
  const subjects: SubjectStats[] = entries
    .sort((a, b) => b[1].blocks - a[1].blocks)
    .map(([subject, v], i) => ({
      subject,
      color:         PALETTE[i % PALETTE.length],
      pct:           Math.round((v.blocks / totalBlocks) * 100),
      totalBlocks:   v.blocks,
      totalMins:     v.totalMins,
      doneMins:      v.doneMins,
      doneSessions:  v.doneSessions,
      totalSessions: v.totalSessions,
      plans:         v.plans,
    }));

  const dominant     = subjects[0];
  const lightest     = subjects[subjects.length - 1];
  const isImbalanced = subjects.length >= 2 && dominant.pct >= 70;
  const selectedStat = selected ? subjects.find(s => s.subject === selected) ?? null : null;

  function fmtHours(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  return (
    <>
      <div className="rounded-2xl border border-ql bg-ql-surface p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-ql text-sm font-semibold">📊 Subject Split</p>
          <p className="text-ql-3 text-[10px]">{studyPlans.length} plan{studyPlans.length > 1 ? 's' : ''} · {totalBlocks} blocks</p>
        </div>

        {/* Bar chart — each row is tappable */}
        <div className="flex flex-col gap-2">
          {subjects.map(({ subject, pct, color, doneMins, totalMins }) => (
            <button
              key={subject}
              onClick={() => setSelected(subject)}
              className="flex items-center gap-2 w-full text-left"
            >
              <p className="text-ql-3 text-[11px] w-28 truncate shrink-0">{subject}</p>
              <div className="flex-1 h-2 rounded-full bg-ql-surface2 overflow-hidden relative">
                {/* Done progress (brighter) */}
                {doneMins > 0 && totalMins > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full opacity-40"
                    style={{ width: `${Math.round((doneMins / totalMins) * pct)}%`, backgroundColor: color }}
                  />
                )}
                {/* Total allocation */}
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <p className="text-ql-3 text-[11px] w-8 text-right shrink-0">{pct}%</p>
            </button>
          ))}
        </div>

        <p className="text-ql-3 text-[9px] text-center">Tap a subject for details</p>

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

      {/* Subject detail sheet */}
      {selectedStat && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl pb-8"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-ql-surface3" />
            </div>

            {/* Header */}
            <div className="px-5 pt-2 pb-4 border-b border-ql flex items-center gap-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedStat.color }} />
              <div className="flex-1">
                <h3 className="text-ql text-base font-bold">{selectedStat.subject}</h3>
                <p className="text-ql-3 text-xs mt-0.5">{selectedStat.pct}% of total scheduled study time</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-ql-3 text-2xl leading-none">×</button>
            </div>

            {/* Stats grid */}
            <div className="px-5 pt-4 grid grid-cols-2 gap-3">
              {/* Hours studied */}
              <div className="bg-ql-surface rounded-2xl border border-ql px-4 py-3">
                <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wide mb-1">Studied</p>
                <p className="text-ql text-xl font-bold">{fmtHours(selectedStat.doneMins)}</p>
                <p className="text-ql-3 text-[10px] mt-0.5">of {fmtHours(selectedStat.totalMins)} planned</p>
              </div>

              {/* Sessions */}
              <div className="bg-ql-surface rounded-2xl border border-ql px-4 py-3">
                <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wide mb-1">Sessions</p>
                <p className="text-ql text-xl font-bold">{selectedStat.doneSessions}</p>
                <p className="text-ql-3 text-[10px] mt-0.5">of {selectedStat.totalSessions} total</p>
              </div>

              {/* Remaining */}
              <div className="bg-ql-surface rounded-2xl border border-ql px-4 py-3">
                <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wide mb-1">Remaining</p>
                <p className="text-ql text-xl font-bold">{fmtHours(Math.max(0, selectedStat.totalMins - selectedStat.doneMins))}</p>
                <p className="text-ql-3 text-[10px] mt-0.5">before your exam</p>
              </div>

              {/* Blocks */}
              <div className="bg-ql-surface rounded-2xl border border-ql px-4 py-3">
                <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wide mb-1">Blocks</p>
                <p className="text-ql text-xl font-bold">{selectedStat.totalBlocks}</p>
                <p className="text-ql-3 text-[10px] mt-0.5">study sessions scheduled</p>
              </div>
            </div>

            {/* Progress bar */}
            {selectedStat.totalMins > 0 && (
              <div className="px-5 pt-4">
                <div className="flex justify-between mb-1.5">
                  <p className="text-ql-3 text-[10px]">Progress</p>
                  <p className="text-ql-3 text-[10px]">
                    {Math.round((selectedStat.doneMins / selectedStat.totalMins) * 100)}%
                  </p>
                </div>
                <div className="h-2.5 rounded-full bg-ql-surface2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.round((selectedStat.doneMins / selectedStat.totalMins) * 100)}%`,
                      backgroundColor: selectedStat.color,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
