import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ownerUpdateVenueMusicRequestStatus } from '@/app/venues/actions';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VenueMusicRequestsQueuePage({ params }: Props) {
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

  const { data: requests, error: requestsError } = await supabase
    .from('venue_music_requests')
    .select('*')
    .eq('venue_id', id)
    .order('status', { ascending: true })
    .order('vote_score', { ascending: false })
    .order('created_at', { ascending: false });

  if (requestsError) throw new Error(requestsError.message);

  const pending = (requests || []).filter((r) => r.status === 'pending');
  const accepted = (requests || []).filter((r) => r.status === 'accepted');
  const played = (requests || []).filter((r) => r.status === 'played');
  const rejected = (requests || []).filter((r) => r.status === 'rejected');

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Music Queue
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">{venue.name}</h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Manage venue music requests, vote momentum, and request status.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/venues/${venue.slug}`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
          >
            View Venue Page
          </Link>
          <Link
            href={`/dashboard/venues/${venue.id}/interactions`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
          >
            Interaction Settings
          </Link>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <QueueSection
          title="Pending Requests"
          subtitle="Crowd-submitted requests waiting for action."
          requests={pending}
          venueSlug={venue.slug}
        />

        <QueueSection
          title="Accepted Requests"
          subtitle="Requests approved for play."
          requests={accepted}
          venueSlug={venue.slug}
        />

        <QueueSection
          title="Played Requests"
          subtitle="Requests already played."
          requests={played}
          venueSlug={venue.slug}
        />

        <QueueSection
          title="Rejected Requests"
          subtitle="Requests that were declined."
          requests={rejected}
          venueSlug={venue.slug}
        />
      </div>
    </section>
  );
}

function QueueSection({
  title,
  subtitle,
  requests,
  venueSlug,
}: {
  title: string;
  subtitle: string;
  requests: any[];
  venueSlug: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-white/65">{subtitle}</p>

      <div className="mt-6 space-y-4">
        {requests.length ? (
          requests.map((request) => (
            <div
              key={request.id}
              className="rounded-2xl border border-white/10 bg-black/20 p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-white">
                    {request.song_title}
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    {request.artist_name || 'Unknown artist'}
                  </p>

                  {request.request_note ? (
                    <p className="mt-3 text-sm text-white/75">{request.request_note}</p>
                  ) : null}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Info label="Status" value={request.status} />
                    <Info label="Score" value={String(request.vote_score || 0)} />
                    <Info label="Upvotes" value={String(request.upvote_count || 0)} />
                    <Info label="Downvotes" value={String(request.downvote_count || 0)} />
                    <Info label="Flags" value={String(request.flag_count || 0)} />
                    <Info
                      label="Submitted"
                      value={new Date(request.created_at).toLocaleString()}
                    />
                    <Info
                      label="Played At"
                      value={
                        request.played_at
                          ? new Date(request.played_at).toLocaleString()
                          : '—'
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:max-w-[280px] lg:justify-end">
                  {['pending', 'accepted', 'played', 'rejected', 'removed'].map((status) => (
                    <form key={status} action={ownerUpdateVenueMusicRequestStatus}>
                      <input type="hidden" name="request_id" value={request.id} />
                      <input type="hidden" name="venue_slug" value={venueSlug} />
                      <input type="hidden" name="status" value={status} />
                      <button
                        type="submit"
                        className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white hover:border-accent/40"
                      >
                        {status}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70">
            No requests in this section.
          </div>
        )}
      </div>
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
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">{label}</p>
      <p className="mt-2 text-sm text-white">{value || '—'}</p>
    </div>
  );
}