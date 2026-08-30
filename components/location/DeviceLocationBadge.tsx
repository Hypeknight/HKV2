'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LOCATION_STORAGE_KEY, type HypeKnightLocation } from '@/lib/location/types';

function readStoredLocation(): HypeKnightLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.city && parsed?.state ? parsed : null;
  } catch {
    return null;
  }
}

export default function DeviceLocationBadge() {
  const [location, setLocation] = useState<HypeKnightLocation | null>(null);
  const [status, setStatus] = useState<'idle' | 'locating' | 'denied'>('idle');

  useEffect(() => {
    const stored = readStoredLocation();
    if (stored) setLocation(stored);
  }, []);

  async function useMyLocation() {
    if (!navigator.geolocation) {
      setStatus('denied');
      return;
    }

    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `/api/location/reverse?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
          );
          const data = await response.json();
          if (!response.ok) throw new Error(data?.error || 'Location unavailable');

          const next: HypeKnightLocation = {
            city: data.city,
            state: data.state,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            source: 'device',
          };
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
          setLocation(next);
          setStatus('idle');
          window.dispatchEvent(new CustomEvent('hk-location-changed', { detail: next }));
        } catch {
          setStatus('denied');
        }
      },
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 15 * 60 * 1000 }
    );
  }

  if (location) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-semibold text-white/65">
        <span className="text-accent">◎</span>
        <Link href={`/events?city=${encodeURIComponent(location.city)}&state=${encodeURIComponent(location.state)}`} className="hover:text-white">
          {location.city}, {location.state}
        </Link>
        <button type="button" onClick={useMyLocation} className="text-white/35 hover:text-accent" aria-label="Refresh location">↻</button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={useMyLocation}
      disabled={status === 'locating'}
      className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-semibold text-white/65 transition hover:border-accent/30 hover:text-white disabled:opacity-60"
    >
      ◎ {status === 'locating' ? 'Finding your area…' : status === 'denied' ? 'Choose your location' : 'Use my location'}
    </button>
  );
}
