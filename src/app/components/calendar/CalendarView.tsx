'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { CalendarEvent, GymPlan } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────
const HOUR_HEIGHT         = 64; // px per hour in timeline
const DEFAULT_START_HOUR  = 6;
const DEFAULT_END_HOUR    = 23;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr(): string { return toDateStr(new Date()); }

function getWeekMonday(d: Date): Date {
  const clone = new Date(d);
  const dow = clone.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  clone.setDate(clone.getDate() + diff);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function timeToHours(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
}

function hoursToPx(h: number, startHour: number): number {
  return (h - startHour) * HOUR_HEIGHT;
}

function fmtHour(h: number): string {
  if (h === 0 || h === 24) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function fmtTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12  = h % 12 || 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

function isStudyPlan(plan: GymPlan): boolean {
  return plan.trackType === 'interleaved' || plan.split === 'study' || /study|revision|revise|exam|a-level|gcse/i.test(plan.name);
}

// ─── Layout algorithm for overlapping events ─────────────────────────────────
interface LayoutEvent {
  event: CalendarEvent;
  top: number;    // px from top of timeline
  height: number; // px
  col: number;
  cols: number;
}

function layoutEvents(events: CalendarEvent[], startHour: number, endHour: number): LayoutEvent[] {
  // Only timed events
  const timed = events.filter(e => !e.allDay && e.startTime && e.endTime);

  // Sort by start time, then longest first
  const sorted = [...timed].sort((a, b) => {
    const diff = timeToHours(a.startTime) - timeToHours(b.startTime);
    if (diff !== 0) return diff;
    return timeToHours(b.endTime) - timeToHours(a.endTime); // longer first
  });

  const result: LayoutEvent[] = [];
  // Greedy column assignment
  const colEndTimes: number[] = []; // end time (in hours) of last event in each column

  for (const ev of sorted) {
    const startH = timeToHours(ev.startTime);
    // If endTime missing, default to startTime + 1 hour so it still shows on the timeline
    const rawEndH = ev.endTime ? timeToHours(ev.endTime) : startH + 1;
    const endH    = Math.max(rawEndH, startH + 0.25); // min 15min height
    const clampedStart = Math.max(startH, startHour);
    const clampedEnd   = Math.min(endH,   endHour);
    if (clampedStart >= endHour || clampedEnd <= startHour) continue;

    const top    = hoursToPx(clampedStart, startHour);
    const height = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT, 24);

    // Find first free column (where startH >= column's last end time)
    let col = colEndTimes.findIndex(et => startH >= et);
    if (col === -1) col = colEndTimes.length; // no free column — add a new one
    colEndTimes[col] = endH;

    result.push({ event: ev, top, height, col, cols: 1 });
  }

  // Second pass: assign cols count (max column index + 1 for overlapping group)
  // Group events that overlap in time
  for (let i = 0; i < result.length; i++) {
    const a = result[i];
    const aStart = timeToHours(a.event.startTime);
    const aEnd   = timeToHours(a.event.endTime);
    let maxCol = a.col;
    for (let j = 0; j < result.length; j++) {
      if (i === j) continue;
      const b = result[j];
      const bStart = timeToHours(b.event.startTime);
      const bEnd   = timeToHours(b.event.endTime);
      if (bStart < aEnd && bEnd > aStart) {
        maxCol = Math.max(maxCol, b.col);
      }
    }
    a.cols = maxCol + 1;
  }

  return result;
}

// ─── Study blocks overlay (rendered inside the timeline event block) ─────────
// Strip leading emoji + trailing time from AI-generated block names
function cleanBlockName(raw: string, timeMatch: RegExpMatchArray | null): string {
  let s = timeMatch ? raw.replace(timeMatch[0], '') : raw;
  // Remove leading emoji characters (Unicode ranges for common emoji)
  s = s.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\u{1F900}-\u{1F9FF}☕🍽]+\s*/u, '');
  return s.replace(/\s*[–\-]\s*$/, '').trim();
}

