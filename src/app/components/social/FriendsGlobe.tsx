'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PublicProfile } from '@/lib/friends';

// Fix Leaflet default icon broken by webpack
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function friendIcon(initial: string) {
  return L.divIcon({
    html: `<div style="width:34px;height:34px;border-radius:50%;background:#7c3aed;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;box-shadow:0 3px 10px rgba(0,0,0,0.5);cursor:pointer">${initial}</div>`,
    className: '',
    iconSize:   [34, 34],
    iconAnchor: [17, 17],
    popupAnchor:[0, -22],
  });
}

function meIcon(initial: string) {
  return L.divIcon({
    html: `<div style="width:34px;height:34px;border-radius:50%;background:#4a9eff;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;box-shadow:0 3px 10px rgba(0,0,0,0.5);cursor:pointer">${initial}</div>`,
    className: '',
    iconSize:   [34, 34],
    iconAnchor: [17, 17],
    popupAnchor:[0, -22],
  });
}

// Flies to the user's location (once) when it first becomes available
function MapController({ location }: { location: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], 12, { animate: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng]);
  return null;
}

interface Props {
  friends: PublicProfile[];
  myLocation: { lat: number; lng: number } | null;
  myName: string;
}

export default function FriendsGlobe({ friends, myLocation, myName }: Props) {
  const withLoc = friends.filter(f => f.lat != null && f.lng != null);
  const myMarkerIcon = meIcon(myName?.[0]?.toUpperCase() ?? 'M');

  return (
    <MapContainer
      center={[20, 0]}
      zoom={12}
      minZoom={2}
      maxBounds={[[-90, -180], [90, 180]]}
      maxBoundsViscosity={1.0}
      style={{ width: '100%', height: '100%', borderRadius: '16px', background: '#e8e8e8' }}
      attributionControl={false}
    >
      <MapController location={myLocation} />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />

      {withLoc.map(f => (
        <Marker
          key={f.uid}
          position={[f.lat!, f.lng!]}
          icon={friendIcon((f.display_name || f.username)?.[0]?.toUpperCase() ?? '?')}
        >
          <Popup>
            <div style={{ minWidth: 120, textAlign: 'center', padding: '2px 4px' }}>
              <p style={{ fontWeight: 700, margin: '0 0 2px', fontSize: 13 }}>
                {f.display_name || f.username}
              </p>
              <p style={{ color: '#888', fontSize: 11, margin: 0 }}>
                @{f.username}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {myLocation && (
        <Marker position={[myLocation.lat, myLocation.lng]} icon={myMarkerIcon}>
          <Popup>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{myName || 'You'} are here</p>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
