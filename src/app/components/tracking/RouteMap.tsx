'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface Props {
  coords: { lat: number; lng: number }[];
  live?: boolean;   // if true, re-fit bounds when coords change
  height?: number;
}

export default function RouteMap({ coords, live = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const polyRef      = useRef<L.Polyline | null>(null);
  const startRef     = useRef<L.CircleMarker | null>(null);
  const endRef       = useRef<L.CircleMarker | null>(null);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: !live,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: !live,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update route whenever coords change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || coords.length < 2) return;

    const latlngs = coords.map(c => [c.lat, c.lng] as L.LatLngTuple);

    // Remove old layers
    polyRef.current?.remove();
    startRef.current?.remove();
    endRef.current?.remove();

    polyRef.current = L.polyline(latlngs, { color: '#7c3aed', weight: 4, opacity: 0.9 }).addTo(map);
    startRef.current = L.circleMarker(latlngs[0], { radius: 6, color: '#fff', fillColor: '#34c759', fillOpacity: 1, weight: 2 }).addTo(map);
    endRef.current   = L.circleMarker(latlngs[latlngs.length - 1], { radius: 6, color: '#fff', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }).addTo(map);

    const bounds = polyRef.current.getBounds();
    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 17 });
  }, [coords]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
