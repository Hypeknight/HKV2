import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateStripeMode } from './actions';

export default async function AdminPaymentsPage() {
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

  const { data: settings } = await supabase
    .from('payment_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Admin Payments</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Stripe Control</h1>
        <p className="mt-3 text-white/70">
          Choose whether the site uses Stripe test mode or live mode.
        </p>

        <form action={updateStripeMode} className="mt-8 space-y-4">
          <select
            name="stripe_mode"
            defaultValue={settings?.stripe_mode || 'test'}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
          >
            <option value="test">Sandbox / Test</option>
            <option value="live">Live</option>
          </select>

          <button
            type="submit"
            className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
          >
            Save Stripe Mode
          </button>
        </form>
      </div>
    </section>
  );
}