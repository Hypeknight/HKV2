import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { submitDjRequest } from '@/app/dashboard/dj/actions';

export default async function DjRequestPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: existing } = await supabase
    .from('dj_role_requests')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">DJ Access</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Request DJ Role</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Apply for DJ access so you can manage assigned music queues and live DJ tools.
        </p>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <form action={submitDjRequest} className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Input label="Stage Name" name="stage_name" defaultValue={existing?.stage_name} />
            <Input label="Legal Name" name="legal_name" defaultValue={existing?.legal_name} />
            <Input label="Phone" name="phone" defaultValue={existing?.phone} />
            <Input label="City" name="city" defaultValue={existing?.city} />
            <Input label="State" name="state" defaultValue={existing?.state} />
            <Input label="Instagram URL" name="instagram_url" defaultValue={existing?.instagram_url} />
            <Input label="Website URL" name="website_url" defaultValue={existing?.website_url} />
          </div>

          <Textarea label="Bio" name="bio" rows={4} defaultValue={existing?.bio} />
          <Textarea
            label="Experience Notes"
            name="experience_notes"
            rows={5}
            defaultValue={existing?.experience_notes}
          />

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
            Current status: <span className="font-semibold text-white">{existing?.status || 'not submitted'}</span>
          </div>

          <button
            type="submit"
            className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
          >
            Submit DJ Request
          </button>
        </form>
      </div>
    </section>
  );
}

function Input({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-white">{label}</label>
      <input
        name={name}
        type="text"
        defaultValue={defaultValue || ''}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
      />
    </div>
  );
}

function Textarea({
  label,
  name,
  rows,
  defaultValue,
}: {
  label: string;
  name: string;
  rows: number;
  defaultValue?: string | null;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-white">{label}</label>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue || ''}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
      />
    </div>
  );
}