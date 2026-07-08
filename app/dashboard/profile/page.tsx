import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateProfile } from './actions';
import { Chip, InfoCard, Panel, SectionHeader } from '@/components/ui';

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

  const checklist = [
    { label: 'Display name', complete: Boolean(profile?.display_name) },
    { label: 'City', complete: Boolean(profile?.city) },
    { label: 'State', complete: Boolean(profile?.state) },
    { label: 'Bio', complete: Boolean(profile?.bio) },
  ];

  const completed = checklist.filter((item) => item.complete).length;
  const percent = Math.round((completed / checklist.length) * 100);

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <Link href="/dashboard" className="text-sm text-white/60 hover:text-accent">
        ← Back to Dashboard
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Profile Setup
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-6xl">
              Make HypeKnight feel like yours.
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Add your public identity, location, and social links so HypeKnight
              can personalize your experience and unlock the right tools around
              your city.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Chip>Role: {profile?.app_role || 'user'}</Chip>
              <Chip>{user.email || 'No email'}</Chip>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Profile Progress
            </p>

            <p className="mt-3 text-5xl font-black text-white">{percent}%</p>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${percent}%` }}
              />
            </div>

            <p className="mt-3 text-sm text-white/55">
              {completed} of {checklist.length} basics complete.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {checklist.map((item) => (
          <InfoCard
            key={item.label}
            label={item.label}
            icon={item.complete ? '✅' : '•'}
            value={item.complete ? 'Complete' : 'Needs update'}
            accent={!item.complete}
          />
        ))}
      </section>

      <form action={updateProfile} className="space-y-8">
        <Panel title="Basic profile" eyebrow="Public Identity">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="display_name"
              label="Display Name"
              helper="This is the name people will recognize."
              required
              defaultValue={profile?.display_name || ''}
            />

            <Input
              name="username"
              label="Username"
              helper="Optional handle for future profile features."
              defaultValue={profile?.username || ''}
            />
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-white/70">Bio</span>
            <textarea
              name="bio"
              rows={5}
              defaultValue={profile?.bio || ''}
              placeholder="Example: KC nightlife explorer, music lover, weekend event hunter..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />
            <span className="mt-2 block text-xs text-white/45">
              Keep it simple. This can later help personalize your HypeKnight profile.
            </span>
          </label>
        </Panel>

        <Panel title="Contact information" eyebrow="Account">
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyInput label="Account Email" value={user.email || ''} />

            <Input
              name="phone"
              label="Phone Number"
              helper="Optional. Useful for future event owner, venue, or ambassador tools."
              defaultValue={profile?.phone || ''}
            />
          </div>
        </Panel>

        <Panel title="Home location" eyebrow="Local Discovery">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="city"
              label="City"
              helper="Example: Kansas City, St. Louis, Houston"
              defaultValue={profile?.city || ''}
            />

            <Input
              name="state"
              label="State"
              helper="Use two letters when possible, like MO, KS, TX."
              defaultValue={profile?.state || ''}
            />
          </div>

          <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/10 p-5 text-sm leading-6 text-white/75">
            Your city helps HypeKnight show better local discovery, nearby event
            energy, and future recommendations.
          </div>
        </Panel>

        <Panel title="Social and web links" eyebrow="Optional">
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
        </Panel>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
          <SectionHeader
            eyebrow="Save Changes"
            title="Ready to update your profile?"
            text="Role access is managed separately by HypeKnight approval. You cannot self-assign admin, ambassador, DJ, or venue owner permissions here."
          />

          <button
            type="submit"
            className="mt-6 w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90"
          >
            Save Profile
          </button>
        </section>
      </form>
    </section>
  );
}

function Input({
  name,
  label,
  defaultValue = '',
  required = false,
  helper,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/70">{label}</span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />
      {helper ? (
        <span className="mt-2 block text-xs leading-5 text-white/45">{helper}</span>
      ) : null}
    </label>
  );
}

function ReadOnlyInput({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/70">{label}</span>
      <input
        value={value}
        readOnly
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white/50 outline-none"
      />
    </label>
  );
}