'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/store/gameStore';
import type { GpsActivity } from '@/store/gameStore';

const RouteMap = dynamic(() => import('./RouteMap'), { ssr: false, loading: () => (
  <div className="w-full h-40 bg-ql-surface2 rounded-2xl flex items-center justify-center">
    <p className="text-ql-3 text-xs">Loading map…</p>
  </div>
)});

// ── Helpers ────────────────────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtPace(distKm: number, secs: number): string {
  if (distKm < 0.01) return '--:--';
  const minPerKm = secs / 60 / distKm;
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtSpeed(distKm: number, secs: number): string {
  if (secs < 1) return '0.0';
  return (distKm / (secs / 3600)).toFixed(1);
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Activity history card ──────────────────────────────────────────────────

const TYPE_META = {
  run:   { icon: '🏃', label: 'Run',   color: '#ef4444' },
  cycle: { icon: '🚴', label: 'Cycle', color: '#3b82f6' },
  walk:  { icon: '🚶', label: 'Walk',  color: '#34c759' },
};

function ActivityCard({ activity, onDelete }: { activity: GpsActivity; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const meta = TYPE_META[activity.type];
  const pace = fmtPace(activity.distance, activity.duration);
  const speed = fmtSpeed(activity.distance, activity.duration);
  const date = new Date(activity.startTime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="bg-ql-surface rounded-2xl border border-ql overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left" onClick={() => setExpanded(e => !e)}>
        <span className="text-2xl">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-ql text-sm font-semibold">{meta.label}</p>
          <p className="text-ql-3 text-xs">{date}</p>
        </div>
        <div className="flex gap-4 text-right shrink-0">
          <div>
            <p className="text-ql text-sm font-bold">{activity.distance.toFixed(2)}</p>
            <p className="text-ql-3 text-[10px]">km</p>
          </div>
          <div>
            <p className="text-ql text-sm font-bold">{fmtTime(activity.duration)}</p>
            <p className="text-ql-3 text-[10px]">time</p>
          </div>
          <span className="text-ql-3 text-base self-center">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-ql px-4 py-3 flex flex-col gap-3">
          {activity.type !== 'cycle' && (
            <div className="flex gap-4">
              <div className="bg-ql-surface2 rounded-xl px-3 py-2 text-center flex-1">
                <p className="text-ql text-sm font-bold">{pace}</p>
                <p className="text-ql-3 text-[10px]">min/km</p>
              </div>
              <div className="bg-ql-surface2 rounded-xl px-3 py-2 text-center flex-1">
                <p className="text-ql text-sm font-bold">{speed}</p>
                <p className="text-ql-3 text-[10px]">km/h</p>
              </div>
            </div>
          )}
          {activity.type === 'cycle' && (
            <div className="bg-ql-surface2 rounded-xl px-3 py-2 text-center">
              <p className="text-ql text-sm font-bold">{speed} km/h</p>
              <p className="text-ql-3 text-[10px]">avg speed</p>
            </div>
          )}
          {(activity.floorsClimbed ?? 0) > 0 && (
            <div className="flex gap-3">
              <div className="bg-ql-surface2 rounded-xl px-3 py-2 text-center flex-1">
                <p className="text-ql text-sm font-bold">{activity.elevationGain} m</p>
                <p className="text-ql-3 text-[10px]">elevation gain</p>
              </div>
              <div className="bg-ql-surface2 rounded-xl px-3 py-2 text-center flex-1">
                <p className="text-ql text-sm font-bold">{activity.floorsClimbed} 🏢</p>
                <p className="text-ql-3 text-[10px]">floors climbed</p>
              </div>
            </div>
          )}
          {activity.coords.length >= 2 && (
            <div className="rounded-xl overflow-hidden" style={{ height: 180 }}>
              <RouteMap coords={activity.coords} />
            </div>
          )}
          <button
            onClick={() => confirming ? onDelete() : setConfirming(true)}
            className={`text-xs py-1.5 rounded-xl border transition-colors ${confirming ? 'border-red-400 text-red-400' : 'border-ql text-ql-3'}`}
          >
            {confirming ? 'Confirm delete?' : 'Delete activity'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Tracker ───────────────────────────────────────────────────────────

type Phase = 'idle' | 'tracking' | 'paused' | 'summary';

export default function ActivityTracker() {
  const { gpsActivities, addGpsActivity, deleteGpsActivity } = useGameStore();

  const [phase,         setPhase]         = useState<Phase>('idle');
  const [actType,       setActType]       = useState<'run' | 'cycle' | 'walk'>('run');
  const [elapsed,       setElapsed]       = useState(0);
  const [distance,      setDistance]      = useState(0);
  const [coords,        setCoords]        = useState<{ lat: number; lng: number; alt?: number }[]>([]);
  const [elevationGain, setElevationGain] = useState(0);
  const [startTime,     setStartTime]     = useState('');
  const [gpsError,      setGpsError]      = useState('');
  const [wakeLockOn,    setWakeLockOn]    = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(true);

  const watchRef         = useRef<number | null>(null);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCoord        = useRef<{ lat: number; lng: number } | null>(null);
  const lastAlt          = useRef<number | null>(null);
  const warmupCount      = useRef(0);
  const lastPosTime      = useRef<number | null>(null); // wall-clock ms of last GPS point
  const timerStartMs     = useRef<number>(0);           // wall-clock ms when timer last started
  const elapsedAtPause   = useRef<number>(0);           // elapsed accumulated before last pause
  const wakeLockRef      = useRef<WakeLockSentinel | null>(null);
  const phaseRef         = useRef<Phase>('idle');
  phaseRef.current = phase;

  // ── Wake Lock ────────────────────────────────────────────────────────────

  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) { setWakeLockSupported(false); return; }
    try {
      wakeLockRef.current = await (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
      setWakeLockOn(true);
      wakeLockRef.current.addEventListener('release', () => setWakeLockOn(false));
    } catch {
      // permission denied or unsupported — degrade gracefully
      setWakeLockSupported(false);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; }
    setWakeLockOn(false);
  }, []);

  // Re-acquire wake lock when tab becomes visible again during a session
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && phaseRef.current === 'tracking') {
        acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [acquireWakeLock]);

  // ── GPS position handler (shared between start & resume) ─────────────────

  const handlePosition = useCallback((pos: GeolocationPosition) => {
    const { latitude: lat, longitude: lng, altitude: alt, accuracy } = pos.coords;
    const now = Date.now();

    // Gap detection: if > 10 s since last point, the app was in the background.
    // Update position reference but skip the crow-flies distance jump.
    const gapMs = lastPosTime.current !== null ? now - lastPosTime.current : 0;
    const isBackgroundGap = gapMs > 10_000;
    lastPosTime.current = now;

    const next = { lat, lng, ...(alt != null ? { alt } : {}) };
    setCoords(prev => [...prev, next]);
    warmupCount.current += 1;

    if (!isBackgroundGap && warmupCount.current > 4 && lastCoord.current) {
      const d = haversine(lastCoord.current.lat, lastCoord.current.lng, lat, lng);
      if (accuracy <= 50 && d >= 0.005 && d < 0.5) setDistance(prev => prev + d);
    }

    if (alt != null) {
      if (!isBackgroundGap && lastAlt.current != null) {
        const gain = alt - lastAlt.current;
        if (gain > 1) setElevationGain(prev => prev + gain);
      }
      lastAlt.current = alt;
    }
    lastCoord.current = next;
  }, []);

  // ── Timer (wall-clock based so background sleep doesn't lose seconds) ────

  const startTimer = useCallback((baseElapsed: number) => {
    elapsedAtPause.current = baseElapsed;
    timerStartMs.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const wallElapsed = Math.floor((Date.now() - timerStartMs.current) / 1000);
      setElapsed(elapsedAtPause.current + wallElapsed);
    }, 500); // poll every 500ms — catches up instantly on resume
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
  }, []);

  // Sync elapsed on visibility restore (timer drift correction)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && phaseRef.current === 'tracking' && timerRef.current) {
        const wallElapsed = Math.floor((Date.now() - timerStartMs.current) / 1000);
        setElapsed(elapsedAtPause.current + wallElapsed);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => () => { stopTimer(); releaseWakeLock(); }, [stopTimer, releaseWakeLock]);

  // ── Controls ──────────────────────────────────────────────────────────────

  const startTracking = async () => {
    if (!navigator.geolocation) { setGpsError('GPS not available on this device.'); return; }
    setGpsError('');
    setElapsed(0);
    setDistance(0);
    setCoords([]);
    setElevationGain(0);
    lastCoord.current = null;
    lastAlt.current = null;
    lastPosTime.current = null;
    warmupCount.current = 0;
    setStartTime(new Date().toISOString());
    setPhase('tracking');

    await acquireWakeLock();

    watchRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      () => setGpsError('Unable to get GPS signal. Make sure location is enabled.'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    startTimer(0);
  };

  const pause = () => {
    // Snapshot elapsed before stopping timer
    const snapped = elapsedAtPause.current + Math.floor((Date.now() - timerStartMs.current) / 1000);
    setElapsed(snapped);
    elapsedAtPause.current = snapped;
    stopTimer();
    releaseWakeLock();
    setPhase('paused');
  };

  const resume = async () => {
    setPhase('tracking');
    await acquireWakeLock();
    lastPosTime.current = null; // reset gap tracker — first point after resume is clean
    watchRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      () => setGpsError('Unable to get GPS signal.'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    startTimer(elapsedAtPause.current);
  };

  const stop = () => {
    const snapped = elapsedAtPause.current + Math.floor((Date.now() - timerStartMs.current) / 1000);
    setElapsed(snapped);
    stopTimer();
    releaseWakeLock();
    setPhase('summary');
  };

  const save = () => {
    const floors = elevationGain > 0 ? Math.round(elevationGain / 3.048) : undefined;
    const activity: GpsActivity = {
      id: generateId(),
      type: actType,
      startTime,
      duration: elapsed,
      distance,
      coords,
      ...(elevationGain > 0 ? { elevationGain: Math.round(elevationGain), floorsClimbed: floors } : {}),
    };
    addGpsActivity(activity);
    setPhase('idle');
  };

  const discard = () => { setPhase('idle'); };

  const meta = TYPE_META[actType];

  // ── Summary view ──────────────────────────────────────────────────────────
  if (phase === 'summary') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{meta.icon}</span>
          <div>
            <h3 className="text-ql text-lg font-bold">{meta.label} Complete</h3>
            <p className="text-ql-3 text-xs">{new Date(startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Distance', value: `${distance.toFixed(2)} km` },
            { label: 'Time',     value: fmtTime(elapsed) },
            { label: actType === 'cycle' ? 'Avg Speed' : 'Avg Pace',
              value: actType === 'cycle' ? `${fmtSpeed(distance, elapsed)} km/h` : `${fmtPace(distance, elapsed)} /km` },
            { label: 'Calories (est.)', value: `${Math.round(elapsed / 60 * (actType === 'cycle' ? 8 : 10))} kcal` },
            ...(elevationGain > 0 ? [
              { label: 'Elevation Gain', value: `${Math.round(elevationGain)} m` },
              { label: 'Floors Climbed', value: `${Math.round(elevationGain / 3.048)} 🏢` },
            ] : []),
          ].map(({ label, value }) => (
            <div key={label} className="bg-ql-surface rounded-2xl border border-ql p-4 text-center">
              <p className="text-ql text-base font-bold">{value}</p>
              <p className="text-ql-3 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {coords.length >= 2 && (
          <div className="w-full rounded-2xl overflow-hidden" style={{ height: 200 }}>
            <RouteMap coords={coords} live />
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={discard} className="flex-1 py-3 border border-ql rounded-2xl text-ql-3 text-sm font-semibold">Discard</button>
          <button onClick={save}    className="flex-1 py-3 bg-ql-accent rounded-2xl text-white text-sm font-semibold">Save Activity</button>
        </div>
      </div>
    );
  }

  // ── Active tracking view ───────────────────────────────────────────────────
  if (phase === 'tracking' || phase === 'paused') {
    return (
      <div className="flex flex-col gap-5 items-center">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className="text-2xl">{meta.icon}</span>
          <p className="text-ql font-bold text-base">{meta.label}</p>
          {phase === 'paused' && <span className="text-xs bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">Paused</span>}
          {/* Wake lock indicator */}
          {phase === 'tracking' && (
            wakeLockOn
              ? <span className="text-xs bg-emerald-400/15 text-emerald-400 px-2 py-0.5 rounded-full font-medium">🔆 Screen on</span>
              : !wakeLockSupported
                ? <span className="text-xs bg-amber-400/15 text-amber-400 px-2 py-0.5 rounded-full font-medium">⚠️ Keep screen on</span>
                : null
          )}
        </div>

        {/* Warning banner if wake lock not supported */}
        {!wakeLockSupported && phase === 'tracking' && (
          <div className="w-full bg-amber-400/10 border border-amber-400/30 rounded-2xl px-4 py-3 text-center">
            <p className="text-amber-400 text-xs font-semibold">Keep your screen on during this activity</p>
            <p className="text-amber-400/70 text-[11px] mt-0.5">Background GPS isn&apos;t available in the browser — locking your screen will pause tracking.</p>
          </div>
        )}

        {/* Big timer */}
        <div className="text-center">
          <p className="text-ql font-bold tabular-nums" style={{ fontSize: 56, lineHeight: 1 }}>{fmtTime(elapsed)}</p>
          <p className="text-ql-3 text-xs mt-1">elapsed</p>
        </div>

        {/* Stats row */}
        <div className={`w-full grid gap-3 ${elevationGain > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="bg-ql-surface rounded-2xl border border-ql p-4 text-center">
            <p className="text-ql text-2xl font-bold tabular-nums">{distance.toFixed(2)}</p>
            <p className="text-ql-3 text-xs mt-0.5">km</p>
          </div>
          <div className="bg-ql-surface rounded-2xl border border-ql p-4 text-center">
            <p className="text-ql text-2xl font-bold tabular-nums">
              {actType === 'cycle' ? fmtSpeed(distance, elapsed) : fmtPace(distance, elapsed)}
            </p>
            <p className="text-ql-3 text-xs mt-0.5">{actType === 'cycle' ? 'km/h' : 'min/km'}</p>
          </div>
          {elevationGain > 0 && (
            <div className="bg-ql-surface rounded-2xl border border-ql p-4 text-center">
              <p className="text-ql text-2xl font-bold tabular-nums">{Math.round(elevationGain / 3.048)}</p>
              <p className="text-ql-3 text-xs mt-0.5">🏢 floors</p>
            </div>
          )}
        </div>

        {/* Live route */}
        {coords.length >= 2 && (
          <div className="w-full rounded-2xl overflow-hidden" style={{ height: 180 }}>
            <RouteMap coords={coords} live />
          </div>
        )}
        {coords.length < 2 && (
          <div className="w-full bg-ql-surface rounded-2xl border border-ql p-4 text-center">
            <p className="text-ql-3 text-xs animate-pulse">Acquiring GPS signal…</p>
          </div>
        )}

        {gpsError && <p className="text-red-400 text-xs text-center">{gpsError}</p>}

        {/* Controls */}
        <div className="w-full flex gap-3">
          {phase === 'tracking'
            ? <button onClick={pause}  className="flex-1 py-3.5 bg-amber-500 rounded-2xl text-white font-semibold text-sm">Pause</button>
            : <button onClick={resume} className="flex-1 py-3.5 bg-emerald-500 rounded-2xl text-white font-semibold text-sm">Resume</button>
          }
          <button onClick={stop} className="flex-1 py-3.5 bg-red-500 rounded-2xl text-white font-semibold text-sm">Stop</button>
        </div>
      </div>
    );
  }

  // ── Idle view ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {/* Activity type picker */}
      <div>
        <p className="text-ql text-sm font-semibold mb-2">Activity Type</p>
        <div className="flex gap-2">
          {(['run', 'cycle', 'walk'] as const).map(t => {
            const m = TYPE_META[t];
            return (
              <button
                key={t}
                onClick={() => setActType(t)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-2xl border transition-all ${
                  actType === t ? 'border-ql-accent bg-ql-accent/10' : 'border-ql bg-ql-surface'
                }`}
              >
                <span className="text-2xl">{m.icon}</span>
                <span className={`text-xs font-semibold ${actType === t ? 'text-ql-accent' : 'text-ql-3'}`}>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* GPS screen-on notice */}
      <div className="bg-ql-surface rounded-2xl border border-ql px-4 py-3 flex gap-3 items-start">
        <span className="text-lg mt-0.5">🔆</span>
        <div>
          <p className="text-ql text-xs font-semibold">Screen stays on during tracking</p>
          <p className="text-ql-3 text-[11px] mt-0.5 leading-relaxed">GAINN requests a wake lock so your screen doesn&apos;t sleep mid-run. If your browser doesn&apos;t support this, keep the screen on manually for accurate GPS.</p>
        </div>
      </div>

      {gpsError && <p className="text-red-400 text-xs text-center">{gpsError}</p>}

      {/* Start button */}
      <button
        onClick={startTracking}
        className="w-full py-4 bg-ql-accent rounded-2xl text-white font-bold text-base"
      >
        Start {meta.label}
      </button>

      {/* History */}
      {gpsActivities.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-ql text-sm font-semibold">Activity History</p>
          {gpsActivities.map(a => (
            <ActivityCard key={a.id} activity={a} onDelete={() => deleteGpsActivity(a.id)} />
          ))}
        </div>
      )}

      {gpsActivities.length === 0 && (
        <div className="text-center py-6 text-ql-3">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-sm font-medium">No activities yet</p>
          <p className="text-xs mt-1">Hit Start to record your first activity.</p>
        </div>
      )}
    </div>
  );
}
