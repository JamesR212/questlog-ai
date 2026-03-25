'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LeaderboardEntry } from '@/lib/leaderboard';

// Fix Leaflet default icon broken by webpack
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MEDAL_COLORS = ['#f59e0b', '#9ca3af', '#b45309'];

function rankIcon(rank: number, isMe: boolean, fuzzed: boolean) {
  const bg    = isMe ? '#16a34a' : rank <= 3 ? MEDAL_COLORS[rank - 1] : '#475569';
  const label = rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : `#${rank}`;
  const border = fuzzed ? '2px dashed rgba(255,255,255,0.6)' : '2.5px solid #fff';
  return L.divIcon({
    html: `<div style="
      min-width:34px;height:34px;padding:0 6px;border-radius:17px;
      background:${bg};border:${border};
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-size:11px;font-weight:800;
      box-shadow:0 3px 10px rgba(0,0,0,0.45);
      white-space:nowrap;cursor:pointer;
    ">${label}</div>`,
    className: '',
    iconSize:   [34, 34],
    iconAnchor: [17, 17],
    popupAnchor:[0, -20],
  });
}

function MapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 11, { animate: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

interface Props {
  entries: LeaderboardEntry[];
  unit: string;
  userId: string;
  userLat: number | null;
  userLng: number | null;
  radiusKm: number | null;
}

function fmt(value: number, unit: string) {
  if (unit === 'steps') return value.toLocaleString();
  if (unit === 'km') return value.toFixed(1);
  return String(value);
}

export default function LeaderboardMap({ entries, unit, userId, userLat, userLng, radiusKm }: Props) {
  const centre: [number, number] = userLat && userLng
    ? [userLat, userLng]
    : entries.length > 0 ? [entries[0].lat, entries[0].lng] : [51.5, -0.12];

  return (
    <div className="rounded-2xl overflow-hidden border border-ql" style={{ height: 360 }}>
      <MapContainer center={centre} zoom={10} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {userLat && userLng && <MapController lat={userLat} lng={userLng} />}

        {/* Single radius circle for the viewer's search area */}
        {userLat && userLng && radiusKm !== null && (
          <Circle
            center={[userLat, userLng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#6366f1', weight: 1.5, dashArray: '6 4', fillColor: '#6366f1', fillOpacity: 0.06 }}
          />
        )}

        {entries.map((entry, idx) => {
          const rank = idx + 1;
          const isMe = entry.userId === userId;
          return (
            <Marker
              key={entry.id}
              position={[entry.lat, entry.lng]}
              icon={rankIcon(rank, isMe, entry.locationFuzzed)}
            >
              <Popup>
                <div style={{ minWidth: 140 }}>
                  <p style={{ fontWeight: 700, margin: 0 }}>#{rank} {entry.displayName}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13 }}>{fmt(entry.value, unit)} {unit}</p>
                  {entry.locationFuzzed && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>📍 Approximate location</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
