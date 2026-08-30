'use client';

import { FormEvent } from 'react';
import { getAnonymousSessionId } from '@/lib/signals/browser';

function recordSearchSignal(form: HTMLFormElement) {
  const data = new FormData(form);
  const q = String(data.get('q') || '').trim();
  const city = String(data.get('city') || '').trim();
  const state = String(data.get('state') || '').trim();
  const when = String(data.get('when') || '').trim();

  const payload = JSON.stringify({
    signalType: 'search_performed',
    subjectType: 'search',
    subjectId: q || city || when || 'homepage-discovery',
    city: city || null,
    state: state || null,
    source: 'homepage',
    surface: 'discovery_command_bar',
    anonymousSessionId: getAnonymousSessionId(),
    verificationLevel: 'declared',
    metadata: {
      query: q || null,
      city: city || null,
      state: state || null,
      when: when || null,
    },
  });

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(
      '/api/signals',
      new Blob([payload], { type: 'application/json' })
    );
    if (sent) return;
  }

  void fetch('/api/signals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Discovery must never fail because telemetry did.
  });
}

export default function DiscoveryCommandBar({ compact = false }: { compact?: boolean }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    recordSearchSignal(event.currentTarget);
  }

  return (
    <form
      action="/events"
      onSubmit={handleSubmit}
      className={`grid gap-2 rounded-[1.6rem] border border-white/10 bg-black/45 p-2 shadow-2xl backdrop-blur-xl ${
        compact
          ? 'sm:grid-cols-[1fr_180px_auto]'
          : 'sm:grid-cols-2 lg:grid-cols-[1fr_190px_120px_150px_auto]'
      }`}
    >
      <label className="group relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">⌕</span>
        <input
          name="q"
          aria-label="Search events, music, venues, or vibes"
          placeholder="Events, music, venues, vibes..."
          className="h-12 border-0 bg-transparent pl-10 pr-3 text-sm text-white ring-0 placeholder:text-white/35 focus:border-0 focus:ring-0"
        />
      </label>

      <label className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">◎</span>
        <input
          name="city"
          aria-label="City"
          placeholder="City"
          className="h-12 border-0 bg-white/[0.04] pl-10 pr-3 text-sm text-white ring-0 placeholder:text-white/35 focus:border-0 focus:ring-0"
        />
      </label>

      {!compact ? (
        <input
          name="state"
          aria-label="State"
          placeholder="State"
          className="h-12 border-0 bg-white/[0.04] px-4 text-sm text-white ring-0 placeholder:text-white/35 focus:border-0 focus:ring-0"
        />
      ) : null}

      <select
        name="when"
        defaultValue="tonight"
        aria-label="When"
        className="h-12 border-0 bg-white/[0.04] px-4 text-sm text-white ring-0 focus:border-0 focus:ring-0"
      >
        <option value="">Any time</option>
        <option value="live">Live now</option>
        <option value="soon">Starting soon</option>
        <option value="tonight">Tonight</option>
        <option value="weekend">Weekend</option>
      </select>

      <button
        type="submit"
        className="h-12 rounded-[1rem] bg-accent px-5 text-sm font-black text-black hover:brightness-110"
      >
        Find my night
      </button>
    </form>
  );
}
