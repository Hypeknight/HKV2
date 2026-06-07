import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveEventPreferences } from './actions';

const MUSIC_GENRES = [
  'Hip-Hop',
  'R&B',
  'EDM',
  'House',
  'Country',
  'Rock',
  'Latin',
  'Afrobeats',
  'Jazz',
  'Pop',
];

const EVENT_TYPES = [
  'Nightlife',
  'Concerts',
  'Sports',
  'Comedy',
  'Festivals',
  'Day Parties',
  'Food & Drink',
  'Networking',
  'Live DJ',
  'Private Events',
];

const VIBE_TAGS = [
  'High Energy',
  'Chill',
  'Upscale',
  'Underground',
  'Date Night',
  'Dance Floor',
  'Outdoor',
  'Late Night',
  'Free Entry',
  'VIP',
];

type Props = {
  searchParams?: Promise<{ saved?: string }>;
};

export default async function EventPreferencesPage({ searchParams }: Props) {
  const query = searchParams ? await searchParams : {};

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: preferences } = await supabase
    .from('user_event_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const selectedGenres = preferences?.music_genres ?? [];
  const selectedTypes = preferences?.event_types ?? [];
  const selectedVibes = preferences?.vibe_tags ?? [];
  const selectedSources = preferences?.preferred_sources ?? [
    'hypeknight',
    'external',
  ];

  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Personalization
        </p>

        <h1 className="mt-3 text-4xl font-bold text-white">
          Your Event Preferences
        </h1>

        <p className="mt-3 max-w-3xl text-white/70">
          Tell HypeKnight what kind of events fit your night. These preferences
          will power personalized event recommendations.
        </p>
      </div>

      {query.saved ? (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-green-100">
          Preferences saved.
        </div>
      ) : null}

      <form
        action={saveEventPreferences}
        className="space-y-8 rounded-[2.5rem] border border-white/10 bg-white/5 p-8"
      >
        <section>
          <h2 className="text-2xl font-bold text-white">Home Base</h2>
          <p className="mt-2 text-white/65">
            This helps HypeKnight prioritize events near you.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <input
              name="preferred_city"
              defaultValue={preferences?.preferred_city || ''}
              placeholder="Preferred city"
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />

            <input
              name="preferred_state"
              defaultValue={preferences?.preferred_state || ''}
              placeholder="State, e.g. MO"
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />

            <input
              name="max_distance_miles"
              type="number"
              min="1"
              max="250"
              defaultValue={preferences?.max_distance_miles || 25}
              placeholder="Distance"
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />
          </div>
        </section>

        <PreferenceGroup
          title="Music"
          description="Choose the sounds that usually pull you out."
          name="music_genres"
          options={MUSIC_GENRES}
          selected={selectedGenres}
        />

        <PreferenceGroup
          title="Event Types"
          description="Choose the types of events you want surfaced first."
          name="event_types"
          options={EVENT_TYPES}
          selected={selectedTypes}
        />

        <PreferenceGroup
          title="Vibes"
          description="Choose the energy or setting you usually look for."
          name="vibe_tags"
          options={VIBE_TAGS}
          selected={selectedVibes}
        />

        <section>
          <h2 className="text-2xl font-bold text-white">Sources</h2>
          <p className="mt-2 text-white/65">
            Choose whether you want only HypeKnight events or supplemental
            external events too.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <CheckCard
              name="preferred_sources"
              value="hypeknight"
              label="HypeKnight Events"
              defaultChecked={selectedSources.includes('hypeknight')}
            />
            <CheckCard
              name="preferred_sources"
              value="external"
              label="External Events"
              defaultChecked={selectedSources.includes('external')}
            />
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
          >
            Save Preferences
          </button>

          <Link
            href="/events"
            className="rounded-2xl border border-white/10 bg-black/20 px-6 py-3 text-center text-white hover:border-accent/40"
          >
            Explore Events
          </Link>
        </div>
      </form>
    </section>
  );
}

function PreferenceGroup({
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
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-white/65">{description}</p>

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
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white hover:border-accent/40">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="h-4 w-4"
      />
      <span>{label}</span>
    </label>
  );
}