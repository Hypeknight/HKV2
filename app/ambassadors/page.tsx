import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/settings';

export default async function AmbassadorsPage() {
  const supabase = await createClient();
  const settings = await getPlatformSettings();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const applyHref = user ? '/dashboard/ambassador/apply' : '/auth/sign-up';

  const programEnabled = Boolean(settings.ambassador_program_enabled);
  const founderLimit = Number(settings.ambassador_founder_limit || 50);
  const minDiscount = Number(settings.ambassador_min_discount || 20);
  const maxDiscount = Number(settings.ambassador_max_discount || 70);
  const commissionPercent = Number(settings.ambassador_commission_percent || 30);
  const hypeKnightPercent = 100 - commissionPercent;
  const minPayout = Number(settings.ambassador_min_payout || 25);

  return (
    <section className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 lg:px-8">
      {!programEnabled ? (
        <section className="rounded-[2.75rem] border border-yellow-500/20 bg-yellow-500/10 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-yellow-200">
            Ambassador Program
          </p>
          <h1 className="mt-3 text-4xl font-black text-white">
            Applications are currently paused.
          </h1>
          <p className="mt-4 max-w-3xl text-white/70">
            HypeKnight may reopen the ambassador program as new cities, events,
            and campaign opportunities become available.
          </p>
          <Link
            href="/events"
            className="mt-6 inline-flex rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
          >
            Explore HypeKnight
          </Link>
        </section>
      ) : null}

      <section className="rounded-[3rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-10">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Become a HypeKnight Ambassador
        </p>

        <h1 className="mt-4 max-w-5xl text-5xl font-black text-white sm:text-7xl">
          Help people discover better experiences.
        </h1>

        <p className="mt-6 max-w-3xl text-lg text-white/75">
          HypeKnight is an event discovery platform designed to help people find
          nightlife, concerts, festivals, food truck events, live music, sports,
          and local entertainment before deciding where to spend their time.
        </p>

        <p className="mt-4 max-w-3xl text-lg font-semibold text-white">
          Hype Nights Start With HypeKnight.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {programEnabled ? (
            <Link
              href={applyHref}
              className="rounded-2xl bg-accent px-6 py-3 text-center font-semibold text-black hover:opacity-90"
            >
              Apply to Become an Ambassador
            </Link>
          ) : null}

          <Link
            href="/events"
            className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-center text-white hover:border-accent/40"
          >
            Explore HypeKnight
          </Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <Metric
          label="Starting Group"
          value={String(founderLimit)}
          text="Founding ambassador spots planned across the continental U.S."
        />
        <Metric
          label="Coupon Range"
          value={`${minDiscount}–${maxDiscount}%`}
          text="Approved ambassadors can request custom discounts."
        />
        <Metric
          label="Profit Split"
          value={`${commissionPercent}%`}
          text={`Ambassadors earn ${commissionPercent}% of eligible profit from code sales.`}
        />
      </section>

      <InfoSection
        eyebrow="What is HypeKnight?"
        title="A better way to discover what is happening."
        text="HypeKnight helps people discover experiences that match what they are looking for while helping local organizers reach more people. The goal is simple: help people discover better experiences while helping local events get seen."
      />

      <InfoSection
        eyebrow="What is an Ambassador?"
        title="Part influencer. Part community leader. Part local event advocate."
        text="A HypeKnight Ambassador is a community representative who helps introduce people to HypeKnight while supporting local events and businesses. Ambassadors help grow the community by sharing events, creating content, inviting new users, and introducing event organizers, venues, and promoters to the platform."
      />

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-3xl font-bold text-white">
          What does an Ambassador do?
        </h2>

        <p className="mt-4 max-w-3xl text-white/70">
          There are no required hours and no sales quotas. You choose how
          involved you want to be.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <InfoCard title="Share HypeKnight" text="Tell friends, followers, and your local community about the platform." />
          <InfoCard title="Promote Events" text="Share upcoming events featured on HypeKnight." />
          <InfoCard title="Create Content" text="Create social media content featuring local events and experiences." />
          <InfoCard title="Support Local" text="Introduce local organizers, promoters, and venues to the platform." />
          <InfoCard title="Attend Events" text="Share your experience and help others find great nights out." />
          <InfoCard title="Give Feedback" text="Help HypeKnight improve by sharing what works and what needs to be better." />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[2.5rem] border border-accent/20 bg-accent/10 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Your Personal Coupon Code
          </p>

          <h2 className="mt-3 text-3xl font-bold text-white">
            Every approved ambassador can request a unique code.
          </h2>

          <p className="mt-4 text-white/75">
            Example: <span className="font-bold text-white">TRE20</span>
          </p>

          <p className="mt-4 text-white/75">
            When someone uses your code, they receive a discount on eligible
            HypeKnight purchases and the purchase is tracked to your ambassador
            account.
          </p>

          <p className="mt-4 text-white/75">
            Current coupon request range: {minDiscount}% to {maxDiscount}% off.
          </p>
        </div>

        <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Payouts
          </p>

          <h2 className="mt-3 text-3xl font-bold text-white">
            Earn from qualifying purchases.
          </h2>

          <p className="mt-4 text-white/75">
            Every qualifying purchase made using your ambassador code earns a
            commission after platform fees and eligible costs are deducted.
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-white/70">
            Remaining profit is currently split {hypeKnightPercent}% to
            HypeKnight and {commissionPercent}% to the ambassador.
          </div>

          <p className="mt-4 text-sm text-white/55">
            Earnings accumulate in your ambassador account and are paid according
            to HypeKnight's payout schedule. Current minimum payout threshold:
            ${minPayout.toFixed(2)}.
          </p>
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-3xl font-bold text-white">
          Who can become an Ambassador?
        </h2>

        <p className="mt-4 max-w-3xl text-white/70">
          You do not need thousands of followers. Some of the best ambassadors
          simply enjoy sharing great experiences with friends.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <InfoCard title="Nightlife Fans" text="People who know where the energy is." />
          <InfoCard title="Festival Goers" text="People who love discovering live experiences." />
          <InfoCard title="Food Truck Supporters" text="People who enjoy local food events and community gatherings." />
          <InfoCard title="Music Lovers" text="People who follow concerts, DJs, bands, and live shows." />
          <InfoCard title="Local Connectors" text="People who naturally tell others what is happening." />
          <InfoCard title="Content Creators" text="People who enjoy posting, sharing, reviewing, and promoting experiences." />
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-accent/20 bg-accent/10 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          More Than Referral Codes
        </p>

        <h2 className="mt-3 text-3xl font-bold text-white">
          This program can grow into something bigger.
        </h2>

        <p className="mt-4 max-w-4xl text-white/75">
          As HypeKnight grows, ambassadors may have opportunities to host weekly
          event recaps, become featured city representatives, cover festivals and
          concerts, interview venues and organizers, receive early access to new
          features, participate in exclusive promotions, and help launch
          HypeKnight in new cities.
        </p>
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-3xl font-bold text-white">Why Join Early?</h2>

        <p className="mt-4 max-w-4xl text-white/70">
          HypeKnight is currently in its early stages. Early ambassadors have the
          opportunity to help shape the platform from the beginning. Your
          feedback, ideas, and community involvement can directly influence how
          HypeKnight grows.
        </p>

        <p className="mt-4 max-w-4xl text-white/70">
          We are not just looking for people to share a link. We are looking for
          people who want to help build the future of discovering local
          experiences.
        </p>
      </section>

      <section className="rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-10 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Founding Ambassador Group
        </p>

        <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-black text-white">
          Be part of the first {founderLimit} ambassadors helping HypeKnight move.
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-white/70">
          If you know your city, know events, or know how to get people curious,
          this program is built for you.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {programEnabled ? (
            <Link
              href={applyHref}
              className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Apply Now
            </Link>
          ) : null}

          <Link
            href="/events"
            className="rounded-2xl border border-white/10 bg-black/20 px-6 py-3 text-white hover:border-accent/40"
          >
            Explore Events
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

function InfoSection({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <p className="text-sm uppercase tracking-[0.35em] text-accent">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold text-white">{title}</h2>
      <p className="mt-4 max-w-4xl text-white/70">{text}</p>
    </section>
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