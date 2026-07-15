import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLookupMap } from '@/lib/config/lookups';
import { saveEventPreferences } from './actions';
import { Chip, InfoCard, Panel, SectionHeader } from '@/components/ui';

import HomeLocationSection from '@/components/preferences/HomeLocationSection';
import LookupPreferencesSection from '@/components/preferences/LookupPreferencesSection';
import BudgetPreferencesSection from '@/components/preferences/BudgetPreferencesSection';
import NotificationPreferencesSection from '@/components/preferences/NotificationPreferencesSection';
import EventSourcesSection from '@/components/preferences/EventSourcesSection';
import HiddenPreferencesSection from '@/components/preferences/HiddenPreferencesSection';
import PreferredDaysSection from '@/components/preferences/PreferredDaysSection';
import PreferredTimesSection from '@/components/preferences/PreferredTimesSection';

type Props = {
  searchParams?: Promise<{
    saved?: string;
  }>;
};

export default async function EventPreferencesPage({
  searchParams,
}: Props) {
  const query = searchParams ? await searchParams : {};

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    redirect('/auth/login');
  }

  const [{ data: preferences, error: preferencesError }, lookups] =
    await Promise.all([
      supabase
        .from('user_event_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),

      getLookupMap([
        'music_genres',
        'event_types',
        'vibe_tags',
        'event_amenities',
      ]),
    ]);

  if (preferencesError) {
    throw new Error(preferencesError.message);
  }

  const selectedGenres = arrayValue(
    preferences?.music_genres
  );

  const selectedTypes = arrayValue(
    preferences?.event_types
  );

  const selectedVibes = arrayValue(
    preferences?.vibe_tags
  );

  const selectedAmenities = arrayValue(
    preferences?.amenity_preferences
  );

  const selectedHidden = arrayValue(
    preferences?.hidden_preferences
  );

  const selectedDays = arrayValue(
    preferences?.preferred_days
  );

  const selectedTimes = arrayValue(
    preferences?.preferred_times
  );

  const selectedNotifications = arrayValue(
    preferences?.notification_preferences
  );

  const storedSources = arrayValue(
    preferences?.preferred_sources
  );

  const selectedSources = storedSources.length
    ? storedSources
    : ['hypeknight', 'external'];

  const lookupPreferenceCount =
    selectedGenres.length +
    selectedTypes.length +
    selectedVibes.length +
    selectedAmenities.length;

  const lifestylePreferenceCount =
    selectedHidden.length +
    selectedDays.length +
    selectedTimes.length +
    selectedNotifications.length;

  const totalPreferenceCount =
    lookupPreferenceCount + lifestylePreferenceCount;

  const cityLabel =
    [
      preferences?.preferred_city,
      preferences?.preferred_state,
    ]
      .filter(Boolean)
      .join(', ') || 'Set your home area';

  const maxDistanceMiles =
    Number(preferences?.max_distance_miles) || 25;

  const maxCoverPrice = Number(
    preferences?.max_cover_price ?? 50
  );

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/dashboard"
        className="text-sm text-white/60 hover:text-accent"
      >
        ← Back to Dashboard
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Your Nightlife Profile
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-6xl">
              Teach HypeKnight what fits your night.
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Choose your city, music, event types, vibes,
              amenities, budget, preferred days, times, and
              notifications. These signals can power better
              recommendations throughout HypeKnight.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Chip>
                {totalPreferenceCount} preferences selected
              </Chip>

              <Chip>
                {selectedSources.length} event sources enabled
              </Chip>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Discovery Profile
            </p>

            <div className="mt-5 grid gap-3">
              <InfoCard
                label="Home Area"
                icon="🏙️"
                value={cityLabel}
                accent={!preferences?.preferred_city}
              />

              <InfoCard
                label="Travel Radius"
                icon="📍"
                value={`${maxDistanceMiles} miles`}
              />

              <InfoCard
                label="Max Cover"
                icon="💵"
                value={`$${maxCoverPrice.toFixed(2)}`}
              />
            </div>
          </div>
        </div>
      </section>

      {query.saved ? (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-green-100">
          Your nightlife profile has been saved.
        </div>
      ) : null}

      <form
        action={saveEventPreferences}
        className="space-y-8"
      >
        <Panel
          title="Home area"
          eyebrow="Local Discovery"
        >
          <HomeLocationSection
            preferredCity={preferences?.preferred_city}
            preferredState={preferences?.preferred_state}
            maxDistanceMiles={
              preferences?.max_distance_miles
            }
          />
        </Panel>

        <Panel title="Music" eyebrow="Your Sound">
          <LookupPreferencesSection
            title="Music Preferences"
            description="Choose the sounds that are most likely to pull you out."
            name="music_genres"
            options={lookups.music_genres ?? []}
            selected={selectedGenres}
          />
        </Panel>

        <Panel
          title="Event types"
          eyebrow="Experiences"
        >
          <LookupPreferencesSection
            title="Event Type Preferences"
            description="Choose the kinds of events you want HypeKnight to surface first."
            name="event_types"
            options={lookups.event_types ?? []}
            selected={selectedTypes}
          />
        </Panel>

        <Panel
          title="Preferred vibes"
          eyebrow="Energy"
        >
          <LookupPreferencesSection
            title="Vibe Preferences"
            description="Choose the atmosphere, setting, and energy you usually look for."
            name="vibe_tags"
            options={lookups.vibe_tags ?? []}
            selected={selectedVibes}
          />
        </Panel>

        <Panel
          title="Amenities"
          eyebrow="What Matters to You"
        >
          <LookupPreferencesSection
            title="Amenity Preferences"
            description="Choose features that can make an event or venue more appealing."
            name="amenity_preferences"
            options={lookups.event_amenities ?? []}
            selected={selectedAmenities}
          />
        </Panel>

        <Panel
          title="Budget"
          eyebrow="Price Comfort"
        >
          <BudgetPreferencesSection
            maxCoverPrice={preferences?.max_cover_price}
          />
        </Panel>

        <Panel
          title="Preferred days"
          eyebrow="Your Schedule"
        >
          <PreferredDaysSection
            selected={selectedDays}
          />
        </Panel>

        <Panel
          title="Preferred times"
          eyebrow="When You Go Out"
        >
          <PreferredTimesSection
            selected={selectedTimes}
          />
        </Panel>

        <Panel
          title="Things to hide"
          eyebrow="Reduce Noise"
        >
          <HiddenPreferencesSection
            selected={selectedHidden}
          />
        </Panel>

        <Panel
          title="Notifications"
          eyebrow="Stay in the Loop"
        >
          <NotificationPreferencesSection
            selected={selectedNotifications}
          />
        </Panel>

        <Panel
          title="Event sources"
          eyebrow="Discovery Feed"
        >
          <EventSourcesSection
            selected={selectedSources}
          />
        </Panel>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
          <SectionHeader
            eyebrow="Save"
            title="Build your HypeKnight experience."
            text="These preferences can support personalized discovery, nearby recommendations, weekend starter packs, alerts, and future City Pulse features."
          />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90 sm:w-auto"
            >
              Save Nightlife Profile
            </button>

            <Link
              href="/events"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-6 py-4 text-center font-semibold text-white hover:border-accent/40 sm:w-auto"
            >
              Explore Events
            </Link>
          </div>
        </section>
      </form>
    </section>
  );
}

function arrayValue(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(String)
    .map((item) => item.trim())
    .filter(Boolean);
}