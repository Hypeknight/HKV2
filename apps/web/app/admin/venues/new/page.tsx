import { redirect } from 'next/navigation';
import { createVenue } from '@/app/admin/actions';
import { getProfile } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export default async function NewVenuePage({
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
  const error = typeof params.error === 'string' ? params.error : null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold text-white">Create venue</h1>
        <p className="mt-2 text-sm text-white/60">Create a clean venue profile for the new platform.</p>
        {error ? <p className="mt-4 rounded-2xl bg-red-500/10 p-4 text-sm text-red-300">{error}</p> : null}
        <form action={createVenue} className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-white/70">Venue name</label>
            <input name="name" required />
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
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-white/70">Description</label>
            <textarea name="description" rows={5} />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Website URL</label>
            <input name="website_url" type="url" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Instagram URL</label>
            <input name="instagram_url" type="url" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Cover image URL</label>
            <input name="cover_image_url" type="url" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">Status</label>
            <select name="status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-white/10 p-4 text-sm text-white/70">
            <input type="checkbox" name="is_featured" className="h-4 w-4 rounded border-white/20 bg-white/5" />
            Mark as featured
          </label>
          <div className="md:col-span-2">
            <button className="rounded-full bg-accent px-6 py-3 font-semibold text-black">Save venue</button>
          </div>
        </form>
      </div>
    </section>
  );
}
