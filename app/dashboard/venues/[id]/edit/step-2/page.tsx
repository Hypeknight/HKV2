import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateVenueStep2 } from '@/app/dashboard/venues/actions';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VenueStep2Page({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, owner_id, name, slug, description, special_message, status')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (venueError || !venue) notFound();

  const { data: featureProfile } = await supabase
    .from('venue_feature_profiles')
    .select('*')
    .eq('venue_id', id)
    .maybeSingle();

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Create Venue</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Step 2: Venue Details</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Add the information HypeKnight uses to position users toward your venue.
        </p>
      </div>

      <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-white/50">Editing venue</p>
        <p className="mt-2 text-xl font-semibold text-white">{venue.name}</p>
        <p className="mt-2 text-sm text-white/60">Current status: {venue.status}</p>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <form action={updateVenueStep2} className="grid gap-6">
          <input type="hidden" name="venue_id" value={venue.id} />

          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-white">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              defaultValue={venue.description || ''}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
            />
          </div>

          <div>
            <label htmlFor="special_message" className="mb-2 block text-sm font-medium text-white">
              Special Message
            </label>
            <textarea
              id="special_message"
              name="special_message"
              rows={4}
              defaultValue={venue.special_message || ''}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
            />
          </div>

          <div>
            <label htmlFor="dress_code" className="mb-2 block text-sm font-medium text-white">
              Dress Code
            </label>
            <input
              id="dress_code"
              name="dress_code"
              type="text"
              defaultValue={featureProfile?.dress_code || ''}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
            />
          </div>

          <div>
            <label htmlFor="general_info" className="mb-2 block text-sm font-medium text-white">
              General Information
            </label>
            <textarea
              id="general_info"
              name="general_info"
              rows={4}
              defaultValue={featureProfile?.general_info || ''}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
            />
          </div>

          <div>
            <p className="mb-3 block text-sm font-medium text-white">Music Profile</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {['Hip-Hop', 'R&B', 'Afrobeats', 'House', 'EDM', 'Latin', 'Top 40', 'Trap', 'Dancehall'].map((genre) => (
                <label
                  key={genre}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                >
                  <input
                    type="checkbox"
                    name="music_profile"
                    value={genre}
                    defaultChecked={(featureProfile?.music_profile || []).includes(genre)}
                    className="h-4 w-4"
                  />
                  <span>{genre}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
              <input
                type="checkbox"
                name="drink_menu_enabled"
                value="yes"
                defaultChecked={featureProfile?.drink_menu_enabled || false}
                className="h-4 w-4"
              />
              <span>Enable drink menu</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
              <input
                type="checkbox"
                name="rsvp_enabled"
                value="yes"
                defaultChecked={featureProfile?.rsvp_enabled || false}
                className="h-4 w-4"
              />
              <span>Enable RSVP</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
              <input
                type="checkbox"
                name="table_service_enabled"
                value="yes"
                defaultChecked={featureProfile?.table_service_enabled || false}
                className="h-4 w-4"
              />
              <span>Offer table service</span>
            </label>
          </div>

          <div>
            <label htmlFor="drink_menu_notes" className="mb-2 block text-sm font-medium text-white">
              Drink Menu Notes
            </label>
            <textarea
              id="drink_menu_notes"
              name="drink_menu_notes"
              rows={4}
              defaultValue={featureProfile?.drink_menu_notes || ''}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
            />
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between">
            <Link
              href={`/dashboard/venues/${venue.id}/review`}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-white/20"
            >
              Back later from review
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Continue to Hours
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}