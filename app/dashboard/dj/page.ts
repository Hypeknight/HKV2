import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DjDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role, display_name, email')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'dj') redirect('/dashboard');

  const { data: assignments } = await supabase
    .from('venue_dj_assignments')
    .select(`
      *,
      venue:venues(id, name, slug, city, state)
    `)
    .eq('dj_user_id', user.id)
    .eq('status', 'active')
    .order('assigned_at', { ascending: false });

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">DJ Dashboard</p>
        <h1 className="mt-3 text-4xl font-bold text-white">
          {profile?.display_name || profile?.email || 'DJ'}
        </h1>
        <p className="mt-3 text-white/70">
          Manage your assigned venue queues and live request flow.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {assignments?.length ? (
          assignments.map((assignment) => {
            const venue = Array.isArray(assignment.venue)
              ? assignment.venue[0]
              : assignment.venue;

            return (
              <div
                key={assignment.id}
                className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-accent">Assigned Venue</p>
                <h2 className="mt-3 text-2xl font-bold text-white">{venue?.name}</h2>
                <p className="mt-2 text-white/65">
                  {venue?.city}, {venue?.state}
                </p>

                <div className="mt-6 space-y-3">
                  <Link
                    href={`/dashboard/venues/${venue?.id}/music-requests`}
                    className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-white hover:border-accent/40"
                  >
                    Open Music Queue
                  </Link>

                  <Link
                    href={`/venues/${venue?.slug}`}
                    className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-white hover:border-accent/40"
                  >
                    View Venue Page
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-white/70">
            No active DJ venue assignments yet.
          </div>
        )}
      </div>
    </section>
  );
}