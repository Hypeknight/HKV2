import { redirect } from 'next/navigation';
import { createEvent } from '@/app/admin/actions';
import { getOwnedVenues, getProfile } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export default async function NewEventPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const profile = await getProfile();
  if (!profile || !['admin', 'venue_owner'].includes(profile.app_role)) redirect('/dashboard');

  const venues = await getOwnedVenues(user.id);
  const error = typeof params.error === 'string' ? params.error : null;

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold text-white">Create event</h1>
        <p className="mt-2 text-sm text-white/60">Build a cleaner event flow than the old system and publish only when ready.</p>
        {error ? <p className="mt-4 rounded-2xl bg-red-500/10 p-4 text-sm text-red-300">{error}</p> : null}
        <form action={createEvent} className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-white/70">Event name</label>
            <input name="name" required />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Venue</label>
            <select name="venue_id" required>
              <option value="">Select a venue</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Status</label>
            <select name="status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">City</label>
            <input name="city" required />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">State</label>
            <input name="state" required />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-white/70">Address</label>
            <input name="address" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Start time</label>
            <input name="start_at" type="datetime-local" required />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">End time</label>
            <input name="end_at" type="datetime-local" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Minimum price</label>
            <input name="price_min" type="number" min="0" step="0.01" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Maximum price</label>
            <input name="price_max" type="number" min="0" step="0.01" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Age requirement</label>
            <input name="age_requirement" placeholder="21+" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Vibe level (1-10)</label>
            <input name="vibe_level" type="number" min="1" max="10" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Ticket URL</label>
            <input name="ticket_url" type="url" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Cover image URL</label>
            <input name="cover_image_url" type="url" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Visibility</label>
            <select name="visibility" defaultValue="public">
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-white/70">Excerpt</label>
            <textarea name="excerpt" rows={3} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-white/70">Description</label>
            <textarea name="description" rows={6} />
          </div>
          <div className="md:col-span-2">
            <button className="rounded-full bg-accent px-6 py-3 font-semibold text-black">Save event</button>
          </div>
        </form>
      </div>
    </section>
  );
}
