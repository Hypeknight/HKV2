import Link from 'next/link';
import { addEventComment } from '@/app/events/actions';

export default function EventComments({
  event,
  comments,
  isSignedIn,
  eventPath,
}: {
  event: any;
  comments: any[];
  isSignedIn: boolean;
  eventPath: string;
}) {
  const canComment = ['scheduled', 'active'].includes(event.status);

  return (
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">Event Comments</h2>

      <p className="mt-3 text-white/65">
        Comments are open for upcoming and ongoing events.
      </p>

      {canComment ? (
        isSignedIn ? (
          <form action={addEventComment} className="mt-6 space-y-3">
            <input type="hidden" name="event_id" value={event.id} />
            <input type="hidden" name="event_path" value={eventPath} />

            <textarea
              name="body"
              rows={4}
              maxLength={500}
              required
              placeholder="Ask a question, hype the event, or share what you're looking forward to..."
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />

            <button
              type="submit"
              className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              Post Comment
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-white/65">
            <Link href="/auth/login" className="text-accent hover:opacity-80">
              Sign in
            </Link>{' '}
            to comment on this event.
          </div>
        )
      ) : (
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">
          Comments are closed for this event status.
        </div>
      )}

      <div className="mt-8 space-y-4">
        {comments.length ? (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-2xl border border-white/10 bg-black/20 p-5"
            >
              <p className="text-white/80">{comment.body}</p>
              <p className="mt-3 text-xs text-white/40">
                @{comment.profiles?.display_name || 'HypeKnightUser'} •{' '}
                {new Date(comment.created_at).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <p className="text-white/50">No comments yet.</p>
        )}
      </div>
    </section>
  );
}