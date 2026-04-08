import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  discardDraftEvent,
  requestEventRemoval,
} from '@/app/dashboard/events/actions';

type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EventDetailPage({ params }: EventPageProps) {
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

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !event) {
    notFound();
  }

  const isOwner = !!user && event.owner_id === user.id;
  const isAdmin = viewerRole === 'admin';
  const canView = event.is_public || isOwner || isAdmin;

  if (!canView) {
    notFound();
  }

  const canEdit = ['draft', 'building', 'rejected'].includes(event.status);
  const canDiscard = ['draft', 'building', 'rejected'].includes(event.status);
  const canRequestRemoval = ['scheduled', 'live'].includes(event.status);

  const ownerEditHref =
    event.current_step === 1
      ? `/dashboard/events/${event.id}/edit/step-2`
      : event.current_step === 2
      ? `/dashboard/events/${event.id}/edit/step-3`
      : `/dashboard/events/${event.id}/review`;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-accent">
                  Event
                </p>
                <h1 className="mt-3 text-4xl font-bold text-white">{event.name}</h1>
                <p className="mt-3 text-white/70">
                  {event.venue_name || 'Independent Event'} · {event.city}, {event.state}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white">
                Status: <span className="font-semibold">{event.status}</span>
              </div>
            </div>

            {event.flyer_url ? (
              <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.flyer_url}
                  alt={event.name}
                  className="h-auto w-full object-cover"
                />
              </div>
            ) : null}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Info label="Venue" value={event.venue_name} />
              <Info label="Address" value={event.address} />
              <Info label="City / State" value={`${event.city}, ${event.state}`} />
              <Info
                label="Start"
                value={
                  event.event_start_at
                    ? new Date(event.event_start_at).toLocaleString()
                    : '—'
                }
              />
              <Info
                label="End"
                value={
                  event.event_end_at
                    ? new Date(event.event_end_at).toLocaleString()
                    : '—'
                }
              />
              <Info label="Entry Price" value={event.entry_price} />
              <Info label="Dress Code" value={event.dress_code} />
              <Info label="Age Requirement" value={event.age_requirement} />
              <Info label="Event Type" value={event.event_type} />
              <Info label="Smoking Policy" value={event.smoking_policy} />
            </div>

            <Block label="Description" value={event.description} />
            <Block label="Special Notes" value={event.special_notes} />
            <Block
              label="Music Selection"
              value={Array.isArray(event.music_selection) ? event.music_selection.join(', ') : ''}
            />
            <Block
              label="Vibe Tags"
              value={Array.isArray(event.vibe_tags) ? event.vibe_tags.join(', ') : ''}
            />
            <Block label="Parking Notes" value={event.parking_notes} />
          </div>

          {(isOwner || isAdmin) && (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">Internal Event Details</h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info label="Slug" value={event.slug} />
                <Info label="Owner Type" value={event.owner_type} />
                <Info label="Public" value={event.is_public ? 'Yes' : 'No'} />
                <Info label="Approved" value={event.is_approved ? 'Yes' : 'No'} />
                <Info label="Paid" value={event.is_paid ? 'Yes' : 'No'} />
                <Info label="Payment Override" value={event.payment_override ? 'Yes' : 'No'} />
                <Info label="Base Price" value={money(event.base_price)} />
                <Info label="Extra Promo Days" value={String(event.extra_promo_days || 0)} />
                <Info label="Extra Promo Price" value={money(event.extra_promo_price)} />
                <Info label="Linkd'N Mode" value={event.linkdn_mode} />
                <Info label="Linkd'N Price" value={money(event.linkdn_price)} />
                <Info label="Total Price" value={money(event.total_price)} />
                <Info
                  label="Promotion Start"
                  value={
                    event.promotion_start_at
                      ? new Date(event.promotion_start_at).toLocaleString()
                      : '—'
                  }
                />
                <Info
                  label="Promotion End"
                  value={
                    event.promotion_end_at
                      ? new Date(event.promotion_end_at).toLocaleString()
                      : '—'
                  }
                />
                <Info
                  label="Submitted At"
                  value={
                    event.submitted_at
                      ? new Date(event.submitted_at).toLocaleString()
                      : '—'
                  }
                />
                <Info
                  label="Rejected At"
                  value={
                    event.rejected_at
                      ? new Date(event.rejected_at).toLocaleString()
                      : '—'
                  }
                />
              </div>

              {event.rejection_reason ? (
                <Block label="Rejection Reason" value={event.rejection_reason} />
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Event Summary</h2>

            <div className="mt-6 space-y-4">
              <SummaryRow label="Status" value={event.status} />
              <SummaryRow
                label="Start"
                value={
                  event.event_start_at
                    ? new Date(event.event_start_at).toLocaleString()
                    : '—'
                }
              />
              <SummaryRow label="Location" value={`${event.city}, ${event.state}`} />
              <SummaryRow label="Public" value={event.is_public ? 'Yes' : 'No'} />
              <SummaryRow label="Total Price" value={money(event.total_price)} />
            </div>
          </div>

          {isOwner && (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">Owner Controls</h2>
              <p className="mt-3 text-white/70">
                Actions shown here follow HypeKnight rules based on event status.
              </p>

              <div className="mt-6 space-y-4">
                {canEdit && (
                  <Link
                    href={ownerEditHref}
                    className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                  >
                    Edit Event
                  </Link>
                )}

                {canDiscard && (
                  <form action={discardDraftEvent}>
                    <input type="hidden" name="event_id" value={event.id} />
                    <button
                      type="submit"
                      className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-red-300 hover:border-red-500/40"
                    >
                      Remove Draft
                    </button>
                  </form>
                )}

                {canRequestRemoval && (
                  <details className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
                    <summary className="cursor-pointer font-medium">
                      Request removal
                    </summary>
                    <form action={requestEventRemoval} className="mt-4 space-y-3">
                      <input type="hidden" name="event_id" value={event.id} />
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
                        className="w-full rounded-2xl border border-accent/20 bg-accent/10 px-5 py-3 text-accent hover:border-accent/40"
                      >
                        Submit removal request
                      </button>
                    </form>
                  </details>
                )}

                {!canEdit && !canDiscard && !canRequestRemoval && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70">
                    No owner actions are available for this event in its current state.
                  </div>
                )}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">Admin Access</h2>
              <div className="mt-6 space-y-3">
                <Link
                  href={`/admin/events/${event.id}`}
                  className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                >
                  Open Admin Review
                </Link>
                <Link
                  href="/admin/events"
                  className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                >
                  Back to Moderation Queue
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
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
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
    </div>
  );
}

function Block({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
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

function money(value: number | string | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}