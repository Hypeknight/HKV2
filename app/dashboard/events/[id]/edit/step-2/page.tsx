import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { updateEventStep2 } from '@/app/dashboard/events/actions';
import { createClient } from '@/lib/supabase/server';
import { Chip, InfoCard, Panel, SectionHeader } from '@/components/ui';

type Step2PageProps = {
  params: Promise<{
    id: string;
  }>;
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

const MUSIC_OPTIONS = [
  'Hip-Hop',
  'R&B',
  'Afrobeats',
  'House',
  'EDM',
  'Latin',
  'Top 40',
  'Trap',
  'Dancehall',
  'Country',
  'Rock',
  'Jazz',
  'Blues',
  'Pop',
];

const VIBE_TAGS = [
  'High Energy',
  'Chill',
  'Luxury',
  'Upscale',
  'Underground',
  'Tourist Friendly',
  'Locals Spot',
  'Live DJ',
  'Late Night',
  'Date Night',
  'Dance Floor',
  'Free Entry',
  'VIP',
  'Outdoor',
  'Casual',
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

const AMENITIES = [
  'Food Available',
  'Drink Specials',
  'Bottle Service',
  'VIP Sections',
  'Outdoor Area',
  'Patio',
  'Hookah',
  'Photo Ops',
  'Dance Floor',
  'Live Entertainment',
  'Security',
  'Accessible Entry',
];

export default async function EditEventStep2Page({ params }: Step2PageProps) {
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
      description,
      dress_code,
      entry_price,
      music_selection,
      age_requirement,
      event_type,
      vibe_tags,
      smoking_policy,
      parking_notes,
      special_notes,
      status
    `)
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error || !event) notFound();

  const selectedMusic = Array.isArray(event.music_selection)
    ? event.music_selection
    : [];

  const selectedVibes = Array.isArray(event.vibe_tags)
    ? event.vibe_tags
    : [];

  const selectedEventTypes = splitValue(event.event_type);
  const selectedAmenities = splitValue((event as any).amenities);

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
              Create Event
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-6xl">
              Add the details people search for.
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Step 2 helps HypeKnight categorize your event by music, vibe,
              attire, age, event type, entry cost, and guest expectations.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Chip>{event.name}</Chip>
              <Chip>Status: {event.status}</Chip>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Progress
            </p>

            <div className="mt-5 grid gap-3">
              <InfoCard label="Step 1" icon="✅" value="Basics" />
              <InfoCard label="Step 2" icon="✅" value="Details" accent />
              <InfoCard label="Step 3" icon="•" value="Review / Submit" />
            </div>
          </div>
        </div>
      </section>

      <form action={updateEventStep2} className="space-y-8">
        <input type="hidden" name="event_id" value={event.id} />

        <Panel title="Event description" eyebrow="The Story">
          <label htmlFor="description" className="block">
            <span className="text-sm font-semibold text-white/70">
              Description
            </span>

            <textarea
              id="description"
              name="description"
              rows={6}
              defaultValue={event.description || ''}
              placeholder="Describe the event, the energy, the experience, and what guests should expect."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />

            <span className="mt-2 block text-xs leading-5 text-white/45">
              A strong description helps users decide if this event fits their
              night.
            </span>
          </label>
        </Panel>

        <Panel title="Category and age" eyebrow="Uniform Event Info">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              name="dress_code"
              label="Attire / Dress Code"
              defaultValue={event.dress_code || ''}
              options={DRESS_CODES}
            />

            <Select
              name="age_requirement"
              label="Age Requirement"
              defaultValue={event.age_requirement || ''}
              options={AGE_REQUIREMENTS}
            />
          </div>

          <div className="mt-5">
            <CheckboxGroup
              title="Event Type"
              description="Choose every category that fits. This helps users filter by type."
              name="event_type"
              options={EVENT_TYPES}
              selected={selectedEventTypes}
            />
          </div>
        </Panel>

        <Panel title="Music and vibe" eyebrow="Discovery Tags">
          <CheckboxGroup
            title="Music Selection"
            description="Choose the sounds people can expect."
            name="music_selection"
            options={MUSIC_OPTIONS}
            selected={selectedMusic}
          />

          <div className="mt-8">
            <CheckboxGroup
              title="Vibe Tags"
              description="Choose the energy, setting, or experience."
              name="vibe_tags"
              options={VIBE_TAGS}
              selected={selectedVibes}
            />
          </div>
        </Panel>

        <Panel title="Entry and guest details" eyebrow="Know Before You Go">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="entry_price"
              name="entry_price"
              label="Entry Price"
              defaultValue={event.entry_price || ''}
              placeholder="$10, Free before 11, $20 at door"
              helper="Keep this simple and clear for users."
            />

            <Select
              name="smoking_policy"
              label="Smoking Policy"
              defaultValue={event.smoking_policy || ''}
              options={SMOKING_POLICIES}
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Select
              name="parking_notes"
              label="Parking / Access"
              defaultValue={event.parking_notes || ''}
              options={PARKING_OPTIONS}
            />

            <Input
              id="special_notes_short"
              name="special_notes_short"
              label="Quick Guest Note"
              placeholder="Example: Arrive early. Limited capacity."
              helper="Optional. We can use this later for short event cards."
            />
          </div>
        </Panel>

        <Panel title="Amenities" eyebrow="What is available?">
          <CheckboxGroup
            title="Event Amenities"
            description="Optional. These can power future filters and event badges."
            name="amenities"
            options={AMENITIES}
            selected={selectedAmenities}
          />
        </Panel>

        <Panel title="Special notes" eyebrow="Extra Details">
          <label htmlFor="special_notes" className="block">
            <span className="text-sm font-semibold text-white/70">
              Anything else guests should know?
            </span>

            <textarea
              id="special_notes"
              name="special_notes"
              rows={5}
              defaultValue={event.special_notes || ''}
              placeholder="Add anything else guests should know before attending."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />
          </label>
        </Panel>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
          <SectionHeader
            eyebrow="Next"
            title="Ready for review?"
            text="Step 3 lets you review the listing before submitting it to HypeKnight."
          />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Link
              href="/dashboard/events"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-4 font-semibold text-white hover:border-white/20 sm:w-auto"
            >
              Save and return later
            </Link>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90 sm:w-auto"
            >
              Continue to Step 3
            </button>
          </div>
        </section>
      </form>
    </section>
  );
}

function CheckboxGroup({
  title,
  description,
  name,
  options,
  selected,
}: {
  title: string;
  description: string;
  name: string;
  options: string[];
  selected: string[];
}) {
  return (
    <section>
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <CheckCard
            key={option}
            name={name}
            value={option}
            label={option}
            defaultChecked={selected.includes(option)}
          />
        ))}
      </div>
    </section>
  );
}

function CheckCard({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white transition hover:border-accent/40">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="h-4 w-4 shrink-0"
      />
      <span className="font-semibold">{label}</span>
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

function Input({
  id,
  name,
  label,
  defaultValue = '',
  placeholder,
  helper,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-semibold text-white/70">{label}</span>

      <input
        id={id}
        name={name}
        type="text"
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

function splitValue(value?: string | string[] | null) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}