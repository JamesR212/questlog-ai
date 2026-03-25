'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/store/gameStore';
import {
  fetchLeaderboard, submitEntry, haversineKm, fuzzLocation,
  type LeaderboardEntry, type LeaderboardCategory,
} from '@/lib/leaderboard';
import { DEMO_ENTRIES } from '@/lib/leaderboardDemoData';

const LeaderboardMap = dynamic(() => import('./LeaderboardMap'), { ssr: false });

// ─── Category config ──────────────────────────────────────────────────────────

interface CategoryConfig {
  id: LeaderboardCategory;
  label: string;
  icon: string;
  unit: string;
  method: 'ai_video' | 'gps' | 'synced' | 'gps_synced';
  description: string;
}

const CATEGORIES: CategoryConfig[] = [
  { id: 'bench_press',  label: 'Bench Press',   icon: '🏋️', unit: 'kg',     method: 'ai_video',  description: '1 rep max bench press — video required'               },
  { id: 'deadlift',     label: 'Deadlift',      icon: '💀', unit: 'kg',     method: 'ai_video',  description: '1 rep max deadlift — video required'                   },
  { id: 'squat',        label: 'Squat',         icon: '🦵', unit: 'kg',     method: 'ai_video',  description: '1 rep max squat — video required'                      },
  { id: 'curl',         label: 'Dumbbell Curl', icon: '💪', unit: 'kg',     method: 'ai_video',  description: '1 rep max dumbbell curl — video required'              },
  { id: 'lat_pulldown', label: 'Lat Pulldown',  icon: '🔽', unit: 'kg',     method: 'ai_video',  description: '1 rep max lat pulldown — video required'              },
  { id: 'cable_row',   label: 'Cable Row',     icon: '🚣', unit: 'kg',     method: 'ai_video',  description: '1 rep max cable row — video required'                 },
  { id: 'longest_run',  label: 'Longest Run',   icon: '🏃', unit: 'km',     method: 'gps_synced', description: 'Longest single GPS-tracked or synced run'            },
  { id: 'steps_day',    label: 'Steps (Day)',   icon: '👟', unit: 'steps',  method: 'gps_synced', description: 'Most steps in a single day — GPS or synced'          },
  { id: 'floors',       label: 'Floors',        icon: '🏗️', unit: 'floors', method: 'gps_synced', description: 'Most floors climbed — GPS tracked or synced activity' },
];

// ─── Radius slider helpers ─────────────────────────────────────────────────────
// Slider range: 1–502.  1–500 = km directly.  501 = National.  502 = Global.

const SLIDER_MIN = 1;
const SLIDER_MAX = 502;

function sliderToRadius(v: number): number | null {
  if (v >= 502) return null;     // Global
  if (v >= 501) return 2000;     // National
  return v;                       // km
}