function StudyBlocksOverlay({
  plan,
  eventStartH,
  eventEndH,
}: {
  plan: GymPlan;
  eventStartH: number;
  eventEndH:   number;
}) {
  const exercises = plan.exercises ?? [];
  const totalDur  = eventEndH - eventStartH;
  if (totalDur <= 0 || exercises.length === 0) return null;

  return (
    <div className="absolute inset-x-0 top-[4.5px] bottom-[2px] overflow-hidden rounded-b-lg pointer-events-none">
      {exercises.map(ex => {
        const timeMatch = ex.name.match(/(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/);
        if (!timeMatch) return null;

        const blockStart = timeToHours(timeMatch[1]);
        const blockEnd   = timeToHours(timeMatch[2]);
        if (blockStart >= eventEndH || blockEnd <= eventStartH) return null;

        const clampedStart = Math.max(blockStart, eventStartH);
        const clampedEnd   = Math.min(blockEnd,   eventEndH);
        // Pixel-accurate position: offset from event top by the block's actual start time
        const topPx    = (clampedStart - eventStartH) * HOUR_HEIGHT;
        const heightPx = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT - 2, 4);
        if (heightPx < 4) return null;

        const isRest = /break|lunch|rest/i.test(ex.name);
        const label  = cleanBlockName(ex.name, timeMatch);

        return (
          <div
            key={ex.id}
            className={`absolute inset-x-1.5 rounded-lg overflow-hidden flex items-start px-2 pt-1 ${
              isRest ? 'bg-black/20' : 'bg-white/15'
            }`}
            style={{ top: topPx, height: heightPx }}
          >
            {heightPx >= 18 && (
              <p className="text-white/80 text-[9px] font-semibold truncate leading-tight">
                {label}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Event detail sheet ───────────────────────────────────────────────────────
function StudyPlanDetail({ plan }: { plan: GymPlan }) {
  const exercises = plan.exercises ?? [];
  return (
    <div className="flex flex-col gap-2 pb-2">
      {exercises.length === 0 && (
        <p className="text-ql-3 text-sm text-center py-4">No session blocks found.</p>
      )}
      {exercises.map((ex, i) => {
        // Name format: "Subject – Block N  HH:MM–HH:MM" or similar
        const timeMatch = ex.name.match(/(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/);
        const isBreak = /break/i.test(ex.name);
        return (
          <div
            key={ex.id}
            className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${
              isBreak ? 'bg-ql-surface2 border-ql opacity-70' : 'bg-ql-surface border-ql'
            }`}
          >
            <span className="text-ql-3 text-xs w-5 shrink-0 font-mono">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isBreak ? 'text-ql-3' : 'text-ql'}`}>
                {timeMatch ? ex.name.replace(timeMatch[0], '').replace(/\s+$/, '') : ex.name}
              </p>
              {timeMatch && (
                <p className="text-ql-3 text-[10px] mt-0.5">
                  {fmtTime(timeMatch[1])} – {fmtTime(timeMatch[2])}
                </p>
              )}
            </div>
            {isBreak && <span className="text-xs text-ql-3">☕</span>}
          </div>
        );
      })}
    </div>
  );
}

function GymPlanDetail({ plan }: { plan: GymPlan }) {
  const exercises = plan.exercises ?? [];
  const weeks     = plan.weeks ?? [];
  const exList    = weeks.length > 0 ? (weeks[0]?.exercises ?? []) : exercises;
  return (
    <div className="flex flex-col gap-2 pb-2">
      {exList.length === 0 && (
        <p className="text-ql-3 text-sm text-center py-4">No exercises added yet.</p>
      )}
      {exList.map((ex, i) => (
        <div key={ex.id} className="bg-ql-surface rounded-2xl border border-ql px-4 py-3 flex items-center gap-3">
          <span className="text-ql-3 text-xs w-5 shrink-0 font-mono">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-ql text-sm font-medium">{ex.name}</p>
            {(ex.sets > 0 || ex.targetReps > 0) && (
              <p className="text-ql-3 text-[10px] mt-0.5">
                {ex.sets > 0 ? `${ex.sets} sets` : ''}
                {ex.targetReps > 0 ? ` × ${ex.targetReps} reps` : ''}
                {ex.targetWeight > 0 ? ` @ ${ex.targetWeight}kg` : ex.targetReps > 0 ? ' BW' : ''}
              </p>
            )}
          </div>
        </div>
      ))}
      {plan.recoveryNotes && (
        <div className="bg-ql-surface rounded-2xl border border-ql px-4 py-3 mt-1">
          <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wide mb-1">Notes</p>
          <p className="text-ql text-sm">{plan.recoveryNotes}</p>
        </div>
      )}
    </div>
  );
}

function WorkShiftDetail({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex flex-col gap-3 pb-2">
      <div className="bg-ql-surface rounded-2xl border border-ql px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-ql-3 text-xs uppercase tracking-wide font-semibold">Shift</span>
          <span className="text-ql text-sm font-medium">
            {event.startTime && event.endTime
              ? `${fmtTime(event.startTime)} – ${fmtTime(event.endTime)}`
              : event.startTime ? fmtTime(event.startTime) : 'All day'}
          </span>
        </div>
        {event.startTime && event.endTime && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-ql-3 text-xs uppercase tracking-wide font-semibold">Duration</span>
            <span className="text-ql text-sm font-medium">
              {(() => {
                const start = timeToHours(event.startTime);
                const end   = timeToHours(event.endTime);
                const diff  = end > start ? end - start : 24 - start + end;
                const h = Math.floor(diff);
                const m = Math.round((diff - h) * 60);
                return m > 0 ? `${h}h ${m}m` : `${h}h`;
              })()}
            </span>
          </div>
        )}
      </div>
      {event.location && (
        <div className="bg-ql-surface rounded-2xl border border-ql px-4 py-3">
          <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wide mb-1">Location</p>
          <p className="text-ql text-sm">{event.location}</p>
        </div>
      )}
      {event.notes && (
        <div className="bg-ql-surface rounded-2xl border border-ql px-4 py-3">
          <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wide mb-1">Notes</p>
          <p className="text-ql text-sm">{event.notes}</p>
        </div>
      )}
    </div>
  );
}

function GenericEventDetail({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex flex-col gap-3 pb-2">
      {(event.startTime || event.endTime) && (
        <div className="bg-ql-surface rounded-2xl border border-ql px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-ql-3 text-xs uppercase tracking-wide font-semibold">Time</span>
            <span className="text-ql text-sm font-medium">
              {event.startTime && event.endTime
                ? `${fmtTime(event.startTime)} – ${fmtTime(event.endTime)}`
                : fmtTime(event.startTime || event.endTime)}
            </span>
          </div>
        </div>
      )}
      {event.location && (
        <div className="bg-ql-surface rounded-2xl border border-ql px-4 py-3">
          <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wide mb-1">Location</p>
          <p className="text-ql text-sm">{event.location}</p>
        </div>
      )}
      {event.notes && (
        <div className="bg-ql-surface rounded-2xl border border-ql px-4 py-3">
          <p className="text-ql-3 text-[10px] font-semibold uppercase tracking-wide mb-1">Notes</p>
          <p className="text-ql text-sm">{event.notes}</p>
        </div>
      )}
    </div>
  );
}

function EventDetailSheet({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const gymPlans = useGameStore(s => s.gymPlans);

  // Detect event type
  const linkedPlan = event.planId ? gymPlans.find(p => p.id === event.planId) : null;
  const isWork = /\b(work|shift|job)\b/i.test(event.title) || event.notes?.toLowerCase().includes('work shift');

  let subtype: 'study' | 'gym' | 'work' | 'generic' = 'generic';
  if (linkedPlan) {
    subtype = isStudyPlan(linkedPlan) ? 'study' : 'gym';
  } else if (isWork && !linkedPlan) {
    subtype = 'work';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-ql-surface3" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-ql shrink-0 flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: event.color || '#007aff' }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-ql text-base font-bold truncate">{event.title}</h3>
            <p className="text-ql-3 text-xs mt-0.5">
              {!event.allDay && event.startTime
                ? `${fmtTime(event.startTime)}${event.endTime ? ` – ${fmtTime(event.endTime)}` : ''}`
                : 'All day'}
              {linkedPlan ? ` · ${linkedPlan.name}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-ql-3 text-2xl leading-none ml-1 shrink-0">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {subtype === 'study' && linkedPlan && <StudyPlanDetail plan={linkedPlan} />}
          {subtype === 'gym'   && linkedPlan && <GymPlanDetail   plan={linkedPlan} />}
          {subtype === 'work'               && <WorkShiftDetail  event={event} />}
          {subtype === 'generic'            && <GenericEventDetail event={event} />}
        </div>
      </div>
    </div>
  );
}

// ─── Current time line ────────────────────────────────────────────────────────
function CurrentTimeLine({ startHour, endHour }: { startHour: number; endHour: number }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours() + now.getMinutes() / 60;
  if (h < startHour || h >= endHour) return null;
  const top = hoursToPx(h, startHour);

  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top }}>
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 -ml-1.5" />
      <div className="flex-1 h-px bg-red-500" />
    </div>
  );
}

// ─── Month/Year picker ───────────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function MonthYearPicker({
  currentYear,
  currentMonth,
  onSelect,
  onClose,
}: {
  currentYear: number;
  currentMonth: number; // 0-indexed
  onSelect: (year: number, month: number) => void;
  onClose: () => void;
}) {
  const [year, setYear] = useState(currentYear);
  const thisYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl pb-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-ql-surface3" />
        </div>

        {/* Year row */}
        <div className="flex items-center justify-between px-6 py-3">
          <button
            onClick={() => setYear(y => y - 1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-ql-3 text-lg bg-ql-surface2"
          >
            ‹
          </button>
          <span className="text-ql text-base font-bold">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-ql-3 text-lg bg-ql-surface2"
          >
            ›
          </button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-4 gap-2 px-5 pb-2">
          {MONTHS_SHORT.map((m, i) => {
            const isSelected = year === currentYear && i === currentMonth;
            const isThisMonth = year === thisYear && i === new Date().getMonth();
            return (
              <button
                key={m}
                onClick={() => { onSelect(year, i); onClose(); }}
                className={`py-3 rounded-2xl text-sm font-semibold transition-all ${
                  isSelected
                    ? 'text-white'
                    : isThisMonth
                    ? 'text-ql-accent bg-ql-surface2'
                    : 'text-ql bg-ql-surface2'
                }`}
                style={isSelected ? { backgroundColor: 'var(--ql-accent)' } : {}}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Week strip ───────────────────────────────────────────────────────────────
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function WeekStrip({
  weekDays,
  selectedDate,
  onSelectDate,
  eventDateSet,
}: {
  weekDays: Date[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
  eventDateSet: Set<string>;
}) {
  const today = todayStr();
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-ql bg-ql-hdr shrink-0">
      {weekDays.map((d, i) => {
        const ds     = toDateStr(d);
        const active = ds === selectedDate;
        const isToday = ds === today;
        const hasDot  = eventDateSet.has(ds);
        return (
          <button
            key={ds}
            onClick={() => onSelectDate(ds)}
            className="flex flex-col items-center gap-0.5 w-10 py-1.5 rounded-2xl transition-all"
            style={active ? { backgroundColor: 'var(--ql-accent)', opacity: 1 } : {}}
          >
            <span className={`text-[10px] font-medium ${active ? 'text-white' : isToday ? 'text-ql-accent' : 'text-ql-3'}`}>
              {DAY_LETTERS[i]}
            </span>
            <span className={`text-sm font-bold ${active ? 'text-white' : isToday ? 'text-ql-accent' : 'text-ql'}`}>
              {d.getDate()}
            </span>
            {hasDot && !active && (
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--ql-accent)' }} />
            )}
            {!hasDot && <div className="w-1 h-1" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── All-day pills ────────────────────────────────────────────────────────────
function AllDayPills({
  events,
  onSelect,
}: {
  events: CalendarEvent[];
  onSelect: (e: CalendarEvent) => void;
}) {
  if (events.length === 0) return null;
  return (
    <div className="px-3 py-1.5 border-b border-ql flex flex-wrap gap-1 shrink-0 bg-ql-surface">
      {events.map(ev => (
        <button
          key={ev.id}
          onClick={() => onSelect(ev)}
          className="text-xs px-2.5 py-1 rounded-full font-medium text-white"
          style={{ backgroundColor: ev.color || '#007aff' }}
        >
          {ev.title}
        </button>
      ))}
    </div>
  );
}

// ─── Synthetic event from a GymPlan (for timeline display) ───────────────────
function planToSyntheticEvent(plan: GymPlan, dateStr: string): CalendarEvent {
  const dow     = String(new Date(dateStr + 'T12:00:00').getDay());
  const start   = plan.dayTimes?.[dow] || plan.scheduleTime  || '';
  const end     = plan.dayEndTimes?.[dow] || plan.scheduleEndTime || '';
  return {
    id:        `__plan_${plan.id}`,
    title:     `${plan.emoji} ${plan.name}`,
    date:      dateStr,
    startTime: start,
    endTime:   end,
    allDay:    !start,
    location:  '',
    notes:     '',
    color:     plan.color,
    reminder:  0,
    planId:    plan.id,
  };
}

// ─── Main CalendarView ────────────────────────────────────────────────────────
export default function CalendarView() {
  const { calendarEvents, gymPlans, wakeQuest, bedTime, sleepLog, cleanOrphanedPlanEvents, deduplicatePlanDays, cleanStaleScheduleEvents } = useGameStore();

  // isReady gates rendering until the cleanup pass completes, preventing a flash of
  // duplicate/stale events that briefly appear before the store is corrected.
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    cleanOrphanedPlanEvents();
    deduplicatePlanDays();
    cleanStaleScheduleEvents();
    setIsReady(true);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Dynamic timeline bounds: use wake/sleep time if configured
  const wakeH     = wakeQuest?.targetTime ? Math.floor(timeToHours(wakeQuest.targetTime)) : DEFAULT_START_HOUR;
  // Midnight (00:00) means end of day — treat as 24 so the last hour is visible
  const bedH      = bedTime ? (bedTime === '00:00' ? 24 : Math.ceil(timeToHours(bedTime))) : DEFAULT_END_HOUR;
  const startHour = Math.max(0,  wakeH);                        // start AT wake time (or 6am default)
  // Add 1 hour buffer after bedtime so the bedtime block is fully visible
  const endHour   = Math.min(24, Math.max(bedH + 1, DEFAULT_END_HOUR));
  const totalHours = endHour - startHour;

  const now           = new Date();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [weekMonday,   setWeekMonday]   = useState(() => getWeekMonday(now));
  const [selectedEvent,  setSelectedEvent]  = useState<CalendarEvent | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const timelineRef   = useRef<HTMLDivElement>(null);
  const weekDays      = getWeekDays(weekMonday);

  // Derive plan events by schedule day (same logic as CalendarPage.gymPlansForDate)
  function plansForDate(dateStr: string): CalendarEvent[] {
    const dow = new Date(dateStr + 'T12:00:00').getDay();
    return (gymPlans ?? [])
      .filter(p => p.scheduleDays.includes(dow))
      .map(p => planToSyntheticEvent(p, dateStr));
  }

  // Set of dates that have at least one event (for dots — include plan days)
  const planDateSet = new Set(
    (gymPlans ?? []).flatMap(p =>
      weekDays.filter(d => p.scheduleDays.includes(d.getDay())).map(d => toDateStr(d))
    )
  );
  const eventDateSet = new Set([...calendarEvents.map(e => e.date), ...planDateSet]);

  // Navigate weeks
  const prevWeek = () => {
    setWeekMonday(m => { const d = new Date(m); d.setDate(d.getDate() - 7); return d; });
  };
  const nextWeek = () => {
    setWeekMonday(m => { const d = new Date(m); d.setDate(d.getDate() + 7); return d; });
  };

  // Jump to a specific month/year — land on the 1st of that month's week
  const handleMonthSelect = useCallback((year: number, month: number) => {
    const first = new Date(year, month, 1);
    const mon   = getWeekMonday(first);
    setWeekMonday(mon);
    setSelectedDate(toDateStr(first));
  }, []);

  // When selected date changes, check if it's in the current week; if not, jump week
  const handleSelectDate = useCallback((ds: string) => {
    setSelectedDate(ds);
    const d = new Date(ds + 'T00:00:00');
    const mon = getWeekMonday(d);
    setWeekMonday(mon);
  }, []);

  // Events for selected day: merge stored calendarEvents + derived plan events
  // Stored events take priority — deduplicate by planId OR bare title (handles pre-planId events)
  const bareTitle = (s: string) => s.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\u{1F900}-\u{1F9FF}☕🍽\s]+/u, '').trim().toLowerCase();
  // Deduplicate stored events by title+startTime+endTime — prevents AI double-adds showing side by side
  const storedDayEventsRaw = calendarEvents.filter(e => e.date === selectedDate);
  const seenEventKeys = new Set<string>();
  const storedDayEvents = storedDayEventsRaw.filter(e => {
    const key = `${bareTitle(e.title)}|${e.startTime ?? ''}|${e.endTime ?? ''}`;
    if (seenEventKeys.has(key)) return false;
    seenEventKeys.add(key);
    return true;
  });
  const storedPlanIds     = new Set(storedDayEvents.filter(e => e.planId).map(e => e.planId!));
  const storedBareTitles  = new Set(storedDayEvents.map(e => bareTitle(e.title)));
  const derivedPlanEvents = plansForDate(selectedDate).filter(
    e => !storedPlanIds.has(e.planId!) && !storedBareTitles.has(bareTitle(e.title))
  );
  const dayEvents         = [...storedDayEvents, ...derivedPlanEvents];

  // Synthetic wake / sleep blocks
  const sleepEntryToday = sleepLog.find(e => e.date === selectedDate);
  const syntheticBlocks: CalendarEvent[] = [];
  if (wakeQuest?.targetTime) {
    const wakeEnd = (() => {
      const [h, m] = wakeQuest.targetTime.split(':').map(Number);
      const total = h * 60 + m + 30;
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    })();
    syntheticBlocks.push({
      id: '__wake__',
      date: selectedDate,
      title: '🌅 Wake Up',
      startTime: wakeQuest.targetTime,
      endTime: wakeEnd,
      color: sleepEntryToday?.onTime ? '#16a34a' : '#f59e0b',
      allDay: false,
    } as CalendarEvent);
  }
  if (bedTime && bedTime !== '00:00') {
    const bedEnd = (() => {
      const [h, m] = bedTime.split(':').map(Number);
      const total = h * 60 + m + 30;
      return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    })();
    syntheticBlocks.push({
      id: '__bed__',
      date: selectedDate,
      title: '🌙 Bedtime',
      startTime: bedTime,
      endTime: bedEnd,
      color: '#6366f1',
      allDay: false,
    } as CalendarEvent);
  }

  const allDayEvents = dayEvents.filter(e => e.allDay || (!e.startTime && !e.endTime));
  const timedEvents  = [...dayEvents.filter(e => !e.allDay && !!e.startTime), ...syntheticBlocks];
  const laid         = layoutEvents(timedEvents, startHour, endHour);

  // Auto-scroll to current time (or start+2h as fallback) when date or timeline bounds change
  useEffect(() => {
    if (!timelineRef.current) return;
    const isToday = selectedDate === todayStr();
    const h       = isToday
      ? new Date().getHours() + new Date().getMinutes() / 60
      : startHour + 2;
    const targetPx   = hoursToPx(Math.max(h, startHour), startHour);
    const containerH = timelineRef.current.clientHeight;
    timelineRef.current.scrollTo({ top: Math.max(0, targetPx - containerH / 3), behavior: 'instant' });
  }, [selectedDate, startHour]);

  const timelineH = totalHours * HOUR_HEIGHT;

  if (!isReady) return <div className="flex flex-col h-full bg-ql-bg" />;

  return (
    <div className="flex flex-col h-full bg-ql-bg">
      {/* Month + week nav */}
      <div className="px-4 py-2 flex items-center justify-between shrink-0 border-b border-ql bg-ql-hdr">
        <button onClick={prevWeek} className="w-8 h-8 flex items-center justify-center rounded-xl text-ql-3 hover:bg-ql-surface2 transition-colors">
          ‹
        </button>
        <button
          onClick={() => setShowMonthPicker(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-ql-surface2 transition-colors"
        >
          <span className="text-ql text-sm font-semibold">
            {weekDays[0].toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </span>
          <span className="text-ql-3 text-xs">▾</span>
        </button>
        <button onClick={nextWeek} className="w-8 h-8 flex items-center justify-center rounded-xl text-ql-3 hover:bg-ql-surface2 transition-colors">
          ›
        </button>
      </div>

      <WeekStrip
        weekDays={weekDays}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        eventDateSet={eventDateSet}
      />

      <AllDayPills events={allDayEvents} onSelect={setSelectedEvent} />

      {/* Timeline */}
      <div ref={timelineRef} className="flex-1 overflow-y-auto relative">
        <div className="relative" style={{ height: timelineH }}>

          {/* Hour rows */}
          {Array.from({ length: totalHours }, (_, i) => {
            const h = startHour + i;
            return (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-ql"
                style={{ top: i * HOUR_HEIGHT }}
              >
                <span className="absolute left-1 -top-2 text-[9px] text-ql-3 font-medium w-8 text-right select-none">
                  {fmtHour(h)}
                </span>
              </div>
            );
          })}

          {/* Half-hour faint lines */}
          {Array.from({ length: totalHours }, (_, i) => (
            <div
              key={`h${i}`}
              className="absolute left-10 right-0 border-t border-ql opacity-40"
              style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
            />
          ))}

          {/* Current time line */}
          <div className="absolute" style={{ left: 40, right: 0, top: 0, bottom: 0 }}>
            <CurrentTimeLine startHour={startHour} endHour={endHour} />
          </div>

          {/* Event blocks */}
          {laid.map(({ event: ev, top, height, col, cols }) => {
            const LEFT_OFFSET  = 44;
            const totalWidth   = `calc(100% - ${LEFT_OFFSET}px)`;
            const colWidth     = `calc(${totalWidth} / ${cols})`;
            const leftOffset   = `calc(${LEFT_OFFSET}px + (${totalWidth} / ${cols}) * ${col})`;

            // Study plan overlay — only when block is tall enough to be useful
            const linkedPlan   = ev.planId ? gymPlans.find(p => p.id === ev.planId) : null;
            const showBlocks   = linkedPlan && isStudyPlan(linkedPlan) && height >= 80 && !!ev.startTime && !!ev.endTime;

            // Fix 2: clip visual height to last study block's end time
            let displayHeight = height;
            if (showBlocks && linkedPlan && ev.startTime && ev.endTime) {
              const eventStartH       = timeToHours(ev.startTime);
              const clampedEventStart = Math.max(eventStartH, startHour);
              const clampedEventEnd   = Math.min(timeToHours(ev.endTime), endHour);
              let lastBlockEndH       = eventStartH;
              for (const ex of (linkedPlan.exercises ?? [])) {
                const m = ex.name.match(/(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/);
                if (!m) continue;
                lastBlockEndH = Math.max(lastBlockEndH, timeToHours(m[2]));
              }
              const clampedLastEnd = Math.min(lastBlockEndH, clampedEventEnd);
              if (clampedLastEnd > clampedEventStart) {
                displayHeight = Math.max((clampedLastEnd - clampedEventStart) * HOUR_HEIGHT, 24) + 4;
              }
            }

            return (
              <button
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className="absolute rounded-xl overflow-hidden border border-white/20 shadow-sm text-left transition-opacity active:opacity-70"
                style={{
                  top:    top + 1,
                  height: displayHeight - 2,
                  left:   leftOffset,
                  width:  `calc(${colWidth} - 2px)`,
                  backgroundColor: ev.color || '#007aff',
                }}
              >
                {/* Fix 1: study plan title → small text in top-right, normal title otherwise */}
                {showBlocks ? (
                  <p className="absolute top-1 right-1.5 z-10 text-white/70 text-[8px] font-semibold leading-tight max-w-[65%] truncate text-right pointer-events-none">
                    {ev.title}
                  </p>
                ) : (
                  <div className="px-2 pt-1 pb-0.5 shrink-0">
                    <p className="text-white text-[11px] font-semibold leading-tight truncate">
                      {ev.title}
                    </p>
                    {height >= 36 && (
                      <p className="text-white/75 text-[9px] leading-tight mt-0.5 truncate">
                        {fmtTime(ev.startTime)}{ev.endTime ? ` – ${fmtTime(ev.endTime)}` : ''}
                      </p>
                    )}
                  </div>
                )}

                {/* Study block mini-boxes */}
                {showBlocks && linkedPlan && (
                  <StudyBlocksOverlay
                    plan={linkedPlan}
                    eventStartH={timeToHours(ev.startTime)}
                    eventEndH={timeToHours(ev.endTime)}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail sheet */}
      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* Month/year picker */}
      {showMonthPicker && (
        <MonthYearPicker
          currentYear={weekDays[0].getFullYear()}
          currentMonth={weekDays[0].getMonth()}
          onSelect={handleMonthSelect}
          onClose={() => setShowMonthPicker(false)}
        />
      )}
    </div>
  );
}
