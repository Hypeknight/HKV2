import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function AmbassadorsLandingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const applyHref = user ? '/dashboard/ambassador/apply' : '/auth/register';

  return (
    <section className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-[3rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-10">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          HypeKnight Ambassador Program
        </p>

        <h1 className="mt-4 max-w-4xl text-5xl font-black text-white sm:text-7xl">
          Help move the nightlife. Earn with HypeKnight.
        </h1>

        <p className="mt-6 max-w-3xl text-lg text-white/70">
          Ambassadors help introduce promoters, venues, DJs, creators, and nightlife
          communities to HypeKnight. Approved ambassadors can request personal coupon
          codes and track eligible commission through their dashboard.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={applyHref}
            className="rounded-2xl bg-accent px-6 py-3 text-center font-semibold text-black hover:opacity-90"
          >
            Apply to Become an Ambassador
          </Link>

          <Link
            href="/events"
            className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-center text-white hover:border-accent/40"
          >
            Explore HypeKnight
          </Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <InfoCard
          title="Apply"
          text="Create a regular HypeKnight profile first, then request ambassador access from your dashboard."
        />
        <InfoCard
          title="Get Approved"
          text="HypeKnight reviews every ambassador before granting access to coupon tools."
        />
        <InfoCard
          title="Promote & Track"
          text="Approved ambassadors can request coupon codes, track referred events, cities, sales, and eligible commission."
        />
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-3xl font-bold text-white">How commission works</h2>
        <p className="mt-4 max-w-3xl text-white/70">
          Coupon usage alone does not create payable commission. Commission becomes
          eligible only when the referred event completes the full HypeKnight promotion
          pipeline without refund, removal, or chargeback.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric label="Discount Range" value="20–70%" />
          <Metric label="Split After Profit" value="70 / 30" />
          <Metric label="Approval Required" value="Yes" />
        </div>
      </section>
    </section>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-4 text-white/65">{text}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}