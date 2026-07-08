import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveEventPreferences } from './actions';
import { Chip, InfoCard, Panel, SectionHeader } from '@/components/ui';

const MUSIC_GENRES = [
  'Hip-Hop', 'R&B', 'EDM', 'House', 'Country', 'Rock',
  'Latin', 'Afrobeats', 'Jazz', 'Pop', 'Blues', 'Alternative',
];

const EVENT_TYPES = [
  'Nightlife', 'Concerts', 'Sports', 'Comedy', 'Festivals',
  'Day Parties', 'Food & Drink', 'Networking', 'Live DJ',
  'Private Events', 'Theater', 'Family',
];

const VIBE_TAGS = [
  'High Energy', 'Chill', 'Upscale', 'Underground', 'Date Night',
  'Dance Floor', 'Outdoor', 'Late Night', 'Free Entry', 'VIP',
  'Casual', 'Local Favorite',
];

const BUDGETS = ['Free', 'Under $20', '$20–$50', '$50–$100', '$100+'];

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
  const selectedBudgets = preferences?.budget_preferences ?? [];
  const selectedSources = preferences?.preferred_sources ?? ['hypeknight', 'external'];

  const preferenceCount =
    selectedGenres.length +
    selectedTypes.length +
    selectedVibes.length +
    selectedBudgets.length;

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <Link href="/dashboard" className="text-sm text-white/60 hover:text-accent">
        ← Back to Dashboard
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Personalization
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-6xl">
              Help HypeKnight find your next great night.
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Pick your music, event types, vibes, budget, and preferred city so
              HypeKnight can start shaping discovery around what you actually like.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Chip>{preferenceCount} preferences selected</Chip>
              <Chip>{selectedSources.length} sources enabled</Chip>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Discovery Setup
            </p>

            <div className="mt-4 grid gap-3">
              <InfoCard
                label="Home Base"
                icon="🏙️"
                value={
                  [preferences?.preferred_city, preferences?.preferred_state]
                    .filter(Boolean)
                    .join(', ') || 'Set your city'
                }
                accent={!preferences?.preferred_city}
              />

              <InfoCard
                label="Distance"
                icon="📍"
                value={`${preferences?.max_distance_miles || 25} miles`}
              />
            </div>
          </div>
        </div>
      </section>

      {query.saved ? (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-green-100">
          Preferences saved.
        </div>
      ) : null}

      <form action={saveEventPreferences} className="space-y-8">
        <Panel title="Home base" eyebrow="Where should we look first?">
          <p className="text-sm leading-6 text-white/65">
            This tells HypeKnight where to focus your discovery feed first.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Input
              name="preferred_city"
              label="Preferred City"
              placeholder="Kansas City"
              defaultValue={preferences?.preferred_city || ''}
            />

            <Input
              name="preferred_state"
              label="State"
              placeholder="MO"
              defaultValue={preferences?.preferred_state || ''}
            />

            <Input
              name="max_distance_miles"
              label="Max Distance"
              type="number"
              min="1"
              max="250"
              placeholder="25"
              defaultValue={preferences?.max_distance_miles || 25}
            />
          </div>
        </Panel>

        <PreferenceGroup
          title="Music"
          eyebrow="Sound"
          description="Choose the sounds that usually pull you out."
          name="music_genres"
          options={MUSIC_GENRES}
          selected={selectedGenres}
        />

        <PreferenceGroup
          title="Event types"
          eyebrow="Experiences"
          description="Choose the types of events you want surfaced first."
          name="event_types"
          options={EVENT_TYPES}
          selected={selectedTypes}
        />

        <PreferenceGroup
          title="Vibes"
          eyebrow="Energy"
          description="Choose the setting, mood, or experience you usually look for."
          name="vibe_tags"
          options={VIBE_TAGS}
          selected={selectedVibes}
        />

        <PreferenceGroup
          title="Budget"
          eyebrow="Price Comfort"
          description="Help HypeKnight understand what kind of cost range you usually prefer."
          name="budget_preferences"
          options={BUDGETS}
          selected={selectedBudgets}
        />

        <Panel title="Sources" eyebrow="Event Feed">
          <p className="text-sm leading-6 text-white/65">
            Choose whether you want only HypeKnight events or supplemental
            external events too.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <CheckCard
              name="preferred_sources"
              value="hypeknight"
              label="HypeKnight Events"
              text="Events posted directly through HypeKnight."
              defaultChecked={selectedSources.includes('hypeknight')}
            />

            <CheckCard
              name="preferred_sources"
              value="external"
              label="External Events"
              text="Supplemental listings from outside providers."
              defaultChecked={selectedSources.includes('external')}
            />
          </div>
        </Panel>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
          <SectionHeader
            eyebrow="Save"
            title="Ready to personalize your discovery?"
            text="These preferences can later power recommended events, weekend starter packs, city pulse, saved searches, and alerts."
          />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90 sm:w-auto"
            >
              Save Preferences
            </button>

            <Link
              href="/events"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-6 py-4 text-center text-white hover:border-accent/40 sm:w-auto"
            >
              Explore Events
            </Link>
          </div>
        </section>
      </form>
    </section>
  );
}

function PreferenceGroup({
  title,
  eyebrow,
  description,
  name,
  options,
  selected,
}: {
  title: string;
  eyebrow: string;
  description: string;
  name: string;
  options: string[];
  selected: string[];
}) {
  return (
    <Panel title={title} eyebrow={eyebrow}>
      <p className="text-sm leading-6 text-white/65">{description}</p>

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
    </Panel>
  );
}

function CheckCard({
  name,
  value,
  label,
  text,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  text?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white transition hover:border-accent/40">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 shrink-0"
      />

      <span>
        <span className="block font-semibold">{label}</span>
        {text ? <span className="mt-1 block text-sm text-white/50">{text}</span> : null}
      </span>
    </label>
  );
}

function Input({
  name,
  label,
  defaultValue = '',
  placeholder,
  type = 'text',
  min,
  max,
}: {
  name: string;
  label: string;
  defaultValue?: string | number;
  placeholder?: string;
  type?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/70">{label}</span>
      <input
        name={name}
        type={type}
        min={min}
        max={max}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />
    </label>
  );
}