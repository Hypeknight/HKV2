import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { reviewDjRequest, assignDjToVenue } from '@/app/admin/djs/actions';

export default async function AdminDjsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') redirect('/dashboard');

  const { data: requests } = await supabase
    .from('dj_role_requests')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: djProfiles } = await supabase
    .from('profiles')
    .select('id, display_name, email, app_role')
    .eq('app_role', 'dj')
    .order('display_name', { ascending: true });

  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, city, state')
    .order('name', { ascending: true });

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Admin</p>
        <h1 className="mt-3 text-4xl font-bold text-white">DJ Requests + Assignments</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">DJ Role Requests</h2>

          <div className="mt-6 space-y-4">
            {requests?.length ? (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <p className="text-lg font-semibold text-white">
                    {request.stage_name || request.legal_name || request.user_id}
                  </p>
                  <p className="mt-1 text-sm text-white/60">Status: {request.status}</p>
                  <p className="mt-1 text-sm text-white/60">User: {request.user_id}</p>
                  {request.bio ? <p className="mt-3 text-sm text-white/75">{request.bio}</p> : null}
                  {request.experience_notes ? (
                    <p className="mt-2 text-sm text-white/70">{request.experience_notes}</p>
                  ) : null}

                  <form action={reviewDjRequest} className="mt-4 space-y-3">
                    <input type="hidden" name="request_id" value={request.id} />
                    <input type="hidden" name="user_id" value={request.user_id} />

                    <select
                      name="status"
                      defaultValue={request.status}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                    >
                      <option value="pending">pending</option>
                      <option value="approved">approved</option>
                      <option value="denied">denied</option>
                    </select>

                    <textarea
                      name="review_notes"
                      rows={3}
                      defaultValue={request.review_notes || ''}
                      placeholder="Review notes"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                    />

                    <button
                      type="submit"
                      className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
                    >
                      Save Review
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p className="text-white/70">No DJ requests yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Assign DJ to Venue</h2>

          <form action={assignDjToVenue} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white">DJ</label>
              <select
                name="dj_user_id"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              >
                {djProfiles?.map((dj) => (
                  <option key={dj.id} value={dj.id}>
                    {dj.display_name || dj.email || dj.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">Venue</label>
              <select
                name="venue_id"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              >
                {venues?.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} — {venue.city}, {venue.state}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">Notes</label>
              <textarea
                name="notes"
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              />
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              Assign DJ
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}