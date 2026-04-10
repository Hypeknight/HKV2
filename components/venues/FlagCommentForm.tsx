'use client';

import { flagVenueComment } from '@/app/venues/actions';

export default function FlagCommentForm({
  commentId,
  venueSlug,
}: {
  commentId: string;
  venueSlug: string;
}) {
  return (
    <details className="rounded-xl border border-white/10 bg-black/20 p-3 text-white">
      <summary className="cursor-pointer text-sm text-white/70">Flag</summary>
      <form action={flagVenueComment} className="mt-3 space-y-3">
        <input type="hidden" name="comment_id" value={commentId} />
        <input type="hidden" name="venue_slug" value={venueSlug} />

        <select
          name="reason"
          defaultValue="spam"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none"
        >
          <option value="harassment">Harassment</option>
          <option value="hate_speech">Hate speech</option>
          <option value="spam">Spam</option>
          <option value="sexual_content">Sexual content</option>
          <option value="threats">Threats</option>
          <option value="other">Other</option>
        </select>

        <textarea
          name="notes"
          rows={2}
          placeholder="Optional note"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none placeholder:text-white/40"
        />

        <button
          type="submit"
          className="w-full rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          Submit Flag
        </button>
      </form>
    </details>
  );
}