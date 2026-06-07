import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DiscoveryEventCard from '@/components/events/DiscoveryEventCard';
import { getRecommendedEventsForUser } from '@/lib/discovery/recommend-events';

export default async function RecommendedEventsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { preferences, recommendations } = await getRecommendedEventsForUser(
    user.id
  );

  const topRecommendations = recommendations.slice(0, 24);

  return (
    <section className="space-y-10">
      <div className="rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-10">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Personalized Discovery
        </p>

        <h1 className="mt-3 text-5xl font-black text-white">
          Recommended For You
        </h1>

        <p className="mt-4 max-w-3xl text-white/70">
          Events ranked by your city, music, event types, vibes, timing, and
          source preferences.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard/preferences"
            className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
          >
            Update Preferences
          </Link>

          <Link
            href="/events"
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
          >
            Browse All Events
          </Link>
        </div>
      </div>

      {!preferences?.onboarding_completed ? (
        <div className="rounded-[2rem] border border-yellow-500/20 bg-yellow-500/10 p-6 text-yellow-100">
          Your recommendations will improve after you complete your event
          preferences.
        </div>
      ) : null}

      {topRecommendations.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {topRecommendations.map(({ event, score }, index) => (
            <div key={`${event.source_label}-${event.id}`} className="space-y-3">
              <DiscoveryEventCard event={event} featured={index < 3} />
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55">
                Match score: {score}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/70">
          No recommendations are available yet. Try updating your preferences or
          browsing all events.
        </div>
      )}
    </section>
  );
}