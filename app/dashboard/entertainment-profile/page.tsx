import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MetricCard, Panel, SectionHeader } from "@/components/ui";

type EntertainmentMarket = {
  market_id: string;
  market_key: string | null;
  name: string | null;
  primary_city: string | null;
  primary_state: string | null;
  event_count: number;
};

type EntertainmentProfile = {
  version: number;
  event_history: {
    total_events: number;
    live_events: number;
    completed_events: number;
    cancelled_events: number;
    public_events: number;
    upcoming_events: number;
    first_event_at: string | null;
    latest_event_at: string | null;
  };
  market_footprint: {
    distinct_market_count: number;
    markets: EntertainmentMarket[];
  };
  measured_activity: {
    total_signals: number;
    identifiable_contributors: number;
    latest_signal_at: string | null;
    signals_by_type: Record<string, number>;
  };
};

export default async function EntertainmentProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase.rpc(
    "get_my_entertainment_profile_v1",
  );

  if (error) {
    throw new Error(error.message);
  }

  const profile = data as EntertainmentProfile | null;

  if (!profile) {
    throw new Error("Entertainment Profile data was not returned.");
  }

  const history = profile.event_history;
  const footprint = profile.market_footprint;
  const activity = profile.measured_activity;

  const signalEntries = Object.entries(activity.signals_by_type ?? {})
    .map(([signalType, count]) => ({
      signalType,
      count: Number(count),
    }))
    .sort((a, b) => b.count - a.count);

  const hasHistory = history.total_events > 0;

  return (
    <section className="mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Dashboard
        </Link>

        <Link
          href="/dashboard/events"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
        >
          View My Events
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_30%)]" />

        <div className="relative max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Entertainment Profile
          </p>

          <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">
            Your history inside HypeKnight.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/55 sm:text-base">
            Your Entertainment Profile grows from the events you operate,
            the markets where you operate, and the measurable activity those
            events generate across HypeKnight.
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/50">
            This is descriptive evidence, not a rating. HypeKnight is not
            scoring your reputation or interpreting what these results mean.
            Deeper interpretation belongs to Patron Pulse.
          </div>
        </div>
      </section>

      {!hasHistory ? (
        <Panel title="Your Entertainment Profile starts with an event" eyebrow="No History Yet">
          <p className="max-w-3xl text-sm leading-6 text-white/60">
            Once you create and operate events through this account, HypeKnight
            will begin building a persistent history from those events, their
            market footprint, and aggregate activity.
          </p>

          <Link
            href="/dashboard/events/new/step-1"
            className="mt-6 inline-flex rounded-2xl bg-accent px-5 py-3 text-sm font-black text-black hover:opacity-90"
          >
            Create Your First Event
          </Link>
        </Panel>
      ) : (
        <>
          <section>
            <SectionHeader
              eyebrow="Event History"
              title="The events behind your profile"
              text="A factual view of the event history attached to this organizer account."
            />

            <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
              <MetricCard label="Total Events" value={history.total_events} accent />
              <MetricCard label="Upcoming" value={history.upcoming_events} />
              <MetricCard label="Public" value={history.public_events} />
              <MetricCard label="Live" value={history.live_events} />
              <MetricCard label="Completed" value={history.completed_events} />
              <MetricCard label="Cancelled" value={history.cancelled_events} />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <EvidenceCard
                label="First Event Date"
                value={formatDate(history.first_event_at)}
                text="The earliest event date currently attached to your organizer history."
              />

              <EvidenceCard
                label="Latest Event Date"
                value={formatDate(history.latest_event_at)}
                text="The latest scheduled event date currently represented in your history."
              />
            </div>
          </section>

          <section>
            <SectionHeader
              eyebrow="Market Footprint"
              title="Where you have operated"
              text="Markets are HypeKnight's metro-level identities. Physical city and state remain attached to each individual event."
            />

            <div className="mt-5 grid gap-4 sm:mt-8 lg:grid-cols-[280px_1fr]">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                  HypeKnight Markets
                </p>

                <p className="mt-3 text-5xl font-black text-white">
                  {footprint.distinct_market_count}
                </p>

                <p className="mt-3 text-sm leading-6 text-white/45">
                  Distinct registered markets represented by your event history.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {footprint.markets.length ? (
                  footprint.markets.map((market) => (
                    <div
                      key={market.market_id}
                      className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5"
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                        Market
                      </p>

                      <h3 className="mt-2 text-lg font-black text-white">
                        {market.name || "Unnamed Market"}
                      </h3>

                      <p className="mt-1 text-sm text-white/45">
                        {[market.primary_city, market.primary_state]
                          .filter(Boolean)
                          .join(", ")}
                      </p>

                      <p className="mt-4 text-sm font-semibold text-white/70">
                        {market.event_count}{" "}
                        {market.event_count === 1 ? "event" : "events"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 sm:col-span-2 xl:col-span-3">
                    <p className="font-black text-white">
                      No registered market footprint yet.
                    </p>

                    <p className="mt-2 text-sm leading-6 text-white/45">
                      Your events exist in your history, but none are currently
                      attached to a HypeKnight market.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <SectionHeader
              eyebrow="Measured Activity"
              title="What happened around your events"
              text="Aggregate HypeKnight signals generated across the events in your organizer history. No individual user histories are exposed here."
            />

            <div className="mt-5 grid gap-4 sm:mt-8 md:grid-cols-3">
              <EvidenceCard
                label="Tracked Activity"
                value={formatNumber(activity.total_signals)}
                text="Total append-only HypeKnight signal records connected to your events."
              />

              <EvidenceCard
                label="Distinct Contributors"
                value={formatNumber(activity.identifiable_contributors)}
                text="Distinct authenticated users or anonymous sessions where HypeKnight can support the count."
              />

              <EvidenceCard
                label="Latest Activity"
                value={formatDateTime(activity.latest_signal_at)}
                text="Most recent recorded signal attached to one of your events."
              />
            </div>

            <div className="mt-4 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                    Signal Evidence
                  </p>

                  <h3 className="mt-2 text-xl font-black text-white">
                    Activity by signal type
                  </h3>
                </div>

                <p className="text-xs text-white/35">
                  Descriptive only · no performance score
                </p>
              </div>

              {signalEntries.length ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {signalEntries.map(({ signalType, count }) => (
                    <div
                      key={signalType}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3"
                    >
                      <span className="text-sm font-semibold text-white/60">
                        {formatSignalType(signalType)}
                      </span>

                      <span className="text-lg font-black text-white">
                        {formatNumber(count)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-white/45">
                  No HypeKnight signal activity has been recorded for these
                  events yet.
                </p>
              )}
            </div>
          </section>

          <Panel title="What comes next" eyebrow="Profile Intelligence">
            <p className="max-w-4xl text-sm leading-6 text-white/55">
              Entertainment Profile V1 preserves the factual history first.
              Future versions can add stronger attribution, Discovery phase
              separation, Featured performance context, and Patron Pulse
              interpretation without rewriting the underlying event record.
            </p>
          </Panel>
        </>
      )}
    </section>
  );
}

function EvidenceCard({
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
        {label}
      </p>

      <p className="mt-3 text-2xl font-black text-white">{value}</p>

      <p className="mt-2 text-xs leading-5 text-white/40">{text}</p>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "No activity yet";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSignalType(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
