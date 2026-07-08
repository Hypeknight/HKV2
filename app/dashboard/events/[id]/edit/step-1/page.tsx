import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateEventStep1 } from '@/app/dashboard/events/actions';
import EventFlyerUpload from '@/components/events/EventFlyerUpload';
import { US_STATES } from '@/lib/states';
import { Chip, InfoCard, Panel, SectionHeader } from '@/components/ui';

type EditStep1PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEventStep1Page({ params }: EditStep1PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      id,
      owner_id,
      name,
      slug,
      flyer_url,
      venue_name,
      address,
      city,
      state,
      event_start_at,
      event_end_at,
      status
    `)
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error || !event) notFound();

  if (!['draft', 'building', 'rejected', 'revision_draft'].includes(event.status)) {
    redirect(`/events/${event.slug}`);
  }

  const startParts = getDateTimeParts(event.event_start_at);
  const endParts = getDateTimeParts(event.event_end_at);

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/dashboard/events"
        className="text-sm text-white/60 hover:text-accent"
      >
        ← Back to My Events
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Edit Event
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-6xl">
              Update the event basics.
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Adjust the flyer, name, venue, location, and event time before
              continuing your listing.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Chip>{event.name || 'Untitled Event'}</Chip>
              <Chip>Status: {event.status}</Chip>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Progress
            </p>

            <div className="mt-5 grid gap-3">
              <InfoCard label="Step 1" icon="✅" value="Basics" accent />
              <InfoCard label="Step 2" icon="•" value="Details" />
              <InfoCard label="Step 3" icon="•" value="Review / Submit" />
            </div>
          </div>
        </div>
      </section>

      <form action={updateEventStep1} className="space-y-8">
        <input type="hidden" name="event_id" value={event.id} />

        <Panel title="Event flyer" eyebrow="Visual First">
          <p className="mb-5 text-sm leading-6 text-white/65">
            Update the flyer if needed. HypeKnight will use this image across
            public event pages and discovery areas.
          </p>

          <EventFlyerUpload defaultUrl={event.flyer_url} />
        </Panel>

        <Panel title="Event identity" eyebrow="What is happening?">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="name"
              name="name"
              label="Event Name"
              required
              defaultValue={event.name || ''}
              placeholder="Midnight Vibes"
            />

            <Input
              id="venue_name"
              name="venue_name"
              label="Venue Name"
              defaultValue={event.venue_name || ''}
              placeholder="Club Nova"
            />
          </div>
        </Panel>

        <Panel title="Location" eyebrow="Where is it?">
          <div className="grid gap-4">
            <Input
              id="address"
              name="address"
              label="Street Address"
              defaultValue={event.address || ''}
              placeholder="123 Main St"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                id="city"
                name="city"
                label="City"
                required
                defaultValue={event.city || ''}
                placeholder="Kansas City"
              />

              <StateSelect defaultValue={event.state || ''} />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/10 p-5 text-sm leading-6 text-white/75">
            Use the full address when possible. The event detail page displays
            the address so users can find the venue without already knowing it.
          </div>
        </Panel>

        <Panel title="Date and time" eyebrow="When is it happening?">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="start_date"
              name="start_date"
              label="Start Date"
              type="date"
              required
              defaultValue={startParts.date}
            />

            <Input
              id="start_time"
              name="start_time"
              label="Start Time"
              type="time"
              required
              defaultValue={startParts.time}
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Input
              id="end_date"
              name="end_date"
              label="End Date"
              type="date"
              defaultValue={endParts.date}
              helper="Optional. Use this for overnight or multi-day events."
            />

            <Input
              id="end_time"
              name="end_time"
              label="End Time"
              type="time"
              defaultValue={endParts.time}
              helper="Optional, but helpful for users deciding where to go."
            />
          </div>
        </Panel>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
          <SectionHeader
            eyebrow="Save"
            title="Ready to save the basics?"
            text="After saving, you can continue editing details, pricing, and promotion options."
          />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Link
              href={event.slug ? `/events/${event.slug}` : '/dashboard/events'}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-4 font-semibold text-white hover:border-white/20 sm:w-auto"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90 sm:w-auto"
            >
              Save Step 1
            </button>
          </div>
        </section>
      </form>
    </section>
  );
}

function Input({
  id,
  name,
  label,
  defaultValue = '',
  required = false,
  placeholder,
  type = 'text',
  helper,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  helper?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-semibold text-white/70">{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />
      {helper ? (
        <span className="mt-2 block text-xs leading-5 text-white/45">
          {helper}
        </span>
      ) : null}
    </label>
  );
}

function StateSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <label htmlFor="state" className="block">
      <span className="text-sm font-semibold text-white/70">State</span>
      <select
        id="state"
        name="state"
        required
        defaultValue={defaultValue || ''}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
      >
        <option value="" disabled>
          Select a state
        </option>
        {US_STATES.map(([abbr, name]) => (
          <option key={abbr} value={abbr}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

function getDateTimeParts(value?: string | null) {
  if (!value) return { date: '', time: '' };

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/
  );

  if (!match) return { date: '', time: '' };

  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`,
  };
}