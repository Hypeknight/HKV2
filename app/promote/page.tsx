import {
  ButtonLink,
  InfoCard,
  Panel,
  SectionHeader,
} from '@/components/ui';

export default function PromotePage() {
  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            Promote on HypeKnight
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
            Put your event where people are deciding what to do.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            Posting an event on HypeKnight is free. Once approved, your event
            gets a public page immediately and an included Discovery Window
            before the event. When you want more reach, you can choose paid
            enhancements without paying just to be listed.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href="/dashboard/events/new/step-1"
              variant="primary"
            >
              Post an Event
            </ButtonLink>

            <ButtonLink href="/pricing" variant="secondary">
              View Pricing
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          label="Event Listing"
          icon="✓"
          value="Free"
          accent
        />
        <InfoCard
          label="Included Discovery"
          icon="14"
          value="14 days"
        />
        <InfoCard
          label="Extended Discovery"
          icon="+"
          value="Up to 60 days"
        />
        <InfoCard
          label="Featured"
          icon="★"
          value="Optional"
        />
      </section>

      <Panel title="How HypeKnight promotion works" eyebrow="Process">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Step
            step="01"
            title="Create"
            text="Add your flyer, event details, location, music, vibe, age requirements, ticket link, and other useful information."
          />

          <Step
            step="02"
            title="Review"
            text="Submit your event for HypeKnight review. Approval is based on event quality and platform requirements, not payment."
          />

          <Step
            step="03"
            title="Go Public"
            text="Once approved, your event page becomes public immediately. You do not have to purchase promotion to be listed."
          />

          <Step
            step="04"
            title="Get Discovered"
            text="Every approved event receives 14 days of included Discovery before the event, helping it appear across eligible HypeKnight discovery experiences."
          />

          <Step
            step="05"
            title="Enhance"
            text="When available, add Extended Discovery for more time or Featured for additional attention during your active Discovery Window."
          />
        </div>
      </Panel>

      <Panel title="Free by default" eyebrow="Included">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Feature
            title="Public event page"
            text="Approved events receive a public HypeKnight page without a listing fee."
          />

          <Feature
            title="14 days of Discovery"
            text="Approved events receive an included Discovery Window during the 14 days leading into the event."
          />

          <Feature
            title="Search and direct access"
            text="Your public page can be shared directly and found through supported HypeKnight search experiences."
          />

          <Feature
            title="Event details"
            text="Show the information people need to make a decision, including music, vibe, age, attire, price, location, and event details."
          />

          <Feature
            title="Event flyer"
            text="Use your official event artwork so people can quickly recognize the event and its identity."
          />

          <Feature
            title="External ticket links"
            text="Keep using your existing ticket provider. HypeKnight can send interested users to your ticket destination."
          />
        </div>
      </Panel>

      <Panel title="Choose how you want to grow" eyebrow="Enhancements">
        <div className="grid gap-4 md:grid-cols-2">
          <Package
            title="Extended Discovery"
            headline="More time"
            text="Extend your event's Discovery Window earlier than the 14 included days. Extended Discovery changes when your event can be surfaced - it does not guarantee ranking or placement."
          />

          <Package
            title="Featured"
            headline="More attention"
            text="Choose eligible dates to give your event additional visibility while it is already inside an active Discovery Window. Featured inventory and pricing can vary by market and date."
          />
        </div>

        <p className="mt-5 text-sm leading-6 text-white/50">
          Extended Discovery and Featured are optional. Neither is required for
          event approval, publication, or the included 14-day Discovery Window.
        </p>
      </Panel>

      <Panel title="Built around discovery, not ticketing" eyebrow="HypeKnight">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Feature
            title="Keep your ticket provider"
            text="HypeKnight is not replacing Eventbrite, Ticketmaster, or your existing checkout flow. Link visitors to the ticket destination you already use."
          />

          <Feature
            title="Help people decide"
            text="Give people more than a title and date. Music, vibe, attire, age requirements, price, venue context, and other experience details help answer: What should I do tonight?"
          />

          <Feature
            title="Build measurable history"
            text="HypeKnight can record supported activity around your events so your event history and future intelligence can become more useful over time."
          />
        </div>
      </Panel>

      <section className="rounded-[2rem] border border-accent/20 bg-accent/10 p-6 text-center sm:rounded-[2.75rem] sm:p-10">
        <SectionHeader
          eyebrow="Ready?"
          title="Start building your event page."
          text="Create for free, submit for review, and choose paid enhancements only when they make sense for your event."
        />

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink
            href="/dashboard/events/new/step-1"
            variant="primary"
          >
            Post an Event
          </ButtonLink>

          <ButtonLink href="/events" variant="secondary">
            Explore Events
          </ButtonLink>
        </div>
      </section>
    </section>
  );
}

function Step({
  step,
  title,
  text,
}: {
  step: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-sm font-black text-accent">{step}</p>
      <h3 className="mt-3 text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/60">{text}</p>
    </div>
  );
}

function Feature({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/60">{text}</p>
    </div>
  );
}

function Package({
  title,
  headline,
  text,
}: {
  title: string;
  headline: string;
  text: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <p className="text-sm uppercase tracking-[0.25em] text-accent">
        {title}
      </p>
      <p className="mt-3 text-4xl font-black text-white">{headline}</p>
      <p className="mt-4 text-sm leading-6 text-white/60">{text}</p>
    </div>
  );
}
