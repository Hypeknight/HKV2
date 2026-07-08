import Link from 'next/link';
import { createEventStep1 } from '@/app/dashboard/events/actions';
import EventFlyerUpload from '@/components/events/EventFlyerUpload';
import { US_STATES } from '@/lib/states';
import { InfoCard, Panel, SectionHeader } from '@/components/ui';

export default function NewEventStep1Page() {
  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <Link href="/dashboard/events" className="text-sm text-white/60 hover:text-accent">
        ← Back to My Events
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Create Event
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-6xl">
              Start your event listing.
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Step 1 captures the essentials: flyer, name, venue, location, and
              event time. You can keep building the listing in the next steps.
            </p>
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

      <form action={createEventStep1} className="space-y-8">
        <Panel title="Event flyer" eyebrow="Visual First">
          <p className="mb-5 text-sm leading-6 text-white/65">
            Upload a flyer if you have one. Flyers often include important event
            details and help your listing stand out.
          </p>

          <EventFlyerUpload />
        </Panel>

        <Panel title="Event identity" eyebrow="What is happening?">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="name"
              name="name"
              label="Event Name"
              required
              placeholder="Midnight Vibes"
            />

            <Input
              id="venue_name"
              name="venue_name"
              label="Venue Name"
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
              required
              placeholder="123 Main St"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                id="city"
                name="city"
                label="City"
                required
                placeholder="Kansas City"
              />

              <StateSelect />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/10 p-5 text-sm leading-6 text-white/75">
            Use the full address when possible. The event detail page displays
            the address so users can find the venue without already knowing it.
          </div>
        </Panel>

        <Panel title="Date and time" eyebrow="When does it start?">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="start_date"
              name="start_date"
              label="Start Date"
              type="date"
              required
            />

            <Input
              id="start_time"
              name="start_time"
              label="Start Time"
              type="time"
              required
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Input
              id="end_date"
              name="end_date"
              label="End Date"
              type="date"
              helper="Optional. Use this for overnight or multi-day events."
            />

            <Input
              id="end_time"
              name="end_time"
              label="End Time"
              type="time"
              helper="Optional, but helpful for users deciding where to go."
            />
          </div>
        </Panel>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
          <SectionHeader
            eyebrow="Next"
            title="Ready to keep building?"
            text="After this, you will add event details, vibe, entry information, and anything users should know before attending."
          />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Link
              href="/dashboard/events"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-4 font-semibold text-white hover:border-white/20 sm:w-auto"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90 sm:w-auto"
            >
              Continue to Step 2
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

function StateSelect() {
  return (
    <label htmlFor="state" className="block">
      <span className="text-sm font-semibold text-white/70">State</span>
      <select
        id="state"
        name="state"
        required
        defaultValue=""
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