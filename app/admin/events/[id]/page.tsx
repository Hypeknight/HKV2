import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  approveEvent,
  rejectEvent,
  applyPaymentOverride,
} from '../new/actions';

type AdminEventDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminEventDetailPage({
  params,
}: AdminEventDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !event) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Admin Event Review
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">{event.name}</h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Review the full event listing before approval, rejection, or payment override.
          </p>
        </div>

        <Link
          href="/admin/events"
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to moderation queue
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <Panel title="Basic Information">
            <Grid>
              <Info label="Event Name" value={event.name} />
              <Info label="Slug" value={event.slug} />
              <Info label="Venue Name" value={event.venue_name} />
              <Info label="Address" value={event.address} />
              <Info label="City" value={event.city} />
              <Info label="State" value={event.state} />
              <Info label="Owner Type" value={event.owner_type} />
              <Info label="Owner ID" value={event.owner_id} />
              <Info
                label="Event Start"
                value={
                  event.event_start_at
                    ? new Date(event.event_start_at).toLocaleString()
                    : '—'
                }
              />
              <Info
                label="Event End"
                value={
                  event.event_end_at
                    ? new Date(event.event_end_at).toLocaleString()
                    : '—'
                }
              />
              <Info label="Flyer URL" value={event.flyer_url} />
              <Info label="Current Step" value={String(event.current_step ?? '—')} />
            </Grid>
          </Panel>

          <Panel title="Event Details">
            <Grid>
              <Info label="Dress Code" value={event.dress_code} />
              <Info label="Entry Price" value={event.entry_price} />
              <Info label="Age Requirement" value={event.age_requirement} />
              <Info label="Event Type" value={event.event_type} />
              <Info label="Smoking Policy" value={event.smoking_policy} />
              <Info label="Parking Notes" value={event.parking_notes} />
            </Grid>

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
          </Panel>

          <Panel title="Promotion + Pricing">
            <Grid>
              <Info label="Base Price" value={money(event.base_price)} />
              <Info label="Included Promo Days" value={String(event.included_promo_days ?? 14)} />
              <Info label="Extra Promo Days" value={String(event.extra_promo_days ?? 0)} />
              <Info label="Extra Promo Price" value={money(event.extra_promo_price)} />
              <Info label="Total Price" value={money(event.total_price)} />
              <Info label="Payment Required" value={yesNo(event.payment_required)} />
              <Info label="Is Paid" value={yesNo(event.is_paid)} />
              <Info label="Payment Override" value={yesNo(event.payment_override)} />
              <Info label="Linkd'N Mode" value={event.linkdn_mode} />
              <Info label="Linkd'N Price" value={money(event.linkdn_price)} />
              <Info
                label="Promo Start"
                value={
                  event.promotion_start_at
                    ? new Date(event.promotion_start_at).toLocaleString()
                    : '—'
                }
              />
              <Info
                label="Promo End"
                value={
                  event.promotion_end_at
                    ? new Date(event.promotion_end_at).toLocaleString()
                    : '—'
                }
              />
              <Info
                label="Linkd'N Setup Deadline"
                value={
                  event.linkdn_setup_deadline
                    ? new Date(event.linkdn_setup_deadline).toLocaleString()
                    : '—'
                }
              />
              <Info label="Linkd'N Ready Status" value={event.linkdn_ready_status} />
            </Grid>
          </Panel>

          <Panel title="Moderation Status">
            <Grid>
              <Info label="Status" value={event.status} />
              <Info label="Approved" value={yesNo(event.is_approved)} />
              <Info
                label="Approved At"
                value={event.approved_at ? new Date(event.approved_at).toLocaleString() : '—'}
              />
              <Info label="Approved By" value={event.approved_by} />
              <Info
                label="Submitted At"
                value={event.submitted_at ? new Date(event.submitted_at).toLocaleString() : '—'}
              />
              <Info
                label="Rejected At"
                value={event.rejected_at ? new Date(event.rejected_at).toLocaleString() : '—'}
              />
              <Info label="Rejected By" value={event.rejected_by} />
              <Info label="Rejection Reason" value={event.rejection_reason} />
              <Info label="Public" value={yesNo(event.is_public)} />
              <Info
                label="Locked At"
                value={event.locked_at ? new Date(event.locked_at).toLocaleString() : '—'}
              />
            </Grid>
          </Panel>

          <Panel title="Removal / Refund">
            <Grid>
              <Info
                label="Removal Requested At"
                value={
                  event.removal_requested_at
                    ? new Date(event.removal_requested_at).toLocaleString()
                    : '—'
                }
              />
              <Info label="Removal Reason" value={event.removal_reason} />
              <Info label="Refund Requested" value={yesNo(event.refund_requested)} />
              <Info label="Refund Decision" value={event.refund_decision} />
              <Info
                label="Removed At"
                value={event.removed_at ? new Date(event.removed_at).toLocaleString() : '—'}
              />
              <Info label="Removed By" value={event.removed_by} />
            </Grid>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Admin Actions">
            <div className="space-y-4">
              <form action={approveEvent}>
                <input type="hidden" name="event_id" value={event.id} />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
                >
                  Approve Event
                </button>
              </form>

              <form action={rejectEvent} className="space-y-3">
                <input type="hidden" name="event_id" value={event.id} />
                <textarea
                  name="rejection_reason"
                  rows={4}
                  placeholder="Reason for rejection"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 font-semibold text-red-300 hover:border-red-500/40"
                >
                  Reject Event
                </button>
              </form>

              <form action={applyPaymentOverride} className="space-y-3">
                <input type="hidden" name="event_id" value={event.id} />
                <textarea
                  name="reason"
                  rows={4}
                  placeholder="Override reason"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-accent/20 bg-accent/10 px-5 py-3 font-semibold text-accent hover:border-accent/40"
                >
                  Apply Payment Override
                </button>
              </form>
            </div>
          </Panel>

          <Panel title="Quick Summary">
            <div className="space-y-4 text-sm text-white/75">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span className="font-semibold text-white">{event.status || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Public</span>
                <span className="font-semibold text-white">{yesNo(event.is_public)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Paid</span>
                <span className="font-semibold text-white">{yesNo(event.is_paid)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Override</span>
                <span className="font-semibold text-white">{yesNo(event.payment_override)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total</span>
                <span className="font-semibold text-white">{money(event.total_price)}</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </section>
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

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
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

function yesNo(value: boolean | null | undefined) {
  return value ? 'Yes' : 'No';
}

function money(value: number | string | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}