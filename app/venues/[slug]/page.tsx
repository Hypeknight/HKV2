/*
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CommentForm from '@/components/venues/CommentForm';
import MusicRequestForm from '@/components/venues/MusicRequestForm';
import MusicVoteButtons from '@/components/venues/MusicVoteButtons';
import FlagCommentForm from '@/components/venues/FlagCommentForm';
import FlagMusicRequestForm from '@/components/venues/FlagMusicRequestForm';
import { ownerUpdateVenueMusicRequestStatus } from '@/app/venues/actions';
import CommentModerationButtons from '@/components/venues/CommentModerationButtons';
import PresenceJoinForm from '@/components/venues/PresenceJoinForm';
import { requestVenueRemoval } from '@/app/dashboard/venues/removal/actions';

type Props = {
  params: Promise<{ slug: string }>;
};

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default async function VenueDetailPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerRole: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .maybeSingle();

    viewerRole = profile?.app_role || 'user';
  }

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (venueError || !venue) notFound();

  const isOwner = !!user && venue.owner_id === user.id;
  const isAdmin = viewerRole === 'admin';
  const canView = (venue.status === 'active' && venue.is_visible) || isOwner || isAdmin;

  if (!canView) notFound();

  const { data: activePresenceCheckin } = user
    ? await supabase
        .from('venue_presence_checkins')
        .select(
          `
            *,
            session:venue_presence_sessions(
              id,
              session_code,
              status,
              starts_at,
              ends_at
            )
          `
        )
        .eq('venue_id', venue.id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('checked_in_at', { ascending: false })
        .maybeSingle()
    : { data: null };

  const { data: featureProfile } = await supabase
    .from('venue_feature_profiles')
    .select('*')
    .eq('venue_id', venue.id)
    .maybeSingle();

  const { data: interactionSettings } = await supabase
    .from('venue_interaction_settings')
    .select('*')
    .eq('venue_id', venue.id)
    .maybeSingle();

  const { data: hours } = await supabase
    .from('venue_hours')
    .select('*')
    .eq('venue_id', venue.id)
    .order('day_of_week', { ascending: true });

  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, name, slug, event_start_at, is_public')
    .eq('venue_id', venue.id)
    .eq('is_public', true)
    .gte('event_start_at', new Date().toISOString())
    .order('event_start_at', { ascending: true })
    .limit(8);

  const { data: pastEvents } = await supabase
    .from('events')
    .select('id, name, slug, event_start_at')
    .eq('venue_id', venue.id)
    .lt('event_start_at', new Date().toISOString())
    .order('event_start_at', { ascending: false })
    .limit(8);

  const commentsQuery = supabase
    .from('venue_comments')
    .select('*')
    .eq('venue_id', venue.id)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: comments, error: commentsError } =
    isOwner || isAdmin
      ? await commentsQuery
      : await supabase
          .from('venue_comments')
          .select('*')
          .eq('venue_id', venue.id)
          .eq('status', 'live')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(20);

  if (commentsError) throw new Error(commentsError.message);

  const { data: musicRequests, error: musicRequestsError } = await supabase
    .from('venue_music_requests')
    .select('*')
    .eq('venue_id', venue.id)
    .in('status', ['pending', 'accepted', 'played'])
    .order('vote_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20);

  if (musicRequestsError) throw new Error(musicRequestsError.message);

  const hypeScore = '0.0';
  const commentsEnabled = !!interactionSettings?.comments_enabled;
  const djRequestsEnabled = !!interactionSettings?.music_requests_enabled;
  const linkdnMode = featureProfile?.linkdn_mode || 'none';

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-accent">Venue</p>
                <h1 className="mt-3 text-4xl font-bold text-white">{venue.name}</h1>
                <p className="mt-3 text-white/70">
                  {venue.city}, {venue.state}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white">
                Hype Score: <span className="font-semibold">{hypeScore}</span>
              </div>
            </div>

            {venue.cover_image_url ? (
              <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10">
                <img
                  src={venue.cover_image_url}
                  alt={venue.name}
                  className="h-auto w-full object-cover"
                />
              </div>
            ) : null}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Info label="Address" value={venue.address} />
              <Info label="City / State" value={`${venue.city}, ${venue.state}`} />
              <Info label="Website" value={venue.website_url} />
              <Info label="Instagram" value={venue.instagram_url} />
            </div>

            <Block label="Description" value={venue.description} />

            {featureProfile?.special_message_enabled && venue.special_message ? (
              <Block label="Special Message" value={venue.special_message} />
            ) : null}

            {featureProfile?.general_info ? (
              <Block label="General Information" value={featureProfile.general_info} />
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Operating Hours</h2>

            {hours?.length ? (
              <div className="mt-6 space-y-3">
                {hours.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <p className="text-white">
                      <span className="font-semibold">{DAY_NAMES[row.day_of_week]}</span>{' '}
                      — {row.is_open ? `${row.open_time || '—'} to ${row.close_time || '—'}` : 'Closed'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-white/70">No operating hours available yet.</p>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Venue Profile</h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {featureProfile?.dress_code_enabled && (
                <Info label="Dress Code" value={featureProfile?.dress_code} />
              )}
              {featureProfile?.music_profile_enabled && (
                <Info
                  label="Music Profile"
                  value={
                    Array.isArray(featureProfile?.music_profile)
                      ? featureProfile.music_profile.join(', ')
                      : '—'
                  }
                />
              )}
              {featureProfile?.drink_menu_enabled && (
                <Info label="Drink Menu" value="Enabled" />
              )}
              {featureProfile?.rsvp_enabled && <Info label="RSVP" value="Enabled" />}
              {featureProfile?.table_service_enabled && (
                <Info label="Table Service" value="Enabled" />
              )}
              {commentsEnabled && <Info label="Live Comments" value="Enabled" />}
              {djRequestsEnabled && <Info label="DJ Requests" value="Enabled" />}
              {linkdnMode !== 'none' && <Info label="Linkd'N" value={linkdnMode} />}
            </div>

            {featureProfile?.drink_menu_enabled && featureProfile?.drink_menu_notes ? (
              <Block label="Drink Menu Notes" value={featureProfile.drink_menu_notes} />
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Upcoming Events</h2>

            {upcomingEvents?.length ? (
              <div className="mt-6 space-y-3">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.slug}`}
                    className="block rounded-2xl border border-white/10 bg-black/20 p-4 text-white hover:border-accent/40"
                  >
                    <p className="font-semibold">{event.name}</p>
                    <p className="mt-1 text-sm text-white/60">
                      {event.event_start_at
                        ? new Date(event.event_start_at).toLocaleString()
                        : '—'}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-white/70">No upcoming events listed yet.</p>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Past HypeKnight Events</h2>

            {pastEvents?.length ? (
              <div className="mt-6 space-y-3">
                {pastEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.slug}`}
                    className="block rounded-2xl border border-white/10 bg-black/20 p-4 text-white hover:border-accent/40"
                  >
                    <p className="font-semibold">{event.name}</p>
                    <p className="mt-1 text-sm text-white/60">
                      {event.event_start_at
                        ? new Date(event.event_start_at).toLocaleString()
                        : '—'}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-white/70">No venue event history yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Venue Summary</h2>

            <div className="mt-6 space-y-4">
              <SummaryRow label="Location" value={`${venue.city}, ${venue.state}`} />
              <SummaryRow label="Comments" value={commentsEnabled ? 'Live' : 'Unavailable'} />
              <SummaryRow label="DJ Requests" value={djRequestsEnabled ? 'Live' : 'Unavailable'} />
              <SummaryRow
                label="Linkd'N"
                value={linkdnMode === 'none' ? 'Not enabled' : linkdnMode}
              />
            </div>
          </div>

          {!!user && (
            <>
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
                <h2 className="text-2xl font-bold text-white">Venue Presence</h2>
                <p className="mt-3 text-white/70">
                  Join the live venue session to unlock presence-based interaction when required.
                </p>

                {activePresenceCheckin ? (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                      <p className="font-semibold text-green-300">You are checked in</p>
                      <p className="mt-2 text-sm text-white/75">
                        Session code:{' '}
                        <span className="font-semibold text-white">
                          {Array.isArray(activePresenceCheckin.session)
                            ? activePresenceCheckin.session[0]?.session_code
                            : activePresenceCheckin.session?.session_code || '—'}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-white/75">
                        Checked in at:{' '}
                        {activePresenceCheckin.checked_in_at
                          ? new Date(activePresenceCheckin.checked_in_at).toLocaleString()
                          : '—'}
                      </p>
                      <p className="mt-1 text-sm text-white/75">
                        Presence expires:{' '}
                        {activePresenceCheckin.expires_at
                          ? new Date(activePresenceCheckin.expires_at).toLocaleString()
                          : '—'}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                          Comments Presence Rule
                        </p>
                        <p className="mt-2 text-white">
                          {interactionSettings?.comments_require_presence ? 'Required' : 'Not required'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                          Music Request Presence Rule
                        </p>
                        <p className="mt-2 text-white">
                          {interactionSettings?.music_requests_require_presence ? 'Required' : 'Not required'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                      <p className="font-semibold text-yellow-300">You are not checked in</p>
                      <p className="mt-2 text-sm text-white/75">
                        Join the live venue session to activate presence-based access when required.
                      </p>
                    </div>

                    <PresenceJoinForm venueId={venue.id} venueSlug={venue.slug} />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                          Comments Presence Rule
                        </p>
                        <p className="mt-2 text-white">
                          {interactionSettings?.comments_require_presence ? 'Required' : 'Not required'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                          Music Request Presence Rule
                        </p>
                        <p className="mt-2 text-white">
                          {interactionSettings?.music_requests_require_presence ? 'Required' : 'Not required'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
                <h2 className="text-2xl font-bold text-white">Live Comments</h2>

                {commentsEnabled ? (
                  <>
                    {interactionSettings?.comments_require_presence && !activePresenceCheckin ? (
                      <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                        This venue requires active presence for posting comments.
                      </div>
                    ) : null}

                    <div className="mt-6">
                      <CommentForm venueId={venue.id} venueSlug={venue.slug} />
                    </div>

                    <div className="mt-6 space-y-4">
                      {comments?.length ? (
                        comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="rounded-2xl border border-white/10 bg-black/20 p-4"
                          >
                            <p className="text-white">{comment.comment_text}</p>
                            <p className="mt-2 text-xs text-white/50">
                              {new Date(comment.created_at).toLocaleString()}
                            </p>

                            <div className="mt-3">
                              <FlagCommentForm
                                commentId={comment.id}
                                venueSlug={venue.slug}
                              />
                            </div>

                            {(isOwner || isAdmin) && (
                              <div className="mt-3">
                                <CommentModerationButtons
                                  venueId={venue.id}
                                  commentId={comment.id}
                                  venueSlug={venue.slug}
                                  isPinned={!!comment.is_pinned}
                                />
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-white/70">No live comments yet.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <DisabledCard
                    title="Live Comments"
                    text="Comments are not enabled for this venue."
                  />
                )}
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
                <h2 className="text-2xl font-bold text-white">Music Requests</h2>

                {djRequestsEnabled ? (
                  <>
                    {interactionSettings?.music_requests_require_presence && !activePresenceCheckin ? (
                      <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                        This venue requires active presence for submitting music requests.
                      </div>
                    ) : null}

                    <div className="mt-6">
                      <MusicRequestForm venueId={venue.id} venueSlug={venue.slug} />
                    </div>

                    <div className="mt-6 space-y-4">
                      {musicRequests?.length ? (
                        musicRequests.map((request) => (
                          <div
                            key={request.id}
                            className="rounded-2xl border border-white/10 bg-black/20 p-4"
                          >
                            <p className="font-semibold text-white">{request.song_title}</p>
                            <p className="mt-1 text-sm text-white/70">
                              {request.artist_name || 'Unknown artist'}
                            </p>

                            {request.request_note ? (
                              <p className="mt-2 text-sm text-white/75">{request.request_note}</p>
                            ) : null}

                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <MusicVoteButtons
                                requestId={request.id}
                                venueSlug={venue.slug}
                                upvotes={request.upvote_count || 0}
                                downvotes={request.downvote_count || 0}
                              />
                              <FlagMusicRequestForm
                                requestId={request.id}
                                venueSlug={venue.slug}
                              />
                            </div>

                            {(isOwner || isAdmin) && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {['accepted', 'played', 'rejected', 'removed'].map((status) => (
                                  <form key={status} action={ownerUpdateVenueMusicRequestStatus}>
                                    <input type="hidden" name="request_id" value={request.id} />
                                    <input type="hidden" name="venue_slug" value={venue.slug} />
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
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-white/70">No music requests yet.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <DisabledCard
                    title="Music Requests"
                    text="Music requests are not enabled for this venue."
                  />
                )}
              </div>
            </>
          )}

          {isOwner && (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">Owner Controls</h2>

              <div className="mt-6 space-y-3">
                <Link
                  href={`/dashboard/venues/${venue.id}/edit`}
                  className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                >
                  Manage Venue
                </Link>

                <Link
                  href={`/dashboard/venues/${venue.id}/interactions`}
                  className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                >
                  Manage Interactions
                </Link>

                <Link
                  href={`/dashboard/venues/${venue.id}/music-requests`}
                  className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                >
                  Open Music Queue
                </Link>

                <Link
                  href={`/dashboard/venues/${venue.id}/presence`}
                  className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                >
                  Manage Presence / QR
                </Link>

                <Link
                  href={`/dashboard/venues/${venue.id}/moderation`}
                  className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                >
                  Open Moderation Queue
                </Link>

                <details className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
                  <summary className="cursor-pointer font-medium">Request Venue Removal</summary>
                  <form action={requestVenueRemoval} className="mt-4 space-y-3">
                    <input type="hidden" name="venue_id" value={venue.id} />

                    <textarea
                      name="removal_reason"
                      rows={4}
                      placeholder="Reason for removal"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
                    />

                    <select
                      name="refund_requested"
                      defaultValue="no"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                    >
                      <option value="no">No refund requested</option>
                      <option value="yes">Request refund</option>
                    </select>

                    <button
                      type="submit"
                      className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300 hover:border-red-500/40"
                    >
                      Submit Removal Request
                    </button>
                  </form>
                </details>

                <Link
                  href="/dashboard/venues"
                  className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                >
                  Back to My Venues
                </Link>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">Admin Controls</h2>

              <div className="mt-6 space-y-3">
                <Link
                  href={`/admin/venues/${venue.id}`}
                  className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                >
                  Open Admin Venue Review
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
    </div>
  );
}

function Block({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-white">{value || '—'}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-white/60">{label}</span>
      <span className="text-right text-white">{value || '—'}</span>
    </div>
  );
}

function DisabledCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm">{text}</p>
    </div>
  );
}
  */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PublicVenuePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerRole: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .maybeSingle();

    viewerRole = profile?.app_role || 'user';
  }

  const { data: venue, error } = await supabase
    .from('venues')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !venue) notFound();

  const isOwner = !!user && venue.owner_id === user.id;
  const isAdmin = viewerRole === 'admin';

  const canView =
    (venue.status === 'active' && venue.is_visible === true) ||
    isOwner ||
    isAdmin;

  if (!canView) notFound();

  const { data: interactionSettings } = await supabase
    .from('venue_interaction_settings')
    .select('*')
    .eq('venue_id', venue.id)
    .maybeSingle();

  const { data: activeComments } = await supabase
    .from('venue_comments')
    .select('id, body, display_name, created_at, status')
    .eq('venue_id', venue.id)
    .eq('status', 'approved')
    .is('expired_at', null)
    .order('created_at', { ascending: false })
    .limit(8);

  const { data: activeEvents } = await supabase
    .from('events')
    .select('id, name, slug, event_start_at, city, state, flyer_url')
    .eq('venue_id', venue.id)
    .eq('is_public', true)
    .in('status', ['scheduled', 'active'])
    .order('event_start_at', { ascending: true })
    .limit(6);

  const { data: recentRequests } = await supabase
    .from('venue_music_requests')
    .select('id, song_title, artist_name, status, upvotes, downvotes, created_at')
    .eq('venue_id', venue.id)
    .in('status', ['pending', 'approved', 'playing'])
    .order('created_at', { ascending: false })
    .limit(6);

    const { data: activePresence } = user
  ? await supabase
      .from('venue_presence_sessions')
      .select('id, expires_at')
      .eq('venue_id', venue.id)
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
  : { data: null };

