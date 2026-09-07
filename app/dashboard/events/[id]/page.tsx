import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startEventRevision } from "@/app/dashboard/events/actions";
import PublicEventLinkCard from "@/components/events/PublicEventLinkCard";

type Props = {
  params: Promise<{ id: string }>;
};

type RevisionState = {
  id: string;
  status: string;
  revision_reason: string | null;
  admin_note: string | null;
  submitted_at: string | null;
};

const PUBLIC_MANAGEABLE_STATUSES = ["scheduled", "active", "live"];

export default async function EventCommandCenterPage({ params }: Props) {
  const { id } = await params;
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

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(`
      id,
      owner_id,
      slug,
      name,
      flyer_url,
      venue_name,
      city,
      state,
      status,
      is_public,
      is_approved,
      event_start_at,
      event_end_at,
      discovery_start_at,
      discovery_end_at,
      promotion_start_at,
      promotion_end_at,
      included_promo_days,
      extra_promo_days,
      updated_at
    `)
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (eventError || !event) {
    throw new Error(eventError?.message || "Event not found.");
  }

  const { data: revision, error: revisionError } = await supabase
    .from("event_revisions")
    .select(`
      id,
      status,
      revision_reason,
      admin_note,
      submitted_at
    `)
    .eq("event_id", id)
    .eq("created_by", user.id)
    .in("status", ["draft", "submitted", "rejected"])
    .maybeSingle();

  if (revisionError) {
    throw new Error(revisionError.message);
  }

  const activeRevision = revision as RevisionState | null;

  const discoveryStart =
    event.discovery_start_at || event.promotion_start_at || null;

  const discoveryEnd =
    event.discovery_end_at ||
    event.promotion_end_at ||
    event.event_end_at ||
    event.event_start_at ||
    null;

  const discovery = getDiscoveryState({
    status: event.status,
    discoveryStart,
    discoveryEnd,
    eventStart: event.event_start_at,
    eventEnd: event.event_end_at,
  });

  const canViewPublic =
    Boolean(event.slug) &&
    event.is_public === true &&
    event.is_approved === true;

  const canStartRevision =
    PUBLIC_MANAGEABLE_STATUSES.includes(event.status) && !activeRevision;

  const includedDays = Number(event.included_promo_days || 14);
  const extraDays = Number(event.extra_promo_days || 0);
  const totalDiscoveryDays = includedDays + extraDays;

  return (
    <main className="mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/events"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          My Events
        </Link>

        {canViewPublic ? (
          <Link
            href={`/events/${event.slug}`}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:border-accent/40"
          >
            View Public Event
          </Link>
        ) : null}
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_32%)]" />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Event Mission Control
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-black leading-none text-white sm:text-6xl">
              {event.name || "Untitled Event"}
            </h1>

            <StatusPill label={formatStatus(event.status)} />
          </div>

          <p className="mt-4 text-sm leading-6 text-white/60">
            {event.venue_name || "No venue listed"}
            {" · "}
            {[event.city, event.state].filter(Boolean).join(", ") ||
              "Location pending"}
          </p>

          <p className="mt-5 max-w-3xl text-sm leading-6 text-white/50">
            Track your event's public status, Discovery Window, revisions,
            performance, and available enhancements from one place.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Event State"
          value={formatStatus(event.status)}
          detail={getLifecycleDetail(event.status)}
        />

        <Metric
          label="Public Page"
          value={canViewPublic ? "Public now" : "Not public"}
          detail={
            canViewPublic
              ? "Your approved event page can be reached directly."
              : "The public page is not currently available."
          }
        />

        <Metric
          label="Discovery"
          value={discovery.label}
          detail={discovery.detail}
          accent
        />

        <Metric
          label="Revision"
          value={
            activeRevision
              ? formatRevisionStatus(activeRevision.status)
              : "No open revision"
          }
          detail={getRevisionDetail(activeRevision)}
        />
      </section>

      {canViewPublic && event.slug ? (
        <PublicEventLinkCard
          eventName={event.name || "HypeKnight Event"}
          slug={event.slug}
          flyerUrl={event.flyer_url}
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.45fr_.85fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">
              Discovery
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Your event's Discovery Window
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
              Approval makes your event page public immediately. Discovery
              controls when HypeKnight actively surfaces the event.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Fact
                label="Discovery begins"
                value={formatDate(discoveryStart)}
              />

              <Fact
                label="Discovery ends"
                value={formatDate(discoveryEnd)}
              />

              <Fact
                label="Included Discovery"
                value={`${includedDays} days`}
              />

              <Fact
                label="Total Discovery"
                value={`${totalDiscoveryDays} days`}
                detail={
                  extraDays > 0
                    ? `${extraDays} Extended Discovery days added`
                    : "No Extended Discovery added"
                }
              />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="font-semibold text-white">{discovery.label}</p>
              <p className="mt-1 text-sm leading-6 text-white/50">
                {discovery.detail}
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">
              Performance
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Event signals
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/50">
              HypeKnight is collecting eligible event activity for your event.
              The next Mission Control checkpoint will turn those raw signals
              into organizer-facing performance reporting.
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-semibold text-white">
                HypeKnight shows you what happened.
              </p>
              <p className="mt-1 text-sm text-white/45">
                Patron Pulse will add the intelligence layer that helps explain
                what those signals mean.
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">
              What needs attention
            </p>

            <div className="mt-5">
              <AttentionState
                eventId={event.id}
                revision={activeRevision}
                canStartRevision={canStartRevision}
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">
              Event tools
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <Link
                href={`/dashboard/events/${event.id}/review`}
                className={secondaryButton}
              >
                Review Event Details
              </Link>

              {canViewPublic ? (
                <Link
                  href={`/events/${event.slug}`}
                  className={secondaryButton}
                >
                  View Public Event
                </Link>
              ) : null}

              <Link
                href={`/dashboard/events/${event.id}/patron-pulse`}
                className={secondaryButton}
              >
                Patron Pulse
              </Link>

              <Link
                href={`/dashboard/events/${event.id}/linkdn`}
                className={secondaryButton}
              >
                Linkd'N
              </Link>

              <Link
                href={`/dashboard/events/${event.id}/sources`}
                className={secondaryButton}
              >
                Event Sources
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function AttentionState({
  eventId,
  revision,
  canStartRevision,
}: {
  eventId: string;
  revision: RevisionState | null;
  canStartRevision: boolean;
}) {
  if (revision?.status === "submitted") {
    return (
      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5">
        <p className="font-semibold text-purple-100">
          Revision awaiting approval
        </p>
        <p className="mt-2 text-sm leading-6 text-purple-100/60">
          Your currently approved event remains public while HypeKnight reviews
          the proposed changes.
        </p>

        <Link
          href={`/dashboard/events/${eventId}/review`}
          className="mt-4 block rounded-xl border border-purple-500/20 px-4 py-3 text-center text-sm font-semibold text-purple-100"
        >
          Review Revision Status
        </Link>
      </div>
    );
  }

  if (revision?.status === "draft") {
    return (
      <div>
        <p className="font-semibold text-white">Revision draft in progress</p>
        <p className="mt-2 text-sm leading-6 text-white/45">
          Continue editing or cancel the revision from the review workflow.
        </p>

        <Link
          href={`/dashboard/events/${eventId}/edit`}
          className={primaryButton}
        >
          Continue Revision
        </Link>
      </div>
    );
  }

  if (revision?.status === "rejected") {
    return (
      <div>
        <p className="font-semibold text-yellow-100">
          Revision needs correction
        </p>

        {revision.admin_note ? (
          <p className="mt-2 text-sm leading-6 text-yellow-100/60">
            {revision.admin_note}
          </p>
        ) : null}

        <Link
          href={`/dashboard/events/${eventId}/edit`}
          className={primaryButton}
        >
          Correct Revision
        </Link>
      </div>
    );
  }

  if (canStartRevision) {
    return (
      <div>
        <p className="font-semibold text-white">No action required</p>
        <p className="mt-2 text-sm leading-6 text-white/45">
          Your event is operating normally. Start a revision only when you need
          to change the approved event.
        </p>

        <form action={startEventRevision} className="mt-4">
          <input type="hidden" name="event_id" value={eventId} />

          <button
            type="submit"
            className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-black text-black hover:opacity-90"
          >
            Revise Event
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <p className="font-semibold text-white">No action required</p>
      <p className="mt-2 text-sm leading-6 text-white/45">
        HypeKnight will surface the next available action here.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.75rem] border p-5 ${
        accent
          ? "border-accent/20 bg-accent/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-white/45">{detail}</p>
    </div>
  );
}

function Fact({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>
      <p className="mt-2 font-bold text-white">{value}</p>
      {detail ? (
        <p className="mt-1 text-xs leading-5 text-white/40">{detail}</p>
      ) : null}
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/65">
      {label}
    </span>
  );
}

function getDiscoveryState({
  status,
  discoveryStart,
  discoveryEnd,
  eventStart,
  eventEnd,
}: {
  status: string;
  discoveryStart: string | null;
  discoveryEnd: string | null;
  eventStart: string | null;
  eventEnd: string | null;
}) {
  if (["completed", "ended", "archived"].includes(status)) {
    return {
      label: "Completed",
      detail:
        "Active Discovery has ended. The event remains part of your event history.",
    };
  }

  if (status === "cancelled") {
    return {
      label: "Cancelled",
      detail:
        "The event has been removed from active Discovery while its public history may remain available.",
    };
  }

  const now = new Date();
  const start = discoveryStart ? new Date(discoveryStart) : null;
  const end = discoveryEnd ? new Date(discoveryEnd) : null;
  const liveStart = eventStart ? new Date(eventStart) : null;
  const liveEnd = eventEnd ? new Date(eventEnd) : null;

  if (
    status === "live" ||
    (liveStart &&
      now >= liveStart &&
      (!liveEnd || now <= liveEnd))
  ) {
    return {
      label: "Live",
      detail:
        "The event is happening now. Eligible night-of engagement and experience signals continue accumulating.",
    };
  }

  if (
    status === "active" ||
    (start && now >= start && (!end || now <= end))
  ) {
    return {
      label: "Discoverable",
      detail:
        "The event is inside its active Discovery Window and is eligible to be surfaced through HypeKnight Discovery.",
    };
  }

  if (status === "scheduled" && start && now < start) {
    return {
      label: "Pre-Discovery",
      detail:
        "The public event page is available now. Normal Discovery begins when the Discovery Window opens.",
    };
  }

  return {
    label: formatStatus(status),
    detail:
      "HypeKnight will update this state automatically as the event moves through its lifecycle.",
  };
}

function getLifecycleDetail(status: string) {
  switch (status) {
    case "scheduled":
      return "Approved and scheduled. The public page is available.";
    case "active":
      return "The event is inside its active Discovery Window.";
    case "live":
      return "The event is currently happening.";
    case "completed":
    case "ended":
      return "The event has completed and remains in history.";
    case "cancelled":
      return "The event has been cancelled.";
    default:
      return "Current HypeKnight lifecycle state.";
  }
}

function getRevisionDetail(revision: RevisionState | null) {
  if (!revision) {
    return "The approved event has no pending changes.";
  }

  if (revision.status === "submitted") {
    return "Proposed changes are awaiting HypeKnight review.";
  }

  if (revision.status === "rejected") {
    return "Admin feedback is available and the revision can be corrected.";
  }

  return "A revision draft is currently in progress.";
}

function formatRevisionStatus(status: string) {
  if (status === "submitted") return "Awaiting approval";
  if (status === "rejected") return "Needs correction";
  if (status === "draft") return "Draft in progress";
  return formatStatus(status);
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const primaryButton =
  "mt-4 block rounded-xl bg-accent px-4 py-3 text-center text-sm font-black text-black hover:opacity-90";

const secondaryButton =
  "rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center text-sm font-semibold text-white hover:border-accent/40";
