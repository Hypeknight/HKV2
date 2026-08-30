'use client';

import { useState } from 'react';
import Link from 'next/link';

type Match = {
  id: string;
  source: 'hypeknight' | 'external';
  name: string | null;
  venueName?: string | null;
  city?: string | null;
  state?: string | null;
  startAt?: string | null;
  provider?: string | null;
  url?: string | null;
  score: number;
  confidence: 'strong' | 'possible' | 'weak';
  reasons: string[];
};

function field(name: string) {
  const element = document.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
  return element?.value?.trim() || '';
}

export default function PotentialEventMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'clear' | 'matches' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function check() {
    const name = field('name');
    const venue = field('venue_name');
    const city = field('city');
    const state = field('state');
    const date = field('start_date');
    const time = field('start_time');

    if (!name || !city || !state || !date || !time) {
      setStatus('error');
      setMessage('Add the event name, city, state, date, and start time first.');
      return;
    }

    setStatus('loading');
    setMessage('');
    try {
      const query = new URLSearchParams({ name, venue_name: venue, city, state, start_at: `${date}T${time}` });
      const response = await fetch(`/api/event-identity/matches?${query.toString()}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Unable to check existing events.');
      const found = Array.isArray(payload.matches) ? payload.matches : [];
      setMatches(found);
      setStatus(found.length ? 'matches' : 'clear');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to check existing events.');
    }
  }

  return (
    <section className="rounded-[2rem] border border-accent/15 bg-accent/[0.045] p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="hk-kicker">Identity Check</p>
          <h2 className="mt-2 text-2xl font-black text-white">Make sure this night does not already exist.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">HypeKnight compares the name, venue, location, and time against native and imported inventory. A match is a warning, not a blocker.</p>
        </div>
        <button type="button" onClick={check} disabled={status === 'loading'} className="shrink-0 rounded-2xl border border-accent/30 bg-accent/10 px-5 py-3 font-black text-accent disabled:opacity-50">
          {status === 'loading' ? 'Checking…' : 'Check existing events'}
        </button>
      </div>

      {status === 'clear' ? <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">No likely duplicate found. Continue building your event.</div> : null}
      {status === 'error' ? <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">{message}</div> : null}
      {status === 'matches' ? (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-bold text-white">Possible existing event{matches.length === 1 ? '' : 's'} found</p>
          {matches.map((match) => (
            <div key={`${match.source}:${match.id}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-white">{match.name}</p>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase text-white/45">{match.provider || match.source}</span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-white/70">{match.score}% match</span>
                  </div>
                  <p className="mt-1 text-sm text-white/45">{[match.venueName, match.city, match.state].filter(Boolean).join(' • ')}</p>
                  <p className="mt-2 text-xs text-white/40">{match.reasons.join(' · ')}</p>
                </div>
                {match.url ? <Link href={match.url} target="_blank" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-white/65 hover:border-accent/30 hover:text-accent">Review event ↗</Link> : null}
              </div>
            </div>
          ))}
          <p className="text-xs leading-5 text-white/40">If one of these is yours, use its claim/connect workflow instead of creating a duplicate. If none is the same real-world event, continue normally.</p>
        </div>
      ) : null}
    </section>
  );
}
