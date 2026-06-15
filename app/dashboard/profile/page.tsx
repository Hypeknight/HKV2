import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateProfile } from './actions';

export default async function DashboardProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (
    <section className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/dashboard" className="text-sm text-white/60 hover:text-accent">
        ← Back to Dashboard
      </Link>

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Profile Settings
        </p>

        <h1 className="mt-3 text-4xl font-bold text-white">
          Edit Your HypeKnight Profile
        </h1>

        <p className="mt-3 max-w-3xl text-white/70">
          Keep your basic profile, contact, location, and social information up to date.
          Role access is managed separately by HypeKnight approval.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Chip label={`Role: ${profile?.app_role || 'user'}`} />
          <Chip label={user.email || 'No email'} />
        </div>
      </section>

      <form
        action={updateProfile}
        className="space-y-8 rounded-[2.75rem] border border-white/10 bg-white/5 p-8"
      >
        <FormSection title="Basic Profile">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="display_name"
              label="Display Name"
              required
              defaultValue={profile?.display_name || ''}
            />

            <Input
              name="username"
              label="Username"
              defaultValue={profile?.username || ''}
            />
          </div>

          <label className="mt-4 block">
            <span className="text-sm text-white/60">Bio</span>
            <textarea
              name="bio"
              rows={4}
              defaultValue={profile?.bio || ''}
              placeholder="Tell people a little about your HypeKnight profile..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />
          </label>
        </FormSection>

        <FormSection title="Contact Information">
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyInput label="Account Email" value={user.email || ''} />

            <Input
              name="phone"
              label="Phone Number"
              defaultValue={profile?.phone || ''}
            />
          </div>
        </FormSection>

        <FormSection title="Location">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="city"
              label="City"
              defaultValue={profile?.city || ''}
            />

            <Input
              name="state"
              label="State"
              defaultValue={profile?.state || ''}
            />
          </div>
        </FormSection>

        <FormSection title="Social / Web Links">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="instagram_url"
              label="Instagram URL / Handle"
              defaultValue={profile?.instagram_url || ''}
            />

            <Input
              name="facebook_url"
              label="Facebook URL / Handle"
              defaultValue={profile?.facebook_url || ''}
            />

            <Input
              name="tiktok_url"
              label="TikTok URL / Handle"
              defaultValue={profile?.tiktok_url || ''}
            />

            <Input
              name="website_url"
              label="Website / Other Link"
              defaultValue={profile?.website_url || ''}
            />
          </div>
        </FormSection>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/65">
          Your profile controls basic account information. Ambassador, admin, DJ,
          venue owner, and other HypeKnight role permissions are granted by HypeKnight
          approval and cannot be self-assigned here.
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90"
        >
          Save Profile
        </button>
      </form>
    </section>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Input({
  name,
  label,
  defaultValue = '',
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm text-white/60">{label}</span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />
    </label>
  );
}

function ReadOnlyInput({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-sm text-white/60">{label}</span>
      <input
        value={value}
        readOnly
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white/50 outline-none"
      />
    </label>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/65">
      {label}
    </span>
  );
}