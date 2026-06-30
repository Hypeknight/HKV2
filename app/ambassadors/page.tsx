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
  const hypeKnightPercent = Math.max(100 - commissionPercent, 0);
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
            HypeKnight may reopen the ambassador program as new city campaigns,
            events, and launch opportunities become available.
          </p>
        </section>
      ) : null}

      <section className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-10 sm:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.07),transparent_28%)]" />

        <div className="relative grid gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-accent">
              Become a HypeKnight Ambassador
            </p>

            <h1 className="mt-4 max-w-5xl text-5xl font-black text-white sm:text-7xl">
              Help people discover better nights out.
            </h1>

            <p className="mt-6 max-w-3xl text-lg text-white/75">
              HypeKnight is an event discovery platform built to help people find
              nightlife, concerts, festivals, food truck events, live music,
              sports, and local entertainment before they decide where to spend
              their time.
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
          </div>

          <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
            <p className="text-sm uppercase tracking-[0.25em] text-white/45">
              Current Program
            </p>

            <div className="mt-6 grid gap-4">
              <Stat label="Founding Spots" value={String(founderLimit)} />
              <Stat label="Coupon Range" value={`${minDiscount}–${maxDiscount}%`} />
              <Stat label="Ambassador Split" value={`${commissionPercent}%`} />
              <Stat label="Minimum Payout" value={`$${minPayout.toFixed(2)}`} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <Metric
          label="Discover"
          value="Events"
          text="Help people find what is happening before they choose where to go."
        />
        <Metric
          label="Promote"
          value="Local"
          text="Support organizers, creators, venues, promoters, and community events."
        />
        <Metric
          label="Earn"
          value={`${commissionPercent}%`}
          text="Earn from qualifying purchases made with your approved code."
        />
      </section>

      <InfoSection
        eyebrow="What is HypeKnight?"
        title="A better way to discover local experiences."
        text="HypeKnight helps people find experiences that match what they are looking for while helping local organizers reach more people. The goal is simple: help people discover better experiences while helping local events get seen."
      />

      <InfoSection
        eyebrow="What is an Ambassador?"
        title="Part influencer. Part community leader. Part local event advocate."
        text="A HypeKnight Ambassador is a community representative who introduces people to HypeKnight while supporting local events and businesses. Ambassadors help grow the community by sharing events, creating content, inviting new users, and introducing organizers, venues, DJs, creators, and promoters to the platform."
      />

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          What You Actually Do
        </p>

        <h2 className="mt-3 text-3xl font-bold text-white">
          Be as involved as you want.
        </h2>

        <p className="mt-4 max-w-3xl text-white/70">
          There are no required hours and no sales quotas. You can share,
          promote, attend, introduce, create, or simply help HypeKnight learn
          what your city needs.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            title="Share HypeKnight"
            text="Tell friends, followers, and your local community where they can discover events."
          />
          <InfoCard
            title="Promote Events"
            text="Share upcoming events featured on HypeKnight and help them reach more people."
          />
          <InfoCard
            title="Create Content"
            text="Make social posts, short videos, recaps, photos, or local event recommendations."
          />
          <InfoCard
            title="Support Local"
            text="Introduce local organizers, venues, DJs, food trucks, and promoters to the platform."
          />
          <InfoCard
            title="Attend Events"
            text="Go out, experience the city, and help others find nights worth remembering."
          />
          <InfoCard
            title="Give Feedback"
            text="Help shape the platform by telling us what works, what is confusing, and what should come next."
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[2.75rem] border border-accent/20 bg-accent/10 p-8">
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

        <div className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Payouts
          </p>

          <h2 className="mt-3 text-3xl font-bold text-white">
            Earn from qualifying purchases.
          </h2>

          <p className="mt-4 text-white/75">
            Every qualifying purchase made using your ambassador code may earn
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

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Who Can Join?
        </p>

        <h2 className="mt-3 text-3xl font-bold text-white">
          You do not need thousands of followers.
        </h2>

        <p className="mt-4 max-w-3xl text-white/70">
          Some of the best ambassadors simply enjoy sharing great experiences
          with friends, family, coworkers, followers, and local communities.
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

      <section className="rounded-[2.75rem] border border-accent/20 bg-accent/10 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Ambassador Growth Path
        </p>

        <h2 className="mt-3 text-3xl font-bold text-white">
          More than referral codes.
        </h2>

        <p className="mt-4 max-w-4xl text-white/75">
          As HypeKnight grows, ambassadors may have opportunities to host weekly
          event recaps, become featured city representatives, cover festivals and
          concerts, interview venues and organizers, receive early access to new
          features, participate in exclusive promotions, and help launch
          HypeKnight in new cities.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-4">
          <PathCard step="01" title="Community Ambassador" text="Share events and introduce people to HypeKnight." />
          <PathCard step="02" title="City Representative" text="Help represent your local event scene." />
          <PathCard step="03" title="Featured Creator" text="Create recaps, previews, and local event content." />
          <PathCard step="04" title="Launch Team" text="Help HypeKnight expand into new cities." />
        </div>
      </section>

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Why Join Early?
        </p>

        <h2 className="mt-3 text-3xl font-bold text-white">
          Help shape HypeKnight from the beginning.
        </h2>

        <p className="mt-4 max-w-4xl text-white/70">
          HypeKnight is currently in its early stages. Early ambassadors have the
          opportunity to influence how the platform grows, what tools get built,
          how local events are supported, and what communities HypeKnight serves
          first.
        </p>

        <p className="mt-4 max-w-4xl text-white/70">
          We are not just looking for people to share a link. We are looking for
          people who want to help build the future of discovering local
          experiences.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <FAQ
          question="Do I need a large following?"
          answer="No. HypeKnight values real local connection. A person who knows their city and shares consistently can be valuable even without a huge audience."
        />
        <FAQ
          question="Are there required hours?"
          answer="No. You choose how involved you want to be. The program is designed to be flexible."
        />
        <FAQ
          question="Are codes automatically active?"
          answer="No. Coupon requests are reviewed by HypeKnight before activation to protect the platform and reduce abuse."
        />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
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
    <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
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

function PathCard({
  step,
  title,
  text,
}: {
  step: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <p className="text-sm font-black text-accent">{step}</p>
      <h3 className="mt-3 text-xl font-bold text-white">{title}</h3>
      <p className="mt-3 text-white/65">{text}</p>
    </div>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
      <h3 className="text-xl font-bold text-white">{question}</h3>
      <p className="mt-3 text-white/65">{answer}</p>
    </div>
  );
}