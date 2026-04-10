'use client';

import { voteVenueMusicRequest } from '@/app/venues/actions';

export default function MusicVoteButtons({
  requestId,
  venueSlug,
  upvotes,
  downvotes,
}: {
  requestId: string;
  venueSlug: string;
  upvotes: number;
  downvotes: number;
}) {
  return (
    <div className="flex gap-2">
      <form action={voteVenueMusicRequest}>
        <input type="hidden" name="request_id" value={requestId} />
        <input type="hidden" name="venue_slug" value={venueSlug} />
        <input type="hidden" name="vote_type" value="up" />
        <button
          type="submit"
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white hover:border-accent/40"
        >
          ▲ {upvotes}
        </button>
      </form>

      <form action={voteVenueMusicRequest}>
        <input type="hidden" name="request_id" value={requestId} />
        <input type="hidden" name="venue_slug" value={venueSlug} />
        <input type="hidden" name="vote_type" value="down" />
        <button
          type="submit"
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white hover:border-red-500/40"
        >
          ▼ {downvotes}
        </button>
      </form>
    </div>
  );
}