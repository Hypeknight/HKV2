'use client';

import { useEffect, useRef } from 'react';

type ManagedVenue = { id: string; name: string; address: string | null; city: string; state: string };

export default function ManagedVenueSelect({ venues, selectedVenueId }: { venues: ManagedVenue[]; selectedVenueId?: string }) {
  const selectRef = useRef<HTMLSelectElement>(null);
  function fillLocation(venueId: string) {
    const venue = venues.find((item) => item.id === venueId);
    const form = selectRef.current?.form;
    if (!venue || !form) return;
    for (const [field, value] of Object.entries({ venue_name: venue.name, address: venue.address, city: venue.city, state: venue.state })) {
      const input = form.elements.namedItem(field);
      if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
        input.value = value ?? '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }
  useEffect(() => {
    if (selectedVenueId) fillLocation(selectedVenueId);
  }, [selectedVenueId, venues]);
  return (
    <select ref={selectRef} name="venue_id" defaultValue={venues.some((venue) => venue.id === selectedVenueId) ? selectedVenueId : ''} onChange={(event) => fillLocation(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-accent/50">
      <option value="">Use a different venue or location</option>
      {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name} ({venue.city}, {venue.state})</option>)}
    </select>
  );
}
