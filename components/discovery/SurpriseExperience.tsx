'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAnonymousSessionId } from '@/lib/signals/browser';
import { LOCATION_STORAGE_KEY, type HypeKnightLocation } from '@/lib/location/types';

type SurpriseEvent = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  description: string | null;
  event_start_at: string | null;
  image_url: string | null;
  venue_name: string | null;
  href: string;
  source: 'hypeknight' | 'external';
};

export default function SurpriseExperience() {
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [event, setEvent] = useState<SurpriseEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (!raw) return;
      const stored: HypeKnightLocation = JSON.parse(raw);
      setCity(stored.city || '');
      setState(stored.state || '');
    } catch {}
  }, []);

  async function useDeviceLocation() {
    if (!navigator.geolocation) return setMessage('Location services are not available in this browser.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const response = await fetch(`/api/location/reverse?lat=${position.coords.latitude}&lng=${position.coords.longitude}`);
        const data = await response.json();
        if (!response.ok) throw new Error();
        setCity(data.city);
        setState(data.state);
        const next: HypeKnightLocation = { city: data.city, state: data.state, latitude: position.coords.latitude, longitude: position.coords.longitude, source: 'device' };
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
        setMessage('');
      } catch {
        setMessage('We could not translate your device location. Enter your city instead.');
      } finally {
        setLocating(false);
      }
    }, () => {
      setLocating(false);
      setMessage('Location permission was not granted. Enter your city instead.');
    }, { timeout: 8000, maximumAge: 15 * 60 * 1000 });
  }

  async function surprise(exclude?: string) {
    if (!city.trim() || !state.trim()) {
      setMessage('Tell us where you are first.');
      return;
    }
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams({ city: city.trim(), state: state.trim() });
    if (exclude) params.set('exclude', exclude);
    try {
      const response = await fetch(`/api/discovery/surprise?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Unable to find a surprise.');
      setEvent(data.event || null);
      if (!data.event) setMessage(`Nothing upcoming is available around ${city}, ${state} yet. Try another nearby city.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to find a surprise.');
    } finally {
      setLoading(false);
    }
  }

  async function feedback(kind: 'interested' | 'uninterested') {
    if (!event) return;
    void fetch('/api/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signalType: 'recommendation_selected',
        subjectType: 'event',
        subjectId: event.id,
        eventId: event.source === 'hypeknight' ? event.id : null,
        city,
        state,
        source: 'surprise',
        surface: 'surprise_feedback',
        anonymousSessionId: getAnonymousSessionId(),
        verificationLevel: 'declared',
        value: kind === 'interested' ? 1 : -1,
        metadata: { feedback: kind, event_source: event.source },
      }),
    }).catch(() => {});

    if (kind === 'uninterested') {
      await surprise(`${event.source}:${event.id}`);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#111520] via-[#090b10] to-black p-5 sm:rounded-[3rem] sm:p-10">
        <p className="hk-kicker">Surprise Me</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">Where are you?</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">That is the only thing HypeKnight needs before making the pick. We will not send you across the country for a night out.</p>

        <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_110px_auto]">
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="h-12 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-white outline-none focus:border-accent/40" />
          <input value={state} onChange={(e) => setState(e.target.value.toUpperCase())} maxLength={2} placeholder="State" className="h-12 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-white outline-none focus:border-accent/40" />
          <button type="button" onClick={() => surprise()} disabled={loading} className="rounded-2xl bg-accent px-6 py-3 font-black text-black disabled:opacity-60">{loading ? 'Choosing…' : 'Surprise me'}</button>
        </div>

        <button type="button" onClick={useDeviceLocation} disabled={locating} className="mt-3 text-sm font-semibold text-white/50 hover:text-accent">◎ {locating ? 'Finding you…' : 'Use my device location'}</button>
        {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/60">{message}</p> : null}
      </section>

      {event ? (
        <section className="mt-6 grid overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] md:grid-cols-[minmax(0,0.8fr)_1.2fr]">
          <div className="min-h-[260px] bg-black/30">
            {event.image_url ? <img src={event.image_url} alt={event.name} className="h-full w-full object-cover" /> : <div className="flex h-full min-h-[260px] items-center justify-center text-6xl">✦</div>}
          </div>
          <div className="p-6 sm:p-8">
            <p className="hk-kicker">Your pick · {city}, {state}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">{event.name}</h2>
            <p className="mt-3 text-sm text-white/55">{[event.venue_name, event.city && event.state ? `${event.city}, ${event.state}` : event.city].filter(Boolean).join(' · ')}</p>
            {event.event_start_at ? <p className="mt-2 text-sm font-semibold text-accent">{new Date(event.event_start_at).toLocaleString()}</p> : null}
            {event.description ? <p className="mt-5 line-clamp-4 text-sm leading-6 text-white/60">{event.description}</p> : null}

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => feedback('interested')} className="rounded-2xl bg-white px-5 py-3 font-black text-black">♥ I like this</button>
              <button type="button" onClick={() => feedback('uninterested')} disabled={loading} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white">Not for me</button>
            </div>
            <Link href={event.href} onClick={() => feedback('interested')} className="mt-3 block rounded-2xl bg-accent px-5 py-3 text-center font-black text-black">Open this night →</Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
