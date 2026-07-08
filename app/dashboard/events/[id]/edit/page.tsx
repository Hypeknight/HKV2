import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  submitEventRevision,
  updateEventRevision,
} from '@/app/dashboard/events/actions';
import { US_STATES } from '@/lib/states';
import { Chip, InfoCard, Panel, SectionHeader } from '@/components/ui';

type Props = {
  params: Promise<{ id: string }>;
};

const DRESS_CODES = [
  'Casual',
  'Smart Casual',
  'Upscale',
  'Streetwear',
  'Business Casual',
  'Formal',
  'Theme / Costume',
  'All White',
  'All Black',
  'No Dress Code Listed',
];

const AGE_REQUIREMENTS = [
  'All Ages',
  'Family Friendly',
  '18+',
  '21+',
  'Kids Welcome',
  'Adults Only',
];

const EVENT_TYPES = [
  'Nightlife',
  'Club Night',
  'Lounge',
  'Concert',
  'Live Music',
  'Live DJ',
  'Festival',
  'Day Party',
  'Sports',
  'Comedy',
  'Theater',
  'Food & Drink',
  'Networking',
  'Community Event',
  'Private Event',
  'Rooftop',
  'Hookah',
];

const SMOKING_POLICIES = [
  'No Smoking',
  'Patio Only',
  'Hookah Available',
  'Smoking Allowed',
  'Designated Area',
  'Not Listed',
];

const PARKING_OPTIONS = [
  'Street Parking',
  'Free Parking',
  'Paid Parking',
  'Parking Garage',
  'Valet',
  'Ride Share Recommended',
  'Limited Parking',
  'Not Listed',
];

