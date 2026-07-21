import Link from 'next/link';

const discoveryFeatures = [
  'Music and entertainment style',
  'Vibe and atmosphere',
  'Dress code and attire',
  'Cover charges and ticket prices',
  'Age requirements',
  'Drink specials and amenities',
  'Event type, location, and date',
];

const ambassadorResponsibilities = [
  'Introduce HypeKnight to Atlanta venues, promoters, and organizers',
  'Help identify and share upcoming local events',
  'Create Atlanta-focused social media content',
  'Provide feedback while the platform is in beta',
  'Support local launch campaigns and community outreach',
  'Represent HypeKnight professionally within the Atlanta market',
];

const ambassadorBenefits = [
  'Founding Ambassador recognition',
  'Personal referral and coupon opportunities',
  'Commission eligibility on qualifying purchases',
  'Early access to selected features',
  'Priority consideration for city leadership roles',
  'Opportunities to host future Hype Report segments',
];

export default function AtlantaPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-violet-950/60 to-slate-950">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-violet-300">
            HypeKnight City Expansion
          </p>

          <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
            Help build a better way to discover Atlanta.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            HypeKnight helps people discover nightlife, live music,
            festivals, food experiences, sporting events, and local
            entertainment based on the experience they actually want.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/events"
              className="rounded-xl bg-violet-600 px-6 py-3 font-semibold transition hover:bg-violet-500"
            >
              Explore HypeKnight
            </Link>

            <a
              href="#ambassador"
              className="rounded-xl border border-white/20 px-6 py-3 font-semibold transition hover:bg-white/10"
            >
              Founding Ambassador Program
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">
            The Platform
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            More than another event listing.
          </h2>

          <p className="mt-5 leading-7 text-slate-300">
            People often know they want to go out but do not know where they
            want to go. HypeKnight is being built to make that decision easier.
          </p>

          <p className="mt-4 leading-7 text-slate-300">
            Instead of relying only on an event title or ticket price, users
            can discover experiences using the details that shape their night.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-7">
          <h3 className="text-xl font-semibold">
            Discover experiences by:
          </h3>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {discoveryFeatures.map((feature) => (
              <li
                key={feature}
                className="rounded-lg bg-slate-900/70 px-4 py-3 text-sm text-slate-200"
              >
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-white/10 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">
            Why Atlanta
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            A city built for discovery.
          </h2>

          <p className="mt-5 max-w-4xl leading-7 text-slate-300">
            Atlanta combines nightlife, live entertainment, universities,
            festivals, food culture, creators, professional sports, and a
            strong network of independent venues and promoters. That makes it
            an ideal city for HypeKnight&apos;s next stage of growth.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {[
              {
                title: 'Local Discovery',
                text: 'Help residents and visitors find experiences that match their interests.',
              },
              {
                title: 'Organizer Exposure',
                text: 'Give venues and event organizers another way to reach potential attendees.',
              },
              {
                title: 'Community Leadership',
                text: 'Build the market with people who already understand Atlanta.',
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-white/10 bg-slate-950 p-6"
              >
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="ambassador"
        className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">
          Founding Ambassador Program
        </p>

        <h2 className="mt-3 text-3xl font-bold">
          Help introduce HypeKnight to Atlanta.
        </h2>

        <p className="mt-5 max-w-4xl leading-7 text-slate-300">
          Founding Ambassadors are early community representatives who help
          HypeKnight build relationships, gather feedback, share events, and
          create local awareness.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-7">
            <h3 className="text-xl font-semibold">The role</h3>

            <ul className="mt-5 space-y-3 text-slate-300">
              {ambassadorResponsibilities.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-violet-300">⚔</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-7">
            <h3 className="text-xl font-semibold">The opportunity</h3>

            <ul className="mt-5 space-y-3 text-slate-200">
              {ambassadorBenefits.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-violet-300">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-sm leading-6 text-slate-400">
              Commission eligibility, payout requirements, promotional
              discounts, and program terms are governed by the official
              HypeKnight Ambassador Program terms.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">
            The Bigger Vision
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            Discovery today. Live connection tomorrow.
          </h2>

          <div className="mt-9 grid gap-6 md:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-slate-950 p-7">
              <h3 className="text-2xl font-semibold">Patron Pulse</h3>
              <p className="mt-4 leading-7 text-slate-300">
                A developing engagement system designed to help identify
                audience activity, gather live input, and support more
                interactive venue experiences.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-slate-950 p-7">
              <h3 className="text-2xl font-semibold">
                Linkd&apos;N Entertainment System
              </h3>
              <p className="mt-4 leading-7 text-slate-300">
                A developing venue-networking system designed to connect
                participating locations and support interactive entertainment
                between venues.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-violet-400/20 bg-gradient-to-r from-violet-950 to-slate-900 p-8 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">
            Beta Access
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            Post an event and help test HypeKnight.
          </h2>

          <p className="mt-5 max-w-3xl leading-7 text-slate-300">
            During beta, eligible organizers can create an account, submit
            events, and help us identify issues before a larger public push.
          </p>

          <div className="mt-7 rounded-xl border border-white/10 bg-black/20 p-5 sm:inline-block">
            <p className="text-sm text-slate-400">Beta coupon code</p>
            <p className="mt-1 text-2xl font-black tracking-wider">
              HypeATL
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/dashboard/events/new/step-1"
              className="rounded-xl bg-violet-600 px-6 py-3 font-semibold transition hover:bg-violet-500"
            >
              Post an Event
            </Link>

            <a
              href="mailto:contact@hypeknight.fun"
              className="rounded-xl border border-white/20 px-6 py-3 font-semibold transition hover:bg-white/10"
            >
              Discuss Atlanta
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center">
          <h2 className="text-3xl font-bold">
            Let&apos;s build HypeKnight Atlanta together.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-400">
            We believe a strong city launch begins with local people,
            relationships, and ideas.
          </p>

          <p className="mt-7 font-semibold text-violet-300">
            Hype Nights Start With HypeKnight.
          </p>
        </div>
      </section>
    </main>
  );
}