function sliderLabel(v: number): string {
  if (v >= 502) return '🌍 Global';
  if (v >= 501) return 'National';
  if (v >= 1000) return `${(v / 1000).toFixed(0)} Mm`; // shouldn't happen
  return `${v} km`;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

const VERIFICATION_BADGE: Record<string, { icon: string; label: string; color: string }> = {
  ai_verified: { icon: '🤖', label: 'AI Verified',  color: 'text-emerald-400' },
  gps:         { icon: '📡', label: 'GPS',           color: 'text-blue-400'   },
  synced:      { icon: '🔄', label: 'Synced',        color: 'text-purple-400' },
  gps_synced:  { icon: '📡', label: 'GPS & Synced',  color: 'text-blue-400'   },
};

function fmt(value: number, unit: string): string {
  if (unit === 'steps') return value.toLocaleString();
  if (unit === 'km')    return value.toFixed(1);
  return String(value);
}

// ─── Submit sheet ─────────────────────────────────────────────────────────────

interface SubmitSheetProps {
  category: CategoryConfig;
  userId: string;
  displayName: string;
  userLat: number;
  userLng: number;
  onClose: () => void;
  onSubmitted: () => void;
}

function SubmitSheet({ category, userId, displayName, userLat, userLng, onClose, onSubmitted }: SubmitSheetProps) {
  const { gpsActivities, stepLog } = useGameStore();

  const fileRef                         = useRef<HTMLInputElement>(null);
  const pendingFileRef                  = useRef<File | null>(null);
  const [weight, setWeight]             = useState('');
  const [mediaUrl, setMediaUrl]         = useState<string | null>(null);
  const [uploadedFileUri, setUploadedFileUri] = useState<string | null>(null);
  const [mimeType, setMimeType]         = useState('video/mp4');
  const [verifying, setVerifying]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [verified, setVerified]       = useState<boolean | null>(null);
  const [verifyNote, setVerifyNote]   = useState('');
  const [hideLocation, setHideLocation] = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const autoValue = (() => {
    if (category.id === 'longest_run') {
      const best = gpsActivities.filter(a => a.type === 'run').sort((a, b) => b.distance - a.distance)[0];
      return best ? { value: parseFloat(best.distance.toFixed(2)), date: best.startTime.slice(0, 10), note: 'GPS tracked run' } : null;
    }
    if (category.id === 'floors') {
      const best = gpsActivities.filter(a => a.floorsClimbed).sort((a, b) => (b.floorsClimbed ?? 0) - (a.floorsClimbed ?? 0))[0];
      return best ? { value: best.floorsClimbed!, date: best.startTime.slice(0, 10), note: 'GPS tracked activity' } : null;
    }
    if (category.id === 'steps_day') {
      const synced = stepLog.filter(e => e.source !== 'manual').sort((a, b) => b.steps - a.steps)[0];
      return synced ? { value: synced.steps, date: synced.date, note: 'Synced from fitness tracker' } : null;
    }
    return null;
  })();

  const getCoords = () => hideLocation ? fuzzLocation(userLat, userLng) : { lat: userLat, lng: userLng };

  const handleFile = (file: File) => {
    setError(null); setVerified(null); setUploadedFileUri(null);
    if (file.size > 500 * 1024 * 1024) { setError('File too large — keep clips under 500 MB'); return; }
    setMimeType(file.type || 'video/mp4');
    pendingFileRef.current = file;
    setMediaUrl(URL.createObjectURL(file));
  };

  const verifyLift = async () => {
    if (!pendingFileRef.current || !weight) return;
    setVerifying(true); setError(null);
    try {
      // Step 1: upload file as binary FormData
      const formData = new FormData();
      formData.append('file', pendingFileRef.current);
      const uploadRes = await fetch('/api/gemini/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.fileUri) throw new Error(uploadData.error ?? 'Upload failed');
      setUploadedFileUri(uploadData.fileUri);

      // Step 2: verify using just the URI
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'verify_lift', context: { fileUri: uploadData.fileUri, mimeType: uploadData.mimeType, exercise: category.label, weight: parseFloat(weight) } }),
      });
      const data = await res.json();
      if (data.verification) {
        setVerified(data.verification.verified);
        setVerifyNote(data.verification.verified ? data.verification.notes : (data.verification.rejectionReason ?? data.verification.notes));
      } else { setError(data.error ?? 'Verification failed — try again'); }
    } catch { setError('Connection lost'); }
    finally { setVerifying(false); }
  };

  const submitGps = async () => {
    if (!autoValue) return;
    setSubmitting(true);
    try {
      const { lat, lng } = getCoords();
      await submitEntry({ userId, displayName, category: category.id, value: autoValue.value, unit: category.unit,
        verificationStatus: category.method === 'gps' ? 'gps' : 'synced', verificationNote: autoValue.note,
        lat, lng, locationFuzzed: hideLocation, date: autoValue.date });
      onSubmitted();
    } catch { setError('Failed to submit — check your connection'); }
    finally { setSubmitting(false); }
  };

  const submitLift = async () => {
    if (!verified || !weight) return;
    setSubmitting(true);
    try {
      const { lat, lng } = getCoords();
      await submitEntry({ userId, displayName, category: category.id, value: parseFloat(weight), unit: category.unit,
        verificationStatus: 'ai_verified', verificationNote: verifyNote,
        lat, lng, locationFuzzed: hideLocation, date: new Date().toISOString().slice(0, 10) });
      onSubmitted();
    } catch { setError('Failed to submit — check your connection'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-ql-hdr rounded-t-3xl border-t border-ql shadow-2xl p-5 pb-10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{category.icon}</span>
            <div>
              <p className="text-ql text-base font-bold">{category.label}</p>
              <p className="text-ql-3 text-xs">{category.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ql-3 text-2xl leading-none">×</button>
        </div>

        {/* Location privacy toggle — always shown */}
        <button
          onClick={() => setHideLocation(h => !h)}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors text-left ${hideLocation ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-ql bg-ql-surface2'}`}
        >
          <span className="text-lg">{hideLocation ? '🔒' : '📍'}</span>
          <div className="flex-1">
            <p className="text-ql text-xs font-semibold">{hideLocation ? 'Location hidden (~3 km accuracy)' : 'Exact location shown on map'}</p>
            <p className="text-ql-3 text-[10px]">{hideLocation ? 'Your pin will appear within ~3 km of the real location' : 'Tap to hide your exact location'}</p>
          </div>
          <div className={`w-9 h-5 rounded-full transition-colors ${hideLocation ? 'bg-emerald-500' : 'bg-ql-surface3'} relative`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${hideLocation ? 'left-4' : 'left-0.5'}`} />
          </div>
        </button>

        {/* GPS / Synced */}
        {category.method !== 'ai_video' && (
          <>
            {autoValue ? (
              <div className="bg-ql-surface2 rounded-2xl border border-ql p-4 flex flex-col gap-2">
                <p className="text-ql-3 text-xs font-medium">Your best verified result</p>
                <p className="text-ql text-2xl font-black">{fmt(autoValue.value, category.unit)} <span className="text-ql-3 text-sm font-normal">{category.unit}</span></p>
                <p className="text-ql-3 text-xs">{autoValue.date} · {autoValue.note}</p>
              </div>
            ) : (
              <div className="bg-ql-surface2 rounded-2xl border border-ql p-4 text-center">
                <p className="text-ql-3 text-sm">No verified data found</p>
                <p className="text-ql-3 text-xs mt-1">{category.id === 'steps_day' ? 'Connect Google Fit in Settings → Training.' : 'Record a GPS activity in Training → Track first.'}</p>
              </div>
            )}
            {autoValue && (
              <button onClick={submitGps} disabled={submitting}
                className="w-full py-3 rounded-xl bg-ql-accent text-white font-semibold text-sm hover:bg-ql-accent-h transition-colors disabled:opacity-50">
                {submitting ? 'Submitting…' : `Submit to ${category.label} Leaderboard`}
              </button>
            )}
          </>
        )}

        {/* Lift — video verification */}
        {category.method === 'ai_video' && (
          <>
            <div className="rounded-xl border border-amber-500/40 bg-amber-400/20 px-3 py-2.5 flex gap-2">
              <span className="text-sm shrink-0">⚠️</span>
              <p className="text-ql text-[11px]">Video verified by AI. For fun only — always use a spotter for heavy attempts.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-ql-3 text-xs font-medium">Claimed weight (kg)</p>
              <input type="number" value={weight}
                onChange={e => { setWeight(e.target.value); setVerified(null); setVerifyNote(''); }}
                placeholder="e.g. 100"
                className="bg-ql-input border border-ql-input rounded-xl px-4 py-2.5 text-ql text-sm outline-none focus:border-ql-accent transition-colors" />
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-ql-3 text-xs font-medium">Lift video <span className="text-red-400">*</span></p>
              {!mediaUrl ? (
                <button onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-ql rounded-xl p-6 flex flex-col items-center gap-2 hover:border-ql-accent transition-colors">
                  <span className="text-3xl">🎬</span>
                  <p className="text-ql-3 text-xs">Tap to upload video or photo</p>
                  <p className="text-ql-3 text-[10px]">Keep clips short — under 30 seconds</p>
                </button>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                  {mimeType.startsWith('video/') ? <video src={mediaUrl} controls className="w-full h-full object-contain" /> : <img src={mediaUrl} alt="Lift" className="w-full h-full object-contain" />}
                  <button onClick={() => { setMediaUrl(null); setUploadedFileUri(null); pendingFileRef.current = null; setVerified(null); setVerifyNote(''); }}
                    className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-lg">Change</button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="video/*,image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            {pendingFileRef.current && weight && verified === null && (
              <button onClick={verifyLift} disabled={verifying}
                className="w-full py-3 rounded-xl bg-ql-surface2 border border-ql text-ql font-semibold text-sm hover:bg-ql-surface3 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {verifying ? <><span className="inline-flex gap-1"><span className="animate-bounce [animation-delay:0ms]">·</span><span className="animate-bounce [animation-delay:150ms]">·</span><span className="animate-bounce [animation-delay:300ms]">·</span></span>Verifying with AI…</> : '🤖 Verify with AI'}
              </button>
            )}

            {verified === true && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 flex flex-col gap-1">
                <p className="text-emerald-400 text-xs font-semibold">✅ AI Verified</p>
                <p className="text-ql-2 text-[11px]">{verifyNote}</p>
              </div>
            )}
            {verified === false && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 flex flex-col gap-1">
                <p className="text-red-400 text-xs font-semibold">❌ Not Verified</p>
                <p className="text-ql-2 text-[11px]">{verifyNote}</p>
                <button onClick={() => { setVerified(null); setVerifyNote(''); }} className="text-ql-accent text-[11px] mt-1 self-start">Try again with a different clip</button>
              </div>
            )}

            {verified === true && (
              <button onClick={submitLift} disabled={submitting}
                className="w-full py-3 rounded-xl bg-ql-accent text-white font-semibold text-sm hover:bg-ql-accent-h transition-colors disabled:opacity-50">
                {submitting ? 'Submitting…' : `Submit ${weight}kg to ${category.label} Leaderboard`}
              </button>
            )}
          </>
        )}

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LeaderboardPage({ userId, displayName }: { userId: string; displayName: string }) {
  const [activeCat, setActiveCat]           = useState<LeaderboardCategory>('bench_press');
  const [radiusStep, setRadiusStep]         = useState(25);
  const [committedRadius, setCommittedRadius] = useState(25);
  const [entries, setEntries]               = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]               = useState(false);
  const [userLat, setUserLat]               = useState<number | null>(null);
  const [userLng, setUserLng]               = useState<number | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [showSubmit, setShowSubmit]         = useState(false);
  const [submitted, setSubmitted]           = useState(false);
  const [viewMode, setViewMode]             = useState<'list' | 'map'>('list');
  const [period, setPeriod]                 = useState<'day' | 'week' | 'month' | 'all'>('all');

  const radiusKm = sliderToRadius(committedRadius);
  const category = CATEGORIES.find(c => c.id === activeCat)!;

  const periodEntries = (() => {
    // Period filter
    let result = entries;
    if (period !== 'all') {
      const now  = new Date();
      const from = new Date(now);
      if (period === 'day')   from.setDate(now.getDate() - 1);
      if (period === 'week')  from.setDate(now.getDate() - 7);
      if (period === 'month') from.setMonth(now.getMonth() - 1);
      const fromStr = from.toISOString().slice(0, 10);
      result = result.filter(e => e.date >= fromStr);
    }
    // Radius guard — hard filter at display time so timing gaps in load() never leak entries through
    if (radiusKm !== null && userLat !== null && userLng !== null) {
      result = result.filter(e => haversineKm(userLat, userLng, e.lat, e.lng) <= radiusKm);
    }
    // Re-sort after any filtering (higher value = better rank)
    return [...result].sort((a, b) => b.value - a.value);
  })();

  const myEntry  = periodEntries.find(e => e.userId === userId);
  const myRank   = myEntry ? periodEntries.indexOf(myEntry) + 1 : null;

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationDenied(true); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
      ()  => setLocationDenied(true),
      { timeout: 8000 },
    );
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const km   = sliderToRadius(committedRadius);
      const data = await fetchLeaderboard(activeCat, userLat, userLng, userLat ? km : null);
      const demo = DEMO_ENTRIES[activeCat] ?? [];

      // Apply same radius filter to demo entries
      const filteredDemo = (km !== null && userLat !== null && userLng !== null)
        ? demo.filter(e => haversineKm(userLat, userLng, e.lat, e.lng) <= km)
        : demo;

      // Merge real + demo, keep best per userId
      const best = new Map<string, LeaderboardEntry>();
      for (const e of [...filteredDemo, ...data]) {
        const existing = best.get(e.userId);
        if (!existing || e.value > existing.value) best.set(e.userId, e);
      }
      setEntries([...best.values()].sort((a, b) => b.value - a.value));
    } catch {
      setEntries(DEMO_ENTRIES[activeCat] ?? []);
    } finally {
      setLoading(false);
    }
  }, [activeCat, userLat, userLng, committedRadius]);

  useEffect(() => { load(); }, [load]);

  const onSubmitted = () => {
    setShowSubmit(false);
    setSubmitted(true);
    load();
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div>
        <h1 className="text-ql text-xl font-black">🏆 Leaderboards</h1>
        <p className="text-ql-3 text-xs mt-0.5">Regional rankings — verified by GPS or AI</p>
      </div>

      {/* Category picker */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCat(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all shrink-0 ${
              activeCat === cat.id ? 'bg-ql-accent text-white border-ql-accent' : 'bg-ql-surface2 text-ql-2 border-ql hover:bg-ql-surface3'
            }`}>
            <span>{cat.icon}</span>{cat.label}
          </button>
        ))}
      </div>

      {/* Category info row */}
      <div className="bg-ql-surface rounded-2xl border border-ql px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">{category.icon}</span>
        <div className="flex-1">
          <p className="text-ql text-sm font-semibold">{category.label}</p>
          <p className="text-ql-3 text-xs">{category.description}</p>
        </div>
        {(() => {
          const key = category.method === 'ai_video' ? 'ai_verified' : category.method;
          const b   = VERIFICATION_BADGE[key];
          return (
            <div className={`text-xs font-medium flex items-center gap-1 ${b.color}`}>
              {b.icon} {b.label}
              {category.method === 'gps_synced' && <span className="text-purple-400">/ 🔄</span>}
            </div>
          );
        })()}
      </div>

      {/* Location denied */}
      {locationDenied && (
        <div className="bg-ql-surface rounded-2xl border border-ql px-4 py-3 flex items-center gap-3">
          <span className="text-xl">📍</span>
          <div className="flex-1">
            <p className="text-ql text-sm font-medium">Location needed for radius filter</p>
            <p className="text-ql-3 text-xs">Showing global rankings.</p>
          </div>
          <button onClick={requestLocation} className="text-ql-accent text-xs font-semibold">Enable</button>
        </div>
      )}

      {/* Radius slider */}
      {userLat && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-ql-3 text-xs font-medium">Search radius</p>
            <p className="text-ql text-xs font-bold">{sliderLabel(radiusStep)}</p>
          </div>
          <input
            type="range"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={1}
            value={radiusStep}
            onChange={e => setRadiusStep(Number(e.target.value))}
            onMouseUp={e => setCommittedRadius(Number((e.target as HTMLInputElement).value))}
            onTouchEnd={e => setCommittedRadius(Number((e.target as HTMLInputElement).value))}
            className="w-full accent-ql-accent h-1.5 rounded-full cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-ql-3">
            <span>1 km</span><span>250 km</span><span>National</span><span>🌍 Global</span>
          </div>
        </div>
      )}

      {/* Period filter */}
      <div className="flex gap-1 bg-ql-surface2 rounded-xl p-1 border border-ql">
        {([['day','Today'],['week','Week'],['month','Month'],['all','All Time']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setPeriod(v)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${period === v ? 'bg-ql-accent text-white' : 'text-ql-3'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* List / Map toggle */}
      <div className="flex gap-1 bg-ql-surface2 rounded-xl p-1 border border-ql">
        {(['list', 'map'] as const).map(v => (
          <button key={v} onClick={() => setViewMode(v)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === v ? 'bg-ql-accent text-white' : 'text-ql-3'}`}>
            {v === 'list' ? '☰ List' : '🗺️ Map'}
          </button>
        ))}
      </div>

      {/* My ranking banner */}
      {myRank && myEntry && (
        <div className="bg-ql-accent/15 border border-ql-accent/30 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">{myRank <= 3 ? RANK_MEDALS[myRank - 1] : `#${myRank}`}</span>
          <div className="flex-1">
            <p className="text-ql text-sm font-semibold">Your ranking</p>
            <p className="text-ql-3 text-xs">{fmt(myEntry.value, category.unit)} {category.unit}{myEntry.locationFuzzed ? ' · 📍 location hidden' : ''}</p>
          </div>
          <p className="text-ql-accent text-sm font-black">#{myRank}</p>
        </div>
      )}

      {/* Map view */}
      {viewMode === 'map' && !loading && (
        periodEntries.length === 0 ? (
          <div className="rounded-2xl border border-ql bg-ql-surface p-8 text-center text-ql-3 text-sm">No entries to show on map</div>
        ) : (
          <LeaderboardMap entries={periodEntries} unit={category.unit} userId={userId} userLat={userLat} userLng={userLng} radiusKm={radiusKm} />
        )
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-10 text-ql-3 text-sm">Loading rankings…</div>
          ) : periodEntries.length === 0 ? (
            <div className="bg-ql-surface rounded-2xl border border-ql p-8 text-center flex flex-col items-center gap-3">
              <span className="text-4xl">{category.icon}</span>
              <p className="text-ql text-sm font-semibold">No entries yet in this area</p>
              <p className="text-ql-3 text-xs">Be the first to set a score!</p>
            </div>
          ) : periodEntries.map((entry, idx) => {
            const rank  = idx + 1;
            const isMe  = entry.userId === userId;
            const badge = VERIFICATION_BADGE[entry.verificationStatus];
            const distKm = userLat && userLng && entry.lat && entry.lng
              ? haversineKm(userLat, userLng, entry.lat, entry.lng) : null;

            return (
              <div key={entry.id}
                className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${isMe ? 'bg-ql-accent/10 border-ql-accent/30' : 'bg-ql-surface border-ql'}`}>
                <div className="w-8 text-center shrink-0">
                  {rank <= 3 ? <span className="text-xl">{RANK_MEDALS[rank-1]}</span> : <span className="text-ql-3 text-sm font-bold">#{rank}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-semibold truncate ${isMe ? 'text-ql-accent' : 'text-ql'}`}>{entry.displayName}{isMe ? ' (you)' : ''}</p>
                    <span className={`text-[10px] ${badge.color}`} title={badge.label}>{badge.icon}</span>
                    {entry.locationFuzzed && <span className="text-[10px] text-ql-3" title="Approximate location">📍</span>}
                  </div>
                  {distKm !== null && (
                    <p className="text-ql-3 text-[10px]">{distKm < 1 ? `${Math.round(distKm*1000)}m away` : `${distKm.toFixed(0)} km away`}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-ql text-sm font-black">{fmt(entry.value, category.unit)}</p>
                  <p className="text-ql-3 text-[10px]">{category.unit}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit CTA */}
      {submitted ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-center text-emerald-400 text-sm font-semibold">✅ Score submitted!</div>
      ) : (
        <button onClick={() => setShowSubmit(true)}
          className="w-full py-3.5 rounded-2xl bg-ql-accent text-white font-bold text-sm hover:bg-ql-accent-h transition-colors">
          {entries.find(e => e.userId === userId) ? `Update my ${category.label} score` : `Submit to ${category.label} Leaderboard`}
        </button>
      )}


      {/* GPS integrity disclaimer */}
      {category.method !== 'ai_video' && (
        <div className="rounded-xl border border-ql bg-ql-surface2 px-4 py-3 flex gap-2.5">
          <span className="text-sm shrink-0">ℹ️</span>
          <p className="text-ql-3 text-[11px] leading-relaxed">
            <strong className="text-ql-2">Verified data only.</strong> Only GPS-tracked activities or synced fitness data are accepted. Manually entered values cannot be submitted to protect leaderboard integrity.
          </p>
        </div>
      )}

      {/* Submit sheet */}
      {showSubmit && userLat !== null && userLng !== null && (
        <SubmitSheet category={category} userId={userId} displayName={displayName}
          userLat={userLat} userLng={userLng} onClose={() => setShowSubmit(false)} onSubmitted={onSubmitted} />
      )}
      {showSubmit && (userLat === null || userLng === null) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={() => setShowSubmit(false)}>
          <div className="bg-ql-surface rounded-2xl border border-ql p-6 text-center flex flex-col gap-3 max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <span className="text-4xl">📍</span>
            <p className="text-ql text-sm font-semibold">Location required</p>
            <p className="text-ql-3 text-xs">Allow location access to submit. Your location (exact or hidden) is stored with your entry so others can see nearby scores.</p>
            <button onClick={() => { requestLocation(); setShowSubmit(false); }} className="py-2.5 rounded-xl bg-ql-accent text-white text-sm font-semibold">Enable Location</button>
            <button onClick={() => setShowSubmit(false)} className="text-ql-3 text-xs">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
