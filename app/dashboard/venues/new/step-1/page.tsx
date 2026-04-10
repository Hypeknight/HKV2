import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createVenueStep1 } from '@/app/dashboard/venues/actions';

export default async function NewVenueStep1Page() {
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

  if (!['venue_owner', 'admin'].includes(profile?.app_role || '')) {
    redirect('/dashboard');
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Create Venue
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">Step 1: Basic Venue Info</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Start your venue as a draft. It will not go public until payment activates
          the subscription and visibility is enabled.
        </p>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <form action={createVenueStep1} className="grid gap-6">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-white">
              Venue Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
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
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label htmlFor="state" className="mb-2 block text-sm font-medium text-white">
                State
              </label>
              <select
                id="state"
                name="state"
                required
                defaultValue=""
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              >
                <option value="" disabled>Select a state</option>
                {[
                  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
                  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
                  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
                  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
                  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
                  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
                  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
                  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
                  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
                  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
                  ['DC','District of Columbia'],
                ].map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
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
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <label className="flex items-start gap-3 text-white">
              <input type="checkbox" name="is_visible" value="yes" className="mt-1" />
              <span className="text-sm text-white/80">
                Make this venue visible when it becomes active. You can change this later.
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-white/20"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Continue to Step 2
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}