const commentsEnabled =
  interactionSettings?.comments_enabled === true ||
  interactionSettings?.live_comments_enabled === true;

const musicRequestsEnabled =
  interactionSettings?.music_requests_enabled === true ||
  interactionSettings?.dj_requests_enabled === true;

const commentsRequireLogin =
  interactionSettings?.comments_require_login !== false;

const musicRequestsRequireLogin =
  interactionSettings?.music_requests_require_login !== false;

const commentsRequirePresence =
  interactionSettings?.comments_require_presence === true;

const musicRequestsRequirePresence =
  interactionSettings?.music_requests_require_presence === true;

const commentsModerationMode =
  interactionSettings?.comments_moderation_mode || 'auto';

const musicRequestsModerationMode =
  interactionSettings?.music_requests_moderation_mode || 'manual';

const userHasPresence = !!activePresence;
const canBypassAccess = isOwner || isAdmin;

const canPostComment =
  commentsEnabled &&
  (canBypassAccess ||
    ((!commentsRequireLogin || !!user) &&
      (!commentsRequirePresence || userHasPresence)));

const canRequestMusic =
  musicRequestsEnabled &&
  (canBypassAccess ||
    ((!musicRequestsRequireLogin || !!user) &&
      (!musicRequestsRequirePresence || userHasPresence)));

  const presenceEnabled =
    interactionSettings?.presence_enabled === true ||
    interactionSettings?.qr_presence_enabled === true;

  const linkdnEnabled =
    interactionSettings?.linkdn_enabled === true ||
    interactionSettings?.linkdn_lite_enabled === true ||
    interactionSettings?.linkdn_full_enabled === true;

  const hasAnyLiveFeature =
    commentsEnabled || musicRequestsEnabled || presenceEnabled || linkdnEnabled;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <main className="space-y-8">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-8 sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_28%)]" />

            <div className="relative">
              <p className="text-sm uppercase tracking-[0.35em] text-accent">
                HypeKnight Venue
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-6xl">
                {venue.name}
              </h1>

              <p className="mt-4 max-w-3xl text-white/75">
                {venue.city}, {venue.state}
                {venue.address ? ` • ${venue.address}` : ''}
              </p>

              {venue.description ? (
                <p className="mt-6 max-w-3xl whitespace-pre-wrap text-lg text-white/80">
                  {venue.description}
                </p>
              ) : null}

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <HeroStat label="Status" value={venue.status === 'active' ? 'Open on HypeKnight' : venue.status} />
                <HeroStat label="City" value={`${venue.city}, ${venue.state}`} />
                <HeroStat label="Featured" value={venue.is_featured ? 'Yes' : 'No'} />
                <HeroStat label="Live Features" value={hasAnyLiveFeature ? 'Enabled' : 'Basic Profile'} />
              </div>
            </div>
          </div>

          {venue.cover_image_url ? (
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
              <img
                src={venue.cover_image_url}
                alt={venue.name}
                className="h-auto w-full object-cover"
              />
            </div>
          ) : null}

          {hasAnyLiveFeature ? (
            <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-8">
              <p className="text-sm uppercase tracking-[0.35em] text-accent">
                Live Venue Tools
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white">
                Interact with this venue
              </h2>
              <p className="mt-3 text-white/75">
                This venue has active HypeKnight features available for guests.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {commentsEnabled ? (
                  <FeatureCard
                    title="Live Comments"
                    description="Join the conversation and see what people are saying."
                    href={user ? `#comments` : `/auth/login`}
                    cta={user ? 'View Comments' : 'Log in to Comment'}
                  />
                ) : null}

                {musicRequestsEnabled ? (
                  <FeatureCard
                    title="Music Requests"
                    description="Request songs and help shape the night."
                    href={user ? `#music-requests` : `/auth/login`}
                    cta={user ? 'Request Music' : 'Log in to Request'}
                  />
                ) : null}

                {presenceEnabled ? (
                  <FeatureCard
                    title="Venue Check-In"
                    description="Use QR presence tools when you are at the venue."
                    href={`/dashboard/venues/${venue.id}/presence`}
                    cta="Presence Info"
                  />
                ) : null}

                {linkdnEnabled ? (
                  <FeatureCard
                    title="Linkd’N Enabled"
                    description="This venue can participate in connected nightlife experiences."
                    href="#linkdn"
                    cta="Learn More"
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">Venue Profile</h2>
              <p className="mt-3 text-white/70">
                This venue currently has a basic HypeKnight profile. More interactive
                features may be added later.
              </p>
            </div>
          )}

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Venue Details</h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Info label="Address" value={venue.address} />
              <Info label="City / State" value={`${venue.city}, ${venue.state}`} />
              <Info label="Website" value={venue.website_url} />
              <Info label="Instagram" value={venue.instagram_url} />
              <Info label="Dress Code" value={venue.dress_code} />
              <Info label="Music" value={venue.music} />
              <Info label="Drink Menu" value={venue.drink_menu} />
              <Info label="Table / RSVP" value={venue.rsvp_table_service} />
            </div>

            {venue.special_message ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                  Special Message
                </p>
                <p className="mt-3 whitespace-pre-wrap text-white">
                  {venue.special_message}
                </p>
              </div>
            ) : null}
          </div>

          {activeEvents?.length ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">Upcoming Events</h2>
              <p className="mt-2 text-white/65">
                Events connected to this venue on HypeKnight.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {activeEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.slug}`}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5 hover:border-accent/40"
                  >
                    <p className="text-lg font-bold text-white">{event.name}</p>
                    <p className="mt-2 text-sm text-white/65">
                      {event.event_start_at
                        ? new Date(event.event_start_at).toLocaleString()
                        : 'Date pending'}
                    </p>
                    <p className="mt-1 text-sm text-white/50">
                      {event.city}, {event.state}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

{commentsEnabled ? (
  <div
    id="comments"
    className="rounded-[2rem] border border-white/10 bg-white/5 p-8"
  >
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white">Live Comments</h2>
        <p className="mt-2 text-white/65">
          {commentsRequirePresence
            ? 'Comments are available for checked-in guests at this venue.'
            : commentsRequireLogin
            ? 'Log in to join the conversation while comments are active.'
            : 'See what guests are saying while comments are active.'}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/70">
            {commentsRequirePresence
              ? 'Check-in required'
              : commentsRequireLogin
              ? 'Login required'
              : 'Open comments'}
          </span>

          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/70">
            {commentsModerationMode === 'manual'
              ? 'Reviewed before posting'
              : commentsModerationMode === 'auto'
              ? 'Auto filtered'
              : commentsModerationMode}
          </span>
        </div>
      </div>

      <Link
        href={
          canPostComment
            ? `/venues/${venue.slug}/comments`
            : !user && commentsRequireLogin
            ? '/auth/login'
            : commentsRequirePresence
            ? `/presence/join/${venue.id}`
            : '#comments'
        }
        className={
          canPostComment
            ? 'rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black hover:opacity-90'
            : 'rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40'
        }
      >
        {canPostComment
          ? 'Post Comment'
          : !user && commentsRequireLogin
          ? 'Log in to Comment'
          : commentsRequirePresence
          ? 'Check In to Comment'
          : 'Comments Restricted'}
      </Link>
    </div>

    {!canPostComment && commentsRequirePresence ? (
      <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-100">
        This venue requires presence verification before posting comments. Check in
        through the venue QR code or presence link to unlock commenting.
      </div>
    ) : null}

    <div className="mt-6 space-y-3">
      {activeComments?.length ? (
        activeComments.map((comment) => (
          <div
            key={comment.id}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <p className="text-sm text-white/50">
              {comment.display_name || 'Guest'} •{' '}
              {new Date(comment.created_at).toLocaleString()}
            </p>
            <p className="mt-2 text-white">{comment.body}</p>
          </div>
        ))
      ) : (
        <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/65">
          No live comments yet.
        </p>
      )}
    </div>
  </div>
) : null}

{musicRequestsEnabled ? (
  <div
    id="music-requests"
    className="rounded-[2rem] border border-white/10 bg-white/5 p-8"
  >
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white">Music Requests</h2>
        <p className="mt-2 text-white/65">
          {musicRequestsRequirePresence
            ? 'Music requests are available for checked-in guests at this venue.'
            : musicRequestsRequireLogin
            ? 'Log in to request tracks and vote on what should play next.'
            : 'Request tracks and vote on what should play next.'}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/70">
            {musicRequestsRequirePresence
              ? 'Check-in required'
              : musicRequestsRequireLogin
              ? 'Login required'
              : 'Open requests'}
          </span>

          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/70">
            {musicRequestsModerationMode === 'manual'
              ? 'DJ approval required'
              : musicRequestsModerationMode === 'auto'
              ? 'Auto filtered'
              : musicRequestsModerationMode}
          </span>
        </div>
      </div>

      <Link
        href={
          canRequestMusic
            ? `/venues/${venue.slug}/music-requests`
            : !user && musicRequestsRequireLogin
            ? '/auth/login'
            : musicRequestsRequirePresence
            ? `/presence/join/${venue.id}`
            : '#music-requests'
        }
        className={
          canRequestMusic
            ? 'rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black hover:opacity-90'
            : 'rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40'
        }
      >
        {canRequestMusic
          ? 'Request Song'
          : !user && musicRequestsRequireLogin
          ? 'Log in to Request'
          : musicRequestsRequirePresence
          ? 'Check In to Request'
          : 'Requests Restricted'}
      </Link>
    </div>

    {!canRequestMusic && musicRequestsRequirePresence ? (
      <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-100">
        This venue requires presence verification before submitting music
        requests. Check in through the venue QR code or presence link to unlock
        requests.
      </div>
    ) : null}

    <div className="mt-6 space-y-3">
      {recentRequests?.length ? (
        recentRequests.map((request) => (
          <div
            key={request.id}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">
                  {request.song_title}
                </p>
                <p className="text-sm text-white/60">
                  {request.artist_name || 'Unknown artist'}
                </p>
              </div>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/70">
                {request.status}
              </span>
            </div>

            <p className="mt-3 text-sm text-white/50">
              ▲ {request.upvotes || 0} • ▼ {request.downvotes || 0}
            </p>
          </div>
        ))
      ) : (
        <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/65">
          No music requests yet.
        </p>
      )}
    </div>
  </div>
) : null}

          {linkdnEnabled ? (
            <div
              id="linkdn"
              className="rounded-[2rem] border border-accent/20 bg-accent/10 p-8"
            >
              <p className="text-sm uppercase tracking-[0.35em] text-accent">
                Linkd’N
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">
                Connected nightlife ready
              </h2>
              <p className="mt-3 text-white/75">
                This venue has access to HypeKnight’s connected nightlife system.
                Live room and venue-to-venue features may appear during active
                experiences.
              </p>
            </div>
          ) : null}
        </main>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Quick Look</h2>

            <div className="mt-6 space-y-4">
              <QuickRow label="Venue" value={venue.name} />
              <QuickRow label="Location" value={`${venue.city}, ${venue.state}`} />
              <QuickRow label="Address" value={venue.address || '—'} />
              <QuickRow label="Comments Access" value={commentsEnabled ? commentsRequirePresence ? 'Check-in required' : commentsRequireLogin ? 'Login required' : 'Open' : 'Off'} />
              <QuickRow
  label="Music Requests"
  value={
    musicRequestsEnabled
      ? musicRequestsRequirePresence
        ? 'Check-in required'
        : musicRequestsRequireLogin
        ? 'Login required'
        : 'Open'
      : 'Off'
  }
/>
              <QuickRow label="Linkd’N" value={linkdnEnabled ? 'Enabled' : 'Off'} />
            </div>
          </div>




<QuickRow
  label="Comment Moderation"
  value={commentsModerationMode}
/>

<QuickRow
  label="Music Review"
  value={musicRequestsModerationMode}
/>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Guest Actions</h2>

            <div className="mt-5 space-y-3">
              {commentsEnabled ? (
                <Link
                  href={user ? `/venues/${venue.slug}/comments` : '/auth/login'}
                  className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                >
                  {user ? 'Post Comment' : 'Log in to Comment'}
                </Link>
              ) : null}

              {musicRequestsEnabled ? (
                <Link
                  href={user ? `/venues/${venue.slug}/music-requests` : '/auth/login'}
                  className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                >
                  {user ? 'Request Music' : 'Log in for Music Requests'}
                </Link>
              ) : null}

              {!hasAnyLiveFeature ? (
                <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-white/60">
                  No guest interaction tools are currently active.
                </p>
              ) : null}
            </div>
          </div>

          {(isOwner || isAdmin) ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">Management</h2>

              <div className="mt-5 space-y-3">
                {isOwner ? (
                  <Link
                    href={`/dashboard/venues/${venue.id}/review`}
                    className="block rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black hover:opacity-90"
                  >
                    Manage Venue
                  </Link>
                ) : null}

                {isAdmin ? (
                  <Link
                    href={`/admin/venues/${venue.id}`}
                    className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                  >
                    Admin Detail
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-3 text-sm font-semibold text-white">{value || '—'}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
    </div>
  );
}

function QuickRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-white/60">{label}</span>
      <span className="text-right text-white">{value || '—'}</span>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/10 bg-black/20 p-5 hover:border-accent/40"
    >
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/65">{description}</p>
      <p className="mt-4 text-sm font-semibold text-accent">{cta}</p>
    </Link>
  );
}