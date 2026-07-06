import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/settings';
import {
  ButtonLink,
  InfoCard,
  MetricCard,
  Panel,
  SectionHeader,
} from '@/components/ui';

const CITY_LAUNCHES = [
  { city: 'Kansas City', status: 'Active Base', emoji: '🔥' },
  { city: 'St. Louis', status: 'Building', emoji: '🚀' },
  { city: 'Houston', status: 'Open', emoji: '🌆' },
  { city: 'Dallas', status: 'Open', emoji: '🎟️' },
  { city: 'Chicago', status: 'Open', emoji: '🌃' },
  { city: 'Atlanta', status: 'Open', emoji: '🎤' },
];

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
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-12 sm:px-6 sm:py-10 lg:px-8">
      {!programEnabled ? (
        <section className="rounded-[2rem] border border-yellow-500/20 bg-yellow-500/10 p-6 sm:rounded-[2.75rem] sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-yellow-200 sm:text-sm">
            Ambassador Program
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">
            Applications are currently paused.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            HypeKnight may reopen the ambassador program as new city campaigns,
            events, and launch opportunities become available.
          </p>
        </section>
      ) : null}

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10 lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Become a HypeKnight Ambassador
            </p>

            <h1 className="mt-4 max-w-5xl text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              Launch your city’s event movement.
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-7 text-white/75 sm:text-lg">
              Help people discover better nights out while supporting local
              events, creators, venues, festivals, food trucks, music, and
              community experiences.
            </p>

            <p className="mt-4 max-w-3xl text-base font-semibold text-white sm:text-lg">
              Hype Nights Start With HypeKnight.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              {programEnabled ? (
                <ButtonLink href={applyHref} variant="primary">
                  Apply to Become an Ambassador
                </ButtonLink>
              ) : null}

              <ButtonLink href="/events" variant="secondary">
                Explore HypeKnight
              </ButtonLink>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Founding Program
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat label="Spots" value={String(founderLimit)} />
              <MiniStat label="Code Range" value={`${minDiscount}–${maxDiscount}%`} />
              <MiniStat label="Your Split" value={`${commissionPercent}%`} />
              <MiniStat label="Min Payout" value={`$${minPayout.toFixed(0)}`} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        <MetricCard label="Discover" value="Events" text="Help people find the move." accent />
        <MetricCard label="Promote" value="Local" text="Support your city." />
        <MetricCard label="Earn" value={`${commissionPercent}%`} text="From qualifying profit." />
        <MetricCard label="Build" value="Cities" text="Help launch new markets." />
      </section>

      <Panel title="Choose your city" eyebrow="City Launches">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CITY_LAUNCHES.map((item) => (
            <div
              key={item.city}
              className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5"
            >
              <p className="text-3xl">{item.emoji}</p>
              <h3 className="mt-3 text-xl font-black text-white">{item.city}</h3>
              <p className="mt-2 text-sm text-white/55">{item.status}</p>
            </div>
          ))}
        </div>
      </Panel>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Panel title="What is HypeKnight?" eyebrow="The Platform">
          <p className="leading-7 text-white/70">
            HypeKnight is an event discovery platform designed to help people
            find nightlife, concerts, festivals, food truck events, live music,
            sporting events, and local entertainment before they decide where to
            spend their time.
          </p>
        </Panel>

        <Panel title="What is an ambassador?" eyebrow="The Role">
          <p className="leading-7 text-white/70">
            A HypeKnight Ambassador is part influencer, part community leader,
            and part local event advocate. You help introduce people to
            HypeKnight while supporting the events and businesses that give your
            city life.
          </p>
        </Panel>
      </section>

      <section>
        <SectionHeader
          eyebrow="Your Missions"
          title="Be as involved as you want."
          text="There are no required hours and no sales quotas. Choose how you want to help your city get discovered."
        />

        <div className="mt-5 grid gap-4 sm:mt-8 md:grid-cols-2 xl:grid-cols-3">
          <MissionCard icon="📍" title="Find Events" text="Spot events worth sharing and help keep your city visible." />
          <MissionCard icon="📸" title="Create Content" text="Post videos, photos, previews, recaps, and local recommendations." />
          <MissionCard icon="🎟️" title="Promote Events" text="Share upcoming events featured on HypeKnight with your audience." />
          <MissionCard icon="🤝" title="Connect Organizers" text="Introduce venues, DJs, promoters, creators, and food trucks to the platform." />
          <MissionCard icon="🌃" title="Represent Your City" text="Help HypeKnight understand the real local scene." />
          <MissionCard icon="💬" title="Give Feedback" text="Tell us what works, what is confusing, and what should come next." />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Panel title="Your personal coupon code" eyebrow="Ambassador Codes">
          <div className="space-y-5">
            <p className="text-white/75">
              Every approved ambassador can request a unique discount code.
            </p>

            <div className="rounded-2xl border border-accent/20 bg-accent/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-accent">
                Example Code
              </p>
              <p className="mt-2 text-4xl font-black text-white">TRE20</p>
            </div>

            <p className="text-white/70">
              When someone uses your code, they receive a discount on eligible
              HypeKnight purchases and the purchase is tracked to your ambassador
              account. Current code range: {minDiscount}% to {maxDiscount}% off.
            </p>
          </div>
        </Panel>

        <Panel title="How payouts work" eyebrow="Commission">
          <div className="space-y-5">
            <p className="text-white/75">
              Every qualifying purchase made using your ambassador code may earn
              commission after platform fees and eligible costs are deducted.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="HypeKnight" value={`${hypeKnightPercent}%`} icon="⚔️" />
              <InfoCard label="Ambassador" value={`${commissionPercent}%`} icon="💰" accent />
            </div>

            <p className="text-sm text-white/55">
              Earnings accumulate in your ambassador account and are paid
              according to HypeKnight’s payout schedule. Current minimum payout:
              ${minPayout.toFixed(2)}.
            </p>
          </div>
        </Panel>
      </section>

      <Panel title="Who can join?" eyebrow="No Huge Following Required">
        <p className="max-w-4xl leading-7 text-white/70">
          You do not need thousands of followers. Some of the best ambassadors
          simply enjoy sharing great experiences with friends, family, coworkers,
          followers, and local communities.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MissionCard icon="🌃" title="Nightlife Fans" text="People who know where the energy is." />
          <MissionCard icon="🎡" title="Festival Goers" text="People who love discovering live experiences." />
          <MissionCard icon="🌮" title="Food Truck Supporters" text="People who enjoy local food and community gatherings." />
          <MissionCard icon="🎵" title="Music Lovers" text="People who follow concerts, DJs, bands, and live shows." />
          <MissionCard icon="🧭" title="Local Connectors" text="People who naturally tell others what is happening." />
          <MissionCard icon="📱" title="Content Creators" text="People who enjoy posting, sharing, reviewing, and promoting experiences." />
        </div>
      </Panel>

      <section className="rounded-[2rem] border border-accent/20 bg-accent/10 p-6 sm:rounded-[2.75rem] sm:p-8">
        <SectionHeader
          eyebrow="Ambassador Growth Path"
          title="More than referral codes."
          text="As HypeKnight grows, ambassadors may unlock more ways to represent their city, cover events, and help launch new markets."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PathCard step="01" title="Community Ambassador" text="Share events and introduce people to HypeKnight." />
          <PathCard step="02" title="City Representative" text="Help represent your local event scene." />
          <PathCard step="03" title="Featured Creator" text="Create recaps, previews, and local event content." />
          <PathCard step="04" title="Launch Team" text="Help HypeKnight expand into new cities." />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 text-center sm:rounded-[2.75rem] sm:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
          Founding Ambassador Group
        </p>

        <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black leading-tight text-white sm:text-4xl">
          Be part of the first {founderLimit} ambassadors helping HypeKnight move.
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-sm text-white/70 sm:text-base">
          If you know your city, know events, or know how to get people curious,
          this program is built for you.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row">
          {programEnabled ? (
            <ButtonLink href={applyHref} variant="primary">
              Apply Now
            </ButtonLink>
          ) : null}

          <ButtonLink href="/events" variant="secondary">
            Explore Events
          </ButtonLink>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <FAQ
          question="Do I need a large following?"
          answer="No. HypeKnight values real local connection more than vanity numbers."
        />
        <FAQ
          question="Are there required hours?"
          answer="No. You choose how involved you want to be."
        />
        <FAQ
          question="Are codes instantly active?"
          answer="No. Coupon requests are reviewed before activation to reduce abuse."
        />
      </section>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/45 sm:text-xs">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function MissionCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 sm:rounded-[2rem] sm:p-6">
      <p className="text-3xl">{icon}</p>
      <h3 className="mt-4 text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/65">{text}</p>
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
    <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 sm:rounded-[2rem] sm:p-6">
      <p className="text-sm font-black text-accent">{step}</p>
      <h3 className="mt-3 text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/65">{text}</p>
    </div>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2rem] sm:p-6">
      <h3 className="text-xl font-black text-white">{question}</h3>
      <p className="mt-3 text-sm leading-6 text-white/65">{answer}</p>
    </div>
  );
}