export default async function EventRevisionEditPage({ params }: Props) {
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
    .maybeSingle();

  if (error || !event) notFound();

  if (event.status !== 'revision_draft') {
    redirect(`/dashboard/events/${event.id}/review`);
  }

  const startParts = getDateTimeParts(event.event_start_at);
  const endParts = getDateTimeParts(event.event_end_at);

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href={`/dashboard/events/${event.id}/review`}
        className="text-sm text-white/60 hover:text-accent"
      >
        ← Back to Event Review
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Revision Draft
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-6xl">
              Update and resubmit your event.
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Make changes, save the revision draft, then submit it back to
              HypeKnight for approval. The event will stay hidden until reviewed.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Chip>{event.name || 'Untitled Event'}</Chip>
              <Chip>Status: {event.status}</Chip>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Revision Process
            </p>

            <div className="mt-5 grid gap-3">
              <InfoCard label="Step 1" icon="✏️" value="Edit changes" accent />
              <InfoCard label="Step 2" icon="💾" value="Save draft" />
              <InfoCard label="Step 3" icon="📤" value="Submit review" />
            </div>
          </div>
        </div>
      </section>

      <form
        action={updateEventRevision}
        encType="multipart/form-data"
        className="space-y-8"
      >
        <input type="hidden" name="event_id" value={event.id} />

        <Panel title="Basic information" eyebrow="Event Identity">
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="name" label="Event Name" defaultValue={event.name} required />
            <Input name="venue_name" label="Venue Name" defaultValue={event.venue_name} />
            <Input name="address" label="Address" defaultValue={event.address} />
            <Input name="city" label="City" defaultValue={event.city} />

            <StateSelect defaultValue={event.state || ''} />

            <Input
              name="event_start_at"
              label="Start Date/Time"
              type="datetime-local"
              defaultValue={toDateTimeLocal(startParts)}
            />

            <Input
              name="event_end_at"
              label="End Date/Time"
              type="datetime-local"
              defaultValue={toDateTimeLocal(endParts)}
            />
          </div>
        </Panel>

        <Panel title="Flyer / image" eyebrow="Visual Update">
          {event.flyer_url || event.image_url ? (
            <div className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              <img
                src={event.flyer_url || event.image_url}
                alt={event.name || 'Current event flyer'}
                className="max-h-96 w-full object-cover"
              />
            </div>
          ) : null}

          <Input
            name="flyer_url"
            label="Flyer URL"
            defaultValue={event.flyer_url || event.image_url}
          />

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-white/70">
              Upload New Flyer / Image
            </span>
            <input
              name="flyer_file"
              type="file"
              accept="image/*"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-accent file:px-4 file:py-2 file:font-semibold file:text-black"
            />
          </label>

          <p className="mt-2 text-sm text-white/45">
            Uploading a new image will replace the current flyer for this revision.
          </p>
        </Panel>

        <Panel title="Event details" eyebrow="Uniform Info">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              name="dress_code"
              label="Dress Code"
              defaultValue={event.dress_code || ''}
              options={DRESS_CODES}
            />

            <Input name="entry_price" label="Entry Price" defaultValue={event.entry_price} />

            <Select
              name="age_requirement"
              label="Age Requirement"
              defaultValue={event.age_requirement || ''}
              options={AGE_REQUIREMENTS}
            />

            <Select
              name="event_type"
              label="Primary Event Type"
              defaultValue={event.event_type || ''}
              options={EVENT_TYPES}
            />

            <Select
              name="smoking_policy"
              label="Smoking Policy"
              defaultValue={event.smoking_policy || ''}
              options={SMOKING_POLICIES}
            />

            <Select
              name="parking_notes"
              label="Parking / Access"
              defaultValue={event.parking_notes || ''}
              options={PARKING_OPTIONS}
            />
          </div>

          <Textarea
            name="description"
            label="Description"
            defaultValue={event.description}
            placeholder="Describe the event, the energy, and what guests should expect."
          />

          <Textarea
            name="special_notes"
            label="Special Notes"
            defaultValue={event.special_notes}
            placeholder="Add anything else guests should know."
          />

          <Textarea
            name="revision_reason"
            label="Revision Reason"
            defaultValue={event.revision_reason}
            placeholder="Briefly explain what changed and why."
          />
        </Panel>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
          <SectionHeader
            eyebrow="Save Draft"
            title="Save your revision changes."
            text="Saving does not submit the event for review. Use the submission box below when you are ready."
          />

          <button
            type="submit"
            className="mt-6 w-full rounded-2xl border border-white/10 bg-black/20 px-6 py-4 font-semibold text-white hover:border-accent/40"
          >
            Save Revision Draft
          </button>
        </section>
      </form>

      <form
        action={submitEventRevision}
        className="rounded-[2rem] border border-accent/20 bg-accent/10 p-5 sm:rounded-[2.5rem] sm:p-8"
      >
        <input type="hidden" name="event_id" value={event.id} />

        <SectionHeader
          eyebrow="Submit Revision"
          title="Ready for HypeKnight to review?"
          text="Tell us what changed so admin can review the update faster."
        />

        <label className="mt-6 block">
          <span className="text-sm font-semibold text-white/70">
            Final Revision Note
          </span>
          <textarea
            name="revision_reason"
            rows={4}
            defaultValue={event.revision_reason || ''}
            placeholder="Tell HypeKnight what was changed."
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
          />
        </label>

        <button
          type="submit"
          className="mt-6 w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90"
        >
          Submit Revision for Approval
        </button>
      </form>
    </section>
  );
}

function Input({
  name,
  label,
  defaultValue,
  type = 'text',
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/70">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue || ''}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />
    </label>
  );
}

function Select({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/70">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue || ''}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
      >
        <option value="">Select one</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StateSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/70">State</span>
      <select
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

function Textarea({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <label className="mt-4 block">
      <span className="text-sm font-semibold text-white/70">{label}</span>
      <textarea
        name={name}
        rows={5}
        defaultValue={defaultValue || ''}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />
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

function toDateTimeLocal(parts: { date: string; time: string }) {
  if (!parts.date || !parts.time) return '';
  return `${parts.date}T${parts.time}`;
}