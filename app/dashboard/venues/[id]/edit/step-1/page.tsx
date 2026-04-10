import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateVenueStep1 } from '@/app/dashboard/venues/actions';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditVenueStep1Page({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: venue, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error || !venue) notFound();

  if (!['draft', 'pending_payment', 'hidden'].includes(venue.status)) {
    redirect('/dashboard/venues');
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Edit Venue</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Step 1: Basic Venue Info</h1>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <form action={updateVenueStep1} className="grid gap-6">
          <input type="hidden" name="venue_id" value={venue.id} />

          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-white">
              Venue Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={venue.name || ''}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
            />
          </div>

          <div>
            <label htmlFor="address" className="mb-2 block text-sm font-medium text-white">
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              defaultValue={venue.address || ''}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="city" className="mb-2 block text-sm font-medium text-white">
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                required
                defaultValue={venue.city || ''}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label htmlFor="state" className="mb-2 block text-sm font-medium text-white">
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                required
                defaultValue={venue.state || ''}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="website_url" className="mb-2 block text-sm font-medium text-white">
                Website URL
              </label>
              <input
                id="website_url"
                name="website_url"
                type="url"
                defaultValue={venue.website_url || ''}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label htmlFor="instagram_url" className="mb-2 block text-sm font-medium text-white">
                Instagram URL
              </label>
              <input
                id="instagram_url"
                name="instagram_url"
                type="url"
                defaultValue={venue.instagram_url || ''}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cover_image_url" className="mb-2 block text-sm font-medium text-white">
              Cover Image URL
            </label>
            <input
              id="cover_image_url"
              name="cover_image_url"
              type="url"
              defaultValue={venue.cover_image_url || ''}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
            <input
              type="checkbox"
              name="is_visible"
              value="yes"
              defaultChecked={venue.is_visible || false}
              className="mt-1"
            />
            <span className="text-sm text-white/80">
              Make this venue visible when active
            </span>
          </label>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between">
            <Link
              href={`/dashboard/venues/${venue.id}/review`}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-white/20"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Save Step 1
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}