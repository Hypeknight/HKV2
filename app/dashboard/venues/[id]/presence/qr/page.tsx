import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VenuePresenceQrPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.app_role === 'admin';

  const venueQuery = supabase.from('venues').select('*').eq('id', id);
  const { data: venue, error: venueError } = isAdmin
    ? await venueQuery.single()
    : await venueQuery.eq('owner_id', user.id).single();

  if (venueError || !venue) notFound();

  const { data: session } = await supabase
    .from('venue_presence_sessions')
    .select('*')
    .eq('venue_id', id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (!session) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h1 className="text-3xl font-bold text-white">No Active Presence Session</h1>
          <p className="mt-3 text-white/70">
            Start a presence session first before generating a QR page.
          </p>
          <div className="mt-6">
            <Link
              href={`/dashboard/venues/${venue.id}/presence`}
              className="inline-flex rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
            >
              Back to Presence
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const joinUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/venues/${venue.slug}?session=${session.session_code}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(joinUrl)}`;

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Presence QR</p>
        <h1 className="mt-3 text-4xl font-bold text-white">{venue.name}</h1>
        <p className="mt-3 text-white/70">
          Scan to join the live venue presence session.
        </p>

        <div className="mt-8 flex justify-center">
          <div className="rounded-[2rem] border border-white/10 bg-white p-4">
            <img src={qrImageUrl} alt="Venue Presence QR" className="h-80 w-80" />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-left text-white">
          <p><span className="font-semibold">Session code:</span> {session.session_code}</p>
          <p className="mt-2 break-all">
            <span className="font-semibold">Join URL:</span> {joinUrl}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={`/dashboard/venues/${venue.id}/presence`}
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
          >
            Back to Presence
          </Link>
        </div>
      </div>
    </section>
  );
}