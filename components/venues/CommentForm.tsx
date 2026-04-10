'use client';

import { submitVenueComment } from '@/app/venues/actions';

export default function CommentForm({
  venueId,
  venueSlug,
}: {
  venueId: string;
  venueSlug: string;
}) {
  return (
    <form action={submitVenueComment} className="space-y-3">
      <input type="hidden" name="venue_id" value={venueId} />
      <input type="hidden" name="venue_slug" value={venueSlug} />

      <textarea
        name="comment_text"
        rows={4}
        maxLength={500}
        placeholder="Share what the vibe is like right now..."
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
      />

      <button
        type="submit"
        className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
      >
        Post Comment
      </button>
    </form>
  );
}