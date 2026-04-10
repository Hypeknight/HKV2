'use client';

import {
  moderateVenueComment,
  pinVenueComment,
} from '@/app/dashboard/venues/interactions/actions';

export default function CommentModerationButtons({
  venueId,
  commentId,
  venueSlug,
  isPinned,
}: {
  venueId: string;
  commentId: string;
  venueSlug: string;
  isPinned: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {['live', 'hidden', 'rejected', 'removed'].map((status) => (
          <form key={status} action={moderateVenueComment}>
            <input type="hidden" name="venue_id" value={venueId} />
            <input type="hidden" name="comment_id" value={commentId} />
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="hidden_reason" value={status} />
            <button
              type="submit"
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white hover:border-accent/40"
            >
              {status}
            </button>
          </form>
        ))}
      </div>

      <form action={pinVenueComment}>
        <input type="hidden" name="venue_id" value={venueId} />
        <input type="hidden" name="comment_id" value={commentId} />
        <input type="hidden" name="is_pinned" value={isPinned ? 'no' : 'yes'} />
        <button
          type="submit"
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white hover:border-accent/40"
        >
          {isPinned ? 'Unpin comment' : 'Pin comment'}
        </button>
      </form>
    </div>
  );
}