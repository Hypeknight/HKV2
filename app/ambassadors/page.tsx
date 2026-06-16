import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function AmbassadorsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const applyHref = user ? '/dashboard/ambassador/apply' : '/auth/sign-up';

  return (
    <section className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-[3rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-10">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          HypeKnight Ambassador Program
        </p>

        <h1 className="mt-4 max-w-5xl text-5xl font-black text-white sm:text-7xl">
          Help HypeKnight build the nightlife network.
        </h1>

        <p className="mt-6 max-w-3xl text-lg text-white/75">
          HypeKnight is looking for a starting group of 50 ambassadors across
          the continental United States. This first group will help introduce
          promoters, venues, DJs, creators, and nightlife communities to the
          platform.
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
        <Metric label="Starting Group" value="50" text="Ambassadors wanted across the continental U.S." />
        <Metric label="Coupon Range" value="20–70%" text="Approved ambassadors can request custom discounts." />
        <Metric label="Profit Split" value="30%" text="Ambassadors earn 30% of profit from eligible code sales." />
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-3xl font-bold text-white">How the program works</h2>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Step
            title="1. Apply"
            text="Create a regular HypeKnight profile, then submit your ambassador application from your dashboard."
          />
          <Step
            title="2. Get reviewed"
            text="HypeKnight reviews each application before granting ambassador access."
          />
          <Step
            title="3. Request your code"
            text="Approved ambassadors can request a custom coupon code and choose the discount amount."
          />
          <Step
            title="4. Track results"
            text="Your dashboard shows coupon usage, referred events, cities, sales generated, and eligible commission."
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[2.5rem] border border-accent/20 bg-accent/10 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Custom Coupon Codes
          </p>

          <h2 className="mt-3 text-3xl font-bold text-white">
            Create a code that fits your audience.
          </h2>

          <p className="mt-4 text-white/75">
            After approval, ambassadors can request a personal coupon code such
            as KCQUEEN30, NIGHTLIFE20, or TRE50. You can request a discount
            between 20% and 70% off.
          </p>

          <p className="mt-4 text-white/75">
            Codes are not instantly activated. HypeKnight must approve the code
            before it becomes active. This protects the platform, promoters, and
            ambassadors from coupon abuse.
          </p>
        </div>

        <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Commission
          </p>

          <h2 className="mt-3 text-3xl font-bold text-white">
            Earn from eligible sales.
          </h2>

          <p className="mt-4 text-white/75">
            Ambassadors receive 30% of the profit from sales made with their
            coupon code.
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-white/70">
            Example: customer pays after discount, HypeKnight subtracts fees and
            eligible costs, then the remaining profit is split 70% to HypeKnight
            and 30% to the ambassador.
          </div>

          <p className="mt-4 text-sm text-white/55">
            Commission is only considered eligible after the referred event
            completes the HypeKnight pipeline with no refund, removal, or
            chargeback.
          </p>
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-3xl font-bold text-white">
          Why HypeKnight is building this way
        </h2>

        <p className="mt-4 max-w-4xl text-white/70">
          HypeKnight is not just trying to advertise at people. We want to build
          through the people already connected to nightlife: promoters, creators,
          DJs, hosts, venue supporters, and community voices. Ambassadors give
          HypeKnight a local human connection in each city while giving partners
          a real reason to help the platform grow.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <InfoCard
            title="Community-first growth"
            text="Instead of relying only on ads, HypeKnight can grow through people who already understand their local scene."
          />
          <InfoCard
            title="Trackable promotion"
            text="Custom coupons let ambassadors see what they helped generate instead of guessing whether their posts worked."
          />
          <InfoCard
            title="City-by-city expansion"
            text="A strong ambassador group helps HypeKnight learn which cities, event types, and communities are gaining traction."
          />
        </div>
      </section>

      <section className="rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-10 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Founding Ambassador Group
        </p>

        <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-black text-white">
          Be part of the first 50 ambassadors helping HypeKnight move.
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-white/70">
          If you know your city, know nightlife, or know how to get people
          curious, this program is built for you.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={applyHref}
            className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
          >
            Apply Now
          </Link>

          <Link
            href="/dashboard"
            className="rounded-2xl border border-white/10 bg-black/20 px-6 py-3 text-white hover:border-accent/40"
          >
            Go to Dashboard
          </Link>
        </div>
      </section>
    </section>
  );
}

function Metric({
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">
        {label}
      </p>
      <p className="mt-3 text-4xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-white/60">{text}</p>
    </div>
  );
}

function Step({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-3 text-white/65">{text}</p>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-3 text-white/65">{text}</p>
    </div>
  );
}