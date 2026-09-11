import { ButtonLink, InfoCard, Panel, SectionHeader } from '@/components/ui';

const discoveryPackages = [
  {
    title: 'Included Discovery',
    days: '14 total days',
    price: 'FREE',
    text: 'Every approved event receives 14 days of Discovery before the event at no charge.',
    active: true,
  },
  {
    title: 'Extended Discovery',
    days: '21 total days',
    price: '$9.99',
    text: 'Adds 7 days of earlier Discovery eligibility.',
  },
  {
    title: 'Extended Discovery',
    days: '28 total days',
    price: '$24.99',
    text: 'Adds 14 days of earlier Discovery eligibility.',
  },
  {
    title: 'Extended Discovery',
    days: '44 total days',
    price: '$59.99',
    text: 'Adds 30 days of earlier Discovery eligibility.',
  },
  {
    title: 'Extended Discovery',
    days: '60 total days',
    price: '$99.99',
    text: 'Adds 46 days of earlier Discovery eligibility. This is the normal maximum Discovery Window.',
  },
];

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            HypeKnight Pricing
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
            Post for free. Enhance when it makes sense.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            HypeKnight does not charge you simply to create an event listing.
            Approved events receive a public page immediately and 14 days of
            Included Discovery before the event. Paid products are optional
            enhancements for organizers who want more time, more attention, or
            additional capabilities.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href="/dashboard/events/new/step-1"
              variant="primary"
            >
              Post an Event
            </ButtonLink>

            <ButtonLink href="/promote" variant="secondary">
              How Promotion Works
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard
          label="Event Posting"
          icon="📍"
          value="FREE"
          accent
        />

        <InfoCard
          label="Included Discovery"
          icon="📅"
          value="14 days"
        />

        <InfoCard
          label="Public Page"
          icon="🌐"
          value="After approval"
        />
      </section>

      <Panel title="Discovery pricing" eyebrow="More Time">
        <div className="mb-6 max-w-3xl">
          <p className="text-sm leading-6 text-white/60">
            Every approved event receives 14 total Discovery days for free.
            Extended Discovery lets an organizer move the beginning of that
            Discovery Window earlier. It changes when an event becomes eligible
            for HypeKnight discovery surfaces; it does not guarantee ranking,
            placement, views, attendance, or sales.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {discoveryPackages.map((pkg) => (
            <Package
              key={pkg.days}
              title={pkg.title}
              days={pkg.days}
              price={pkg.price}
              text={pkg.text}
              active={pkg.active}
            />
          ))}
        </div>

        <p className="mt-6 text-sm leading-6 text-white/50">
          Extended Discovery package prices represent the total selected
          Discovery entitlement. When upgrading an eligible event, the
          organizer pays the applicable difference rather than purchasing the
          full package again.
        </p>
      </Panel>

      <Panel title="Extended Discovery rules" eyebrow="Eligibility">
        <div className="grid gap-4 md:grid-cols-2">
          <Note
            title="Included first"
            text="The final 14 days before the event are already included at no charge."
          />

          <Note
            title="No elapsed time"
            text="HypeKnight does not sell Discovery time that has already passed or can no longer provide a benefit."
          />

          <Note
            title="Inside the free window"
            text="Once an event is already inside its included 14-day Discovery Window, Extended Discovery does not provide backward benefit and should not be sold."
          />

          <Note
            title="Normal maximum"
            text="The normal maximum Discovery entitlement is 60 days before the event."
          />
        </div>
      </Panel>

      <Panel title="Featured" eyebrow="More Attention">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.75fr]">
          <div>
            <h3 className="text-2xl font-black text-white">
              Premium attention inside Discovery.
            </h3>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/60">
              Featured is separate from Extended Discovery. Extended Discovery
              gives an event more time to be eligible for discovery. Featured
              gives an eligible event additional visibility on selected dates
              while it is already inside its active Discovery Window.
            </p>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/60">
              Featured inventory is market- and date-specific. Capacity,
              availability, and pricing can vary by market and date, and
              organizers may select individual available dates.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">
              Featured Pricing
            </p>

            <p className="mt-3 text-3xl font-black text-white">
              Varies by market &amp; date
            </p>

            <p className="mt-4 text-sm leading-6 text-white/60">
              Featured capacity is limited. Purchasing Featured does not
              guarantee views, attendance, ticket sales, or other results.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="What you do not have to buy" eyebrow="Free By Default">
        <div className="grid gap-4 md:grid-cols-2">
          <Note
            title="No listing fee"
            text="Payment is not required simply to create or publish an approved HypeKnight event."
          />

          <Note
            title="No enhancement requirement"
            text="Extended Discovery and Featured are optional. Neither is required for an approved event to have a public page or receive its included Discovery Window."
          />

          <Note
            title="Keep your ticket provider"
            text="HypeKnight is not your ticket checkout provider. You can continue using Eventbrite, Ticketmaster, your own ticketing system, or another supported destination."
          />

          <Note
            title="Public page is separate"
            text="Approval activates the public event page. Discovery eligibility is a separate lifecycle and begins according to the event's Discovery Window."
          />
        </div>
      </Panel>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-center sm:rounded-[2.75rem] sm:p-10">
        <SectionHeader
          eyebrow="Start Free"
          title="Ready to put your event on HypeKnight?"
          text="Create the event, submit it for review, and use optional enhancements only when they make sense for your campaign."
        />

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink
            href="/dashboard/events/new/step-1"
            variant="primary"
          >
            Post an Event
          </ButtonLink>

          <ButtonLink href="/promote" variant="secondary">
            Learn About Promotion
          </ButtonLink>
        </div>
      </section>

      <p className="text-center text-xs leading-5 text-white/40">
        Enhancement pricing and availability may be updated as HypeKnight
        markets, inventory, and platform capabilities evolve.
      </p>
    </section>
  );
}

function Package({
  title,
  days,
  price,
  text,
  active,
}: {
  title: string;
  days: string;
  price: string;
  text: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-[2rem] border p-6 ${
        active
          ? 'border-accent/20 bg-accent/10'
          : 'border-white/10 bg-black/20'
      }`}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">
        {days}
      </p>

      <h3 className="mt-2 text-lg font-black text-white">
        {title}
      </h3>

      <p className="mt-3 text-3xl font-black text-accent">
        {price}
      </p>

      <p className="mt-4 text-sm leading-6 text-white/60">
        {text}
      </p>
    </div>
  );
}

function Note({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="text-xl font-black text-white">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-white/60">
        {text}
      </p>
    </div>
  );
}
