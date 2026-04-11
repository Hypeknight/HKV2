'use client';

import { joinVenuePresenceSession } from '@/app/dashboard/venues/presence/actions';

export default function PresenceJoinForm({
  venueId,
  venueSlug,
}: {
  venueId: string;
  venueSlug: string;
}) {
  return (
    <form action={joinVenuePresenceSession} className="space-y-3">
      <input type="hidden" name="venue_id" value={venueId} />
      <input type="hidden" name="venue_slug" value={venueSlug} />

      <input
        name="session_code"
        type="text"
        placeholder="Enter venue session code"
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
      />

      <button
        type="submit"
        className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
      >
        Join Venue Session
      </button>
    </form>
  );
}