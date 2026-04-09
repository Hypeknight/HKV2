import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  approveVenueOwnerRequest,
  denyVenueOwnerRequest,
} from './actions';

export default async function AdminVenueOwnerRequestsPage() {
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

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const { data: requests, error } = await supabase
    .from('venue_owner_requests')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const pending = requests?.filter((r) => r.status === 'pending') ?? [];
  const reviewed = requests?.filter((r) => r.status !== 'pending') ?? [];

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Admin
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">
          Venue Owner Requests
        </h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Review requests from users asking to become venue owners.
        </p>
      </div>

      <div className="space-y-10">
        <AdminSection
          title="Pending Requests"
          subtitle="Requests waiting for approval or denial."
        >
          {pending.length ? (
            <div className="space-y-6">
              {pending.map((request) => (
                <RequestCard key={request.id} request={request} pending />
              ))}
            </div>
          ) : (
            <EmptyState text="No pending venue owner requests." />
          )}
        </AdminSection>

        <AdminSection
          title="Reviewed Requests"
          subtitle="Previously approved or denied requests."
        >
          {reviewed.length ? (
            <div className="space-y-6">
              {reviewed.map((request) => (
                <RequestCard key={request.id} request={request} pending={false} />
              ))}
            </div>
          ) : (
            <EmptyState text="No reviewed requests yet." />
          )}
        </AdminSection>
      </div>
    </section>
  );

  function RequestCard({
    request,
    pending,
  }: {
    request: any;
    pending: boolean;
  }) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {request.venue_business_name}
            </h2>
            <p className="mt-2 text-white/65">
              {request.legal_name} · {request.role_title}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Business Email" value={request.business_email} />
              <Info label="Business Phone" value={request.business_phone} />
              <Info label="City / State" value={`${request.city}, ${request.state}`} />
              <Info label="Status" value={request.status} />
              <Info label="Website / Social" value={request.website_or_social} />
              <Info
                label="Submitted"
                value={new Date(request.created_at).toLocaleString()}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                Summary
              </p>
              <p className="mt-2 whitespace-pre-wrap text-white">
                {request.summary || '—'}
              </p>
            </div>

            {!pending && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                  Admin Notes
                </p>
                <p className="mt-2 whitespace-pre-wrap text-white">
                  {request.admin_notes || '—'}
                </p>
              </div>
            )}
          </div>

          {pending ? (
            <div className="space-y-4">
              <form action={approveVenueOwnerRequest}>
                <input type="hidden" name="request_id" value={request.id} />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
                >
                  Approve Request
                </button>
              </form>

              <form action={denyVenueOwnerRequest} className="space-y-3">
                <input type="hidden" name="request_id" value={request.id} />
                <textarea
                  name="admin_notes"
                  rows={4}
                  placeholder="Reason for denial"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 font-semibold text-red-300 hover:border-red-500/40"
                >
                  Deny Request
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70">
              This request has already been reviewed.
            </div>
          )}
        </div>
      </div>
    );
  }
}

function AdminSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-white/65">{subtitle}</p>
      </div>
      {children}
    </div>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
      {text}
    </div>
  );
}