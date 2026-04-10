'use client';

import { submitVenueMusicRequest } from '@/app/venues/actions';

export default function MusicRequestForm({
  venueId,
  venueSlug,
}: {
  venueId: string;
  venueSlug: string;
}) {
  return (
    <form action={submitVenueMusicRequest} className="space-y-3">
      <input type="hidden" name="venue_id" value={venueId} />
      <input type="hidden" name="venue_slug" value={venueSlug} />

      <input
        name="artist_name"
        type="text"
        placeholder="Artist name"
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
      />

      <input
        name="song_title"
        type="text"
        required
        placeholder="Song title"
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
      />

      <textarea
        name="request_note"
        rows={3}
        maxLength={250}
        placeholder="Optional note"
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
      />

      <button
        type="submit"
        className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
      >
        Submit Music Request
      </button>
    </form>
  );
}