import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CommentModerationButtons from '@/components/venues/CommentModerationButtons';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VenueModerationQueuePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.app_role === 'admin';

  const venueQuery = supabase.from('venues').select('*').eq('id', id);
  const { data: venue, error: venueError } = isAdmin
    ? await venueQuery.single()
    : await venueQuery.eq('owner_id', user.id).single();

  if (venueError || !venue) notFound();

  const { data: comments } = await supabase
    .from('venue_comments')
    .select('*')
    .eq('venue_id', id)
    .order('flag_count', { ascending: false })
    .order('created_at', { ascending: false });

  const flagged = (comments || []).filter((c) => (c.flag_count || 0) > 0);
  const review = (comments || []).filter((c) => c.status === 'pending_review');
  const hidden = (comments || []).filter((c) => c.status === 'hidden');

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">Moderation</p>
          <h1 className="mt-3 text-4xl font-bold text-white">{venue.name}</h1>
          <p className="mt-3 max-w-2xl text-white/70">
            Review live comments, flags, and items needing moderation.
          </p>
        </div>

        <Link
          href={`/dashboard/venues/${venue.id}/edit`}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to Venue Manager
        </Link>
      </div>

      <div className="space-y-10">
        <ModerationSection
          title="Pending Review"
          subtitle="Comments caught by auto-filter or review workflow."
          comments={review}
          venueId={venue.id}
          venueSlug={venue.slug}
        />

        <ModerationSection
          title="Flagged Comments"
          subtitle="Live comments flagged by users."
          comments={flagged}
          venueId={venue.id}
          venueSlug={venue.slug}
        />

        <ModerationSection
          title="Hidden Comments"
          subtitle="Comments that are currently hidden."
          comments={hidden}
          venueId={venue.id}
          venueSlug={venue.slug}
        />
      </div>
    </section>
  );
}

function ModerationSection({
  title,
  subtitle,
  comments,
  venueId,
  venueSlug,
}: {
  title: string;
  subtitle: string;
  comments: any[];
  venueId: string;
  venueSlug: string;
}) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-white/65">{subtitle}</p>
      </div>

      {comments.length ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
            >
              <p className="text-white">{comment.comment_text}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Status" value={comment.status} />
                <Info label="Flags" value={String(comment.flag_count || 0)} />
                <Info label="Filter" value={comment.filter_result} />
                <Info
                  label="Created"
                  value={new Date(comment.created_at).toLocaleString()}
                />
                <Info label="Hidden Reason" value={comment.hidden_reason} />
              </div>

              <div className="mt-4">
                <CommentModerationButtons
                  venueId={venueId}
                  commentId={comment.id}
                  venueSlug={venueSlug}
                  isPinned={!!comment.is_pinned}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
          No comments in this section.
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">{label}</p>
      <p className="mt-2 text-sm text-white">{value || '—'}</p>
    </div>
  );
}