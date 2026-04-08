import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { submitEventForModeration } from '@/app/dashboard/events/actions';
import { createClient } from '@/lib/supabase/server';

type ReviewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EventReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error || !event) notFound();

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Create Event</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Review Your Event</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Check everything carefully before submitting. After submission, the event is locked unless rejected for changes.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Basic Information</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info label="Event Name" value={event.name} />
            <Info label="Venue Name" value={event.venue_name} />
            <Info label="Address" value={event.address} />
            <Info label="City" value={event.city} />
            <Info label="State" value={event.state} />
            <Info
              label="Start"
              value={event.event_start_at ? new Date(event.event_start_at).toLocaleString() : ''}
            />
            <Info
              label="End"
              value={event.event_end_at ? new Date(event.event_end_at).toLocaleString() : ''}
            />
            <Info label="Flyer URL" value={event.flyer_url} />
          </div>
          <div className="mt-6">
            <Link
              href={`/dashboard/events/${event.id}/edit/step-1`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
            >
              Edit Step 1
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Event Details</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info label="Dress Code" value={event.dress_code} />
            <Info label="Entry Price" value={event.entry_price} />
            <Info label="Age Requirement" value={event.age_requirement} />
            <Info label="Event Type" value={event.event_type} />
            <Info label="Smoking Policy" value={event.smoking_policy} />
            <Info label="Parking Notes" value={event.parking_notes} />
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

          <div className="mt-6">
            <Link
              href={`/dashboard/events/${event.id}/edit/step-2`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
            >
              Edit Step 2
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Promotion + Pricing</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info label="Base Price" value={`$${Number(event.base_price || 0).toFixed(2)}`} />
            <Info label="Included Promo Days" value={String(event.included_promo_days || 14)} />
            <Info label="Extra Promo Days" value={String(event.extra_promo_days || 0)} />
            <Info
              label="Extra Promo Price"
              value={`$${Number(event.extra_promo_price || 0).toFixed(2)}`}
            />
            <Info label="Linkd'N Mode" value={event.linkdn_mode} />
            <Info label="Linkd'N Price" value={`$${Number(event.linkdn_price || 0).toFixed(2)}`} />
            <Info
              label="Promotion Start"
              value={
                event.promotion_start_at
                  ? new Date(event.promotion_start_at).toLocaleString()
                  : ''
              }
            />
            <Info
              label="Promotion End"
              value={
                event.promotion_end_at
                  ? new Date(event.promotion_end_at).toLocaleString()
                  : ''
              }
            />
            <Info label="Total Price" value={`$${Number(event.total_price || 0).toFixed(2)}`} />
          </div>
          <div className="mt-6">
            <Link
              href={`/dashboard/events/${event.id}/edit/step-3`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-white hover:border-accent/40"
            >
              Edit Step 3
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-8">
          <h2 className="text-2xl font-bold text-white">Ready to submit?</h2>
          <p className="mt-3 text-white/70">
            Once submitted, this event moves into review and becomes locked unless rejected back for changes.
          </p>

          <form action={submitEventForModeration} className="mt-6">
            <input type="hidden" name="event_id" value={event.id} />
            <button
              type="submit"
              className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Submit for Review
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 text-white">{value || '—'}</p>
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