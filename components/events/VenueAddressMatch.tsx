'use client';

import { useState } from 'react';

type VenueCandidate = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  slug?: string | null;
  status?: string | null;
  claimState?: string | null;
  verificationState?: string | null;
  canManage: boolean;
};

type LocationCandidate = {
  id: string;
  address: string;
  city: string;
  state: string;
};

export default function VenueAddressMatch() {
  const [location, setLocation] = useState<LocationCandidate | null>(null);
  const [venues, setVenues] = useState<VenueCandidate[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function check() {
    const form =
      document.querySelector<HTMLFormElement>(
        'form[data-event-start-form="true"]',
      );

    if (!form) return;

    const data = new FormData(form);
    const address = String(data.get('address') || '').trim();
    const city = String(data.get('city') || '').trim();
    const state = String(data.get('state') || '').trim();

    if (!address || !city || !state) {
      setMessage('Enter the street address, city, and state first.');
      setLocation(null);
      setVenues([]);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const params = new URLSearchParams({ address, city, state });
      const res = await fetch(
        `/api/venue-identity/matches?${params.toString()}`,
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Unable to check venue.');
      }

      setLocation(json.location ?? null);
      setVenues(Array.isArray(json.venues) ? json.venues : []);

      if (!json.location) {
        setMessage(
          'No existing HypeKnight location matches this address yet.',
        );
      } else if (!json.venues?.length) {
        setMessage(
          'HypeKnight recognizes this location, but no venue identity is currently connected to it.',
        );
      }
    } catch (error) {
      setLocation(null);
      setVenues([]);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to check venue.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-white">Venue connection</p>
          <p className="mt-1 text-sm text-white/50">
            HypeKnight checks the physical location first. A location may
            contain more than one venue identity, so an address alone never
            determines which venue your event belongs to.
          </p>
        </div>

        <button
          type="button"
          onClick={check}
          disabled={loading}
          className="rounded-xl border border-accent/50 bg-black/20 px-4 py-2 text-sm font-bold text-white hover:border-accent/50 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check venue'}
        </button>
      </div>

      {location ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            HypeKnight location
          </p>
          <p className="mt-2 text-sm text-white/70">
            {location.address}, {location.city}, {location.state}
          </p>

          {venues.length === 1 ? (
            <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-100">
              <strong>{venues[0].name}</strong>
              <br />
              <span className="text-green-100/70">
                One venue identity is associated with this location.
                {venues[0].canManage
                  ? ' You have management authority for this venue.'
                  : ' A venue connection request may be required.'}
              </span>
            </div>
          ) : venues.length > 1 ? (
            <div className="mt-4">
              <p className="text-sm font-bold text-white">
                Multiple venue identities are associated with this location.
              </p>
              <p className="mt-1 text-sm text-white/50">
                HypeKnight will not choose a venue solely from the address.
              </p>

              <div className="mt-3 space-y-2">
                {venues.map((venue) => (
                  <div
                    key={venue.id}
                    className="rounded-xl border border-white/10 bg-black/20 p-3"
                  >
                    <p className="font-bold text-white">{venue.name}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {venue.status || 'Status unavailable'}
                      {venue.claimState
                        ? ` · ${venue.claimState}`
                        : ''}
                      {venue.canManage
                        ? ' · You can manage this venue'
                        : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <p className="mt-3 text-sm text-white/55">{message}</p>
      ) : null}
    </div>
  );
}
