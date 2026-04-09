import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { submitVenueOwnerRequest } from './actions';

export default async function VenueOwnerRequestPage() {
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

  if (profile?.app_role === 'venue_owner' || profile?.app_role === 'admin') {
    redirect('/dashboard');
  }

  const { data: existingRequests } = await supabase
    .from('venue_owner_requests')
    .select(`
      id,
      status,
      created_at,
      reviewed_at,
      admin_notes
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const latestRequest = existingRequests?.[0] ?? null;

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Dashboard
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">
          Request Venue Owner Access
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Submit this request if you want to create and manage venue listings on
          HypeKnight.
        </p>
      </div>

      {latestRequest && (
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold text-white">Latest Request</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Info label="Status" value={latestRequest.status} />
            <Info
              label="Submitted"
              value={new Date(latestRequest.created_at).toLocaleString()}
            />
            <Info
              label="Reviewed"
              value={
                latestRequest.reviewed_at
                  ? new Date(latestRequest.reviewed_at).toLocaleString()
                  : 'Not reviewed yet'
              }
            />
            <Info label="Admin Notes" value={latestRequest.admin_notes || '—'} />
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <form action={submitVenueOwnerRequest} className="grid gap-6">
            <div>
              <label htmlFor="legal_name" className="mb-2 block text-sm font-medium text-white">
                Legal Name
              </label>
              <input
                id="legal_name"
                name="legal_name"
                type="text"
                required
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label
                htmlFor="venue_business_name"
                className="mb-2 block text-sm font-medium text-white"
              >
                Venue / Business Name
              </label>
              <input
                id="venue_business_name"
                name="venue_business_name"
                type="text"
                required
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label htmlFor="role_title" className="mb-2 block text-sm font-medium text-white">
                Your Role / Title
              </label>
              <input
                id="role_title"
                name="role_title"
                type="text"
                required
                placeholder="Owner, Manager, Booking Manager, etc."
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="business_email"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Business Email
                </label>
                <input
                  id="business_email"
                  name="business_email"
                  type="email"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
                />
              </div>

              <div>
                <label
                  htmlFor="business_phone"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Business Phone
                </label>
                <input
                  id="business_phone"
                  name="business_phone"
                  type="text"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
                />
              </div>
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
                  <option value="" disabled>
                    Select a state
                  </option>
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
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="website_or_social"
                className="mb-2 block text-sm font-medium text-white"
              >
                Website or Social Link
              </label>
              <input
                id="website_or_social"
                name="website_or_social"
                type="text"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label htmlFor="summary" className="mb-2 block text-sm font-medium text-white">
                Short Summary
              </label>
              <textarea
                id="summary"
                name="summary"
                rows={5}
                placeholder="Tell HypeKnight about your venue or your relationship to it."
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <label className="flex items-start gap-3 text-white">
                <input
                  type="checkbox"
                  name="acknowledgement_accepted"
                  value="yes"
                  className="mt-1"
                  required
                />
                <span className="text-sm text-white/80">
                  I confirm I have authority to represent this venue or business on
                  HypeKnight. I understand venue owner access is subject to admin approval.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Submit Request
            </button>
          </form>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">What Happens Next</h2>
          <div className="mt-6 space-y-4 text-white/75">
            <p>1. Your request is reviewed by HypeKnight admin.</p>
            <p>2. If approved, your account role is changed to venue owner.</p>
            <p>3. You can then create a draft venue profile.</p>
            <p>4. Venue profiles remain drafts until payment activates the listing.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
    </div>
  );
}