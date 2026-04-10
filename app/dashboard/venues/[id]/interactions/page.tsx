import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateVenueInteractionSettings } from '@/app/dashboard/venues/interactions/actions';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VenueInteractionsPage({ params }: Props) {
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

  const { data: settings } = await supabase
    .from('venue_interaction_settings')
    .select('*')
    .eq('venue_id', id)
    .maybeSingle();

  const { data: comments } = await supabase
    .from('venue_comments')
    .select('*')
    .eq('venue_id', id)
    .order('created_at', { ascending: false })
    .limit(25);

  const { data: requests } = await supabase
    .from('venue_music_requests')
    .select('*')
    .eq('venue_id', id)
    .order('created_at', { ascending: false })
    .limit(25);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Venue Interactions
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">{venue.name}</h1>
          <p className="mt-3 max-w-2xl text-white/70">
            Control live comments, music requests, moderation behavior, and retention rules.
          </p>
        </div>

        <Link
          href={`/dashboard/venues/${venue.id}/edit`}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to Venue Manager
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Interaction Settings</h2>

          <form action={updateVenueInteractionSettings} className="mt-6 space-y-6">
            <input type="hidden" name="venue_id" value={venue.id} />

            <div className="grid gap-4 md:grid-cols-2">
              <Toggle
                name="comments_enabled"
                label="Enable live comments"
                defaultChecked={settings?.comments_enabled || false}
              />
              <Toggle
                name="music_requests_enabled"
                label="Enable music requests"
                defaultChecked={settings?.music_requests_enabled || false}
              />
              <Toggle
                name="comments_require_presence"
                label="Comments require presence"
                defaultChecked={settings?.comments_require_presence || false}
              />
              <Toggle
                name="music_requests_require_presence"
                label="Music requests require presence"
                defaultChecked={settings?.music_requests_require_presence || false}
              />
              <Toggle
                name="comments_auto_filter_enabled"
                label="Auto-filter comments"
                defaultChecked={
                  settings?.comments_auto_filter_enabled === false ? false : true
                }
              />
            </div>

            <div>
              <label
                htmlFor="comment_retention_hours"
                className="mb-2 block text-sm font-medium text-white"
              >
                Comment retention window
              </label>
              <select
                id="comment_retention_hours"
                name="comment_retention_hours"
                defaultValue={String(settings?.comment_retention_hours || 24)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              >
                <option value="1">1 hour</option>
                <option value="4">4 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="72">72 hours</option>
              </select>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/75">
              <p className="font-semibold text-white">Moderation notes</p>
              <ul className="mt-3 space-y-2">
                <li>Live comments can be filtered, flagged, hidden, or removed.</li>
                <li>Comment retention controls how long public comments stay visible.</li>
                <li>Music requests stay in a queue and can be accepted, played, rejected, or removed.</li>
                <li>Presence requirement is ready for future QR / Linkd'N enforcement.</li>
              </ul>
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Save Interaction Settings
            </button>
          </form>
        </div>

        <div className="space-y-8">
          <Panel title="Recent Comments">
            {comments?.length ? (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <p className="text-white">{comment.comment_text}</p>
                    <p className="mt-2 text-xs text-white/50">
                      {comment.status} · flags: {comment.flag_count || 0}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/70">No comments yet.</p>
            )}
          </Panel>

          <Panel title="Recent Music Requests">
            {requests?.length ? (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <p className="font-semibold text-white">{request.song_title}</p>
                    <p className="mt-1 text-sm text-white/70">
                      {request.artist_name || 'Unknown artist'}
                    </p>
                    <p className="mt-2 text-xs text-white/50">
                      {request.status} · score: {request.vote_score || 0} · flags: {request.flag_count || 0}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/70">No music requests yet.</p>
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
      <input
        type="checkbox"
        name={name}
        value="yes"
        defaultChecked={defaultChecked}
        className="h-4 w-4"
      />
      <span>{label}</span>
    </label>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="mt-6">{children}</div>
    </div>
  );
}