'use client';

import { useState } from 'react';

type VenueMatch = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  slug?: string | null;
  ownedByCurrentUser: boolean;
};

export default function VenueAddressMatch() {
  const [match, setMatch] = useState<VenueMatch | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function check() {
    const form = document.querySelector<HTMLFormElement>('form[data-event-start-form="true"]');
    if (!form) return;
    const data = new FormData(form);
    const address = String(data.get('address') || '').trim();
    const city = String(data.get('city') || '').trim();
    const state = String(data.get('state') || '').trim();
    if (!address || !city || !state) {
      setMessage('Enter the street address, city, and state first.');
      setMatch(null);
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const params = new URLSearchParams({ address, city, state });
      const res = await fetch(`/api/venue-identity/matches?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to check venue.');
      setMatch(json.match || null);
      setMessage(json.match ? '' : 'No HypeKnight venue account matches this address yet.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to check venue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-white">Venue connection</p>
          <p className="mt-1 text-sm text-white/50">HypeKnight matches venue accounts by physical address. Another venue owner must approve the connection.</p>
        </div>
        <button type="button" onClick={check} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white hover:border-accent/50 disabled:opacity-50">
          {loading ? 'Checking…' : 'Check venue'}
        </button>
      </div>
      {match ? (
        <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-100">
          <strong>{match.name}</strong><br />{match.address}, {match.city}, {match.state}<br />
          <span className="text-green-100/70">{match.ownedByCurrentUser ? 'Your venue can be connected automatically.' : 'A connection request will be sent to the venue owner.'}</span>
        </div>
      ) : message ? <p className="mt-3 text-sm text-white/55">{message}</p> : null}
    </div>
  );
}
