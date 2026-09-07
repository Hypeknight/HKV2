import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  discardDraftEvent,
  requestEventRemoval,
  startEventRevision,
} from "@/app/dashboard/events/actions";
import {
  ButtonLink,
  EmptyState,
  EventTime,
  InfoCard,
  MetricCard,
  Panel,
  SectionHeader,
} from "@/components/ui";

type DashboardEvent = {
  id: string;
  slug: string | null;
  name: string | null;
  flyer_url: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  status: string;
  current_step: number | null;
  is_public: boolean | null;
  is_paid: boolean | null;
  payment_status: string | null;
  payment_override: boolean | null;
  total_price: number | string | null;
  event_start_at: string | null;
  promotion_start_at: string | null;
  promotion_end_at: string | null;
  updated_at: string | null;
  rejection_reason: string | null;
  revision_admin_note: string | null;
  removal_reason: string | null;
  refund_status: string | null;

  revision_status: string | null;
  revision_id: string | null;
  revision_admin_feedback: string | null;
};

const PUBLIC_STATUSES = ["scheduled", "active", "live"];
const EDITABLE_STATUSES = ["draft", "building", "rejected", "revision_draft"];

export default async function DashboardEventsPage() {
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

  const { data: events, error } = await supabase
    .from("events")
    .select(
      `
      id,
      slug,
      name,
      flyer_url,
      venue_name,
      city,
      state,
      status,
      current_step,
      is_public,
      is_paid,
      payment_status,
      payment_override,
      total_price,
      event_start_at,
      promotion_start_at,
      promotion_end_at,
      updated_at,
      rejection_reason,
      revision_admin_note,
      removal_reason,
      refund_status
    `,
    )
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const baseEventRows = (events ?? []) as Omit<
    DashboardEvent,
    "revision_status" | "revision_id" | "revision_admin_feedback"
  >[];

  const eventIds = baseEventRows.map((event) => event.id);

  let revisionMap = new Map<
    string,
    {
      id: string;
      status: string;
      admin_note: string | null;
    }
  >();

  if (eventIds.length) {
    const { data: revisions, error: revisionsError } = await supabase
      .from("event_revisions")
      .select("id,event_id,status,admin_note")
      .in("event_id", eventIds)
      .in("status", ["draft", "submitted", "rejected"]);

    if (revisionsError) {
      throw new Error(revisionsError.message);
    }

    revisionMap = new Map(
      (revisions ?? []).map((revision) => [
        revision.event_id,
        {
          id: revision.id,
          status: revision.status,
          admin_note: revision.admin_note,
        },
      ]),
    );
  }

  const eventRows: DashboardEvent[] = baseEventRows.map((event) => {
    const revision = revisionMap.get(event.id);

    return {
      ...event,
      revision_status: revision?.status ?? null,
      revision_id: revision?.id ?? null,
      revision_admin_feedback: revision?.admin_note ?? null,
    };
  });

  const needsAction = eventRows.filter(
    (event) =>
      [
        "draft",
        "building",
        "rejected",
        "revision_draft",
        "approved_unpaid",
        "approved_awaiting_payment",
      ].includes(event.status) ||
      ["draft", "rejected"].includes(event.revision_status || ""),
  );

  const pending = eventRows.filter(
    (event) =>
      ["submitted", "paid_awaiting_approval", "revision_submitted"].includes(
        event.status,
      ) || event.revision_status === "submitted",
  );

  const active = eventRows.filter((event) =>
    PUBLIC_STATUSES.includes(event.status),
  );

  const requests = eventRows.filter((event) =>
    ["removal_requested", "refund_requested", "cancelled"].includes(
      event.status,
    ),
  );

  const completed = eventRows.filter((event) =>
    ["ended", "completed", "archived", "removed"].includes(event.status),
  );

  const publicCount = eventRows.filter(
    (event) =>
      event.is_public === true && PUBLIC_STATUSES.includes(event.status),
  ).length;

  const paymentNeededCount = eventRows.filter(
    (event) =>
      ["approved_unpaid", "approved_awaiting_payment"].includes(event.status) &&
      !isFinanciallyEligible(event),
  ).length;

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
          href="/events"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
        >
          Explore Public Events
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_34%)]" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              My Events
            </p>

            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              Your HypeKnight events.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
              Choose an event to open Mission Control, continue work, or check
              its current status.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusChip
                label={`${needsAction.length} need your action`}
                tone={needsAction.length ? "yellow" : "neutral"}
              />

              <StatusChip
                label={`${pending.length} under review`}
                tone={pending.length ? "blue" : "neutral"}
              />

              <StatusChip label={`${publicCount} public`} tone="green" />
            </div>
          </div>

          <div className="shrink-0">
            <ButtonLink href="/dashboard/events/new/step-1" variant="primary">
              + Create Event
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-6">
        <MetricCard
          label="Needs Action"
          value={needsAction.length}
          href="#needs-action"
        />

        <MetricCard label="Pending" value={pending.length} href="#pending" />

        <MetricCard label="Public" value={publicCount} href="#active" accent />

        <MetricCard label="Requests" value={requests.length} href="#requests" />

        <MetricCard
          label="Completed"
          value={completed.length}
          href="#completed"
        />

        <MetricCard label="Total" value={eventRows.length} />
      </section>

      {!eventRows.length ? (
        <Panel title="No events yet" eyebrow="Start Here">
          <p className="text-white/65">
            You have not created an event yet. Begin with a draft, complete the
            required information, and submit it to the HypeKnight review
            pipeline when you are ready.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dashboard/events/new/step-1" variant="primary">
              Create Your First Event
            </ButtonLink>

            <ButtonLink href="/events" variant="secondary">
              Explore Events
            </ButtonLink>
          </div>
        </Panel>
      ) : (
        <>
          {needsAction.length ? (
            <EventSection
              id="needs-action"
              eyebrow="Needs Your Attention"
              title="Events waiting on you"
              text="Continue drafts, respond to feedback, or finish revisions that need your attention."
              events={needsAction}
            />
          ) : null}

          {pending.length ? (
            <EventSection
              id="pending"
              eyebrow="Waiting"
              title="Under review"
              text="These events have been submitted and are waiting for an administrator decision."
              events={pending}
            />
          ) : null}

          {active.length ? (
            <EventSection
              id="active"
              eyebrow="Upcoming"
              title="Your public events"
              text="Open an event's Mission Control to manage Discovery, performance, sharing, enhancements, and event changes."
              events={active}
            />
          ) : null}

          {requests.length ? (
            <EventSection
              id="requests"
              eyebrow="Customer Service"
              title="Requests and cancellations"
              text="Removal, refund, and cancellation workflows currently being handled."
              events={requests}
            />
          ) : null}

          {completed.length ? (
            <section id="completed" className="scroll-mt-24">
              <SectionHeader
                eyebrow="History"
                title="Recent past events"
                text="Your most recently completed, archived, or removed events."
              />

              <div className="mt-5 grid gap-4 sm:mt-8">
                {completed.slice(0, 3).map((event) => (
                  <DashboardEventCard key={event.id} event={event} />
                ))}
              </div>

              {completed.length > 3 ? (
                <details className="mt-5 rounded-2xl border border-white/10 bg-white/5">
                  <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-white/70 hover:text-white">
                    View all {completed.length} past events
                  </summary>

                  <div className="grid gap-4 border-t border-white/10 p-4 sm:p-5">
                    {completed.slice(3).map((event) => (
                      <DashboardEventCard key={event.id} event={event} />
                    ))}
                  </div>
                </details>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}

function EventSection({
  id,
  eyebrow,
  title,
  text,
  events,
}: {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  events: DashboardEvent[];
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <SectionHeader eyebrow={eyebrow} title={title} text={text} />

      <div className="mt-5 grid gap-4 sm:mt-8">
        {events.length ? (
          events.map((event) => (
            <DashboardEventCard key={event.id} event={event} />
          ))
        ) : (
          <EmptyState text="No events in this section." />
        )}
      </div>
    </section>
  );
}

function DashboardEventCard({ event }: { event: DashboardEvent }) {
  const canEdit = EDITABLE_STATUSES.includes(event.status);

  const hasDraftRevision = event.revision_status === "draft";
  const hasSubmittedRevision = event.revision_status === "submitted";
  const hasRejectedRevision = event.revision_status === "rejected";

  const canViewPublic =
    Boolean(event.slug) &&
    event.is_public === true &&
    PUBLIC_STATUSES.includes(event.status);

  const canOpenMissionControl =
    PUBLIC_STATUSES.includes(event.status) ||
    ["completed", "ended", "archived", "cancelled", "removal_requested", "refund_requested"].includes(
      event.status,
    );

  const editHref = getEditHref(event);
  const guidance = getOwnerGuidance(event);

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 transition hover:border-white/20">
      <div className="grid gap-0 md:grid-cols-[1fr_auto] md:items-center">
        <div className="p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-[96px_1fr] sm:items-start">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              {event.flyer_url ? (
                <div
                  className="aspect-square bg-cover bg-center"
                  style={{ backgroundImage: `url("${event.flyer_url}")` }}
                />
              ) : (
                <div className="flex aspect-square items-center justify-center p-3 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                    HypeKnight
                  </span>
                </div>
              )}
            </div>

            <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black leading-tight text-white sm:text-2xl">
              {event.name || "Untitled Event"}
            </h2>

            <StatusBadge status={event.status} />

            {hasDraftRevision ? (
              <StatusChip label="Revision Draft" tone="yellow" />
            ) : null}

            {hasSubmittedRevision ? (
              <StatusChip label="Revision Under Review" tone="blue" />
            ) : null}

            {hasRejectedRevision ? (
              <StatusChip label="Revision Needs Changes" tone="red" />
            ) : null}
          </div>

          <p className="mt-2 text-sm text-white/55">
            {event.venue_name || "No venue listed"}
            {" · "}
            {[event.city, event.state].filter(Boolean).join(", ") ||
              "Location pending"}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Starts
              </p>
              <div className="mt-1 text-sm font-semibold text-white/80">
                <EventTime value={event.event_start_at} mode="wall" />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Visibility
              </p>
              <p className="mt-1 text-sm font-semibold text-white/80">
                {canViewPublic
                  ? "Public"
                  : event.is_public
                    ? "Public status pending"
                    : "Not public"}
              </p>
            </div>

            {event.status === "scheduled" ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Discovery
                </p>
                <p className="mt-1 text-sm font-semibold text-white/80">
                  Begins {formatShortDate(event.promotion_start_at)}
                </p>
              </div>
            ) : null}
          </div>

          <div className={`mt-4 rounded-xl border px-4 py-3 ${guidance.panelClass}`}>
            <p className="text-sm font-semibold">{guidance.title}</p>
          </div>

          {event.rejection_reason ||
          event.revision_admin_feedback ||
          event.revision_admin_note ? (
            <p className="mt-3 text-sm leading-6 text-red-200/75">
              <span className="font-semibold text-red-100">
                Admin feedback:
              </span>{" "}
              {event.revision_admin_feedback ||
                event.revision_admin_note ||
                event.rejection_reason}
            </p>
          ) : null}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-5 md:min-w-[220px] md:border-l md:border-t-0">
          <div className="flex flex-col gap-3">
            {canOpenMissionControl ? (
              <Link
                href={`/dashboard/events/${event.id}`}
                className="rounded-xl bg-accent px-5 py-3 text-center text-sm font-black text-black hover:opacity-90"
              >
                Open Mission Control
              </Link>
            ) : null}

            {canEdit ? (
              <Link
                href={editHref}
                className="rounded-xl bg-accent px-5 py-3 text-center text-sm font-black text-black hover:opacity-90"
              >
                {event.status === "rejected"
                  ? "Correct Event"
                  : "Continue Event"}
              </Link>
            ) : null}

            {hasDraftRevision ? (
              <Link
                href={`/dashboard/events/${event.id}/edit`}
                className="rounded-xl bg-accent px-5 py-3 text-center text-sm font-black text-black hover:opacity-90"
              >
                Continue Revision
              </Link>
            ) : null}

            {hasRejectedRevision ? (
              <Link
                href={`/dashboard/events/${event.id}/edit`}
                className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-3 text-center text-sm font-semibold text-yellow-100"
              >
                Correct Revision
              </Link>
            ) : null}

            {hasSubmittedRevision ? (
              <Link
                href={`/dashboard/events/${event.id}/review`}
                className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-5 py-3 text-center text-sm font-semibold text-purple-100"
              >
                View Revision Status
              </Link>
            ) : null}

            {["submitted", "paid_awaiting_approval"].includes(event.status) ? (
              <Link
                href={`/dashboard/events/${event.id}/review`}
                className="rounded-xl border border-white/10 bg-black/20 px-5 py-3 text-center text-sm font-semibold text-white hover:border-accent/40"
              >
                View Review Status
              </Link>
            ) : null}

            {canViewPublic ? (
              <Link
                href={`/events/${event.slug}`}
                className="rounded-xl border border-white/10 bg-black/20 px-5 py-3 text-center text-sm font-semibold text-white hover:border-accent/40"
              >
                View Public Page
              </Link>
            ) : null}

            {["removed"].includes(event.status) ? (
              <Link
                href={`/dashboard/events/${event.id}/review`}
                className="rounded-xl border border-white/10 bg-black/20 px-5 py-3 text-center text-sm font-semibold text-white/70"
              >
                View Record
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
function CompactFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-white/70">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "border-white/10 bg-white/10 text-white",
    building: "border-yellow-500/20 bg-yellow-500/10 text-yellow-200",
    submitted: "border-blue-500/20 bg-blue-500/10 text-blue-200",
    paid_awaiting_approval: "border-blue-500/20 bg-blue-500/10 text-blue-200",
    approved_unpaid: "border-orange-500/20 bg-orange-500/10 text-orange-200",
    approved_awaiting_payment:
      "border-orange-500/20 bg-orange-500/10 text-orange-200",
    revision_draft: "border-yellow-500/20 bg-yellow-500/10 text-yellow-200",
    revision_submitted: "border-blue-500/20 bg-blue-500/10 text-blue-200",
    rejected: "border-red-500/20 bg-red-500/10 text-red-200",
    scheduled: "border-purple-500/20 bg-purple-500/10 text-purple-200",
    active: "border-green-500/20 bg-green-500/10 text-green-200",
    live: "border-green-500/20 bg-green-500/10 text-green-200",
    ended: "border-white/10 bg-white/10 text-white/60",
    completed: "border-white/10 bg-white/10 text-white/60",
    removal_requested: "border-red-500/20 bg-red-500/10 text-red-200",
    refund_requested: "border-red-500/20 bg-red-500/10 text-red-200",
    cancelled: "border-red-500/20 bg-red-500/10 text-red-200",
    removed: "border-white/10 bg-white/10 text-white/60",
    archived: "border-white/10 bg-white/10 text-white/60",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
        map[status] || "border-white/10 bg-white/10 text-white"
      }`}
    >
      {formatStatus(status || "unknown")}
    </span>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "yellow" | "red" | "blue" | "neutral";
}) {
  const styles = {
    green: "border-green-500/20 bg-green-500/10 text-green-200",
    yellow: "border-yellow-500/20 bg-yellow-500/10 text-yellow-200",
    red: "border-red-500/20 bg-red-500/10 text-red-200",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-200",
    neutral: "border-white/10 bg-white/5 text-white/60",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone]}`}
    >
      {label}
    </span>
  );
}

function getEditHref(event: DashboardEvent) {
  if (event.status === "rejected" || event.status === "revision_draft") {
    return `/dashboard/events/${event.id}/review`;
  }

  if (event.current_step === 1) {
    return `/dashboard/events/${event.id}/edit/step-2`;
  }

  if (event.current_step === 2) {
    return `/dashboard/events/${event.id}/edit/step-3`;
  }

  return `/dashboard/events/${event.id}/review`;
}

function getOwnerGuidance(event: DashboardEvent) {
  switch (event.status) {
    case "draft":
    case "building":
      return {
        label: "Action Required",
        tone: "yellow" as const,
        title: "Continue building your event.",
        description:
          "Complete the remaining steps and submit the event when the listing is ready for review.",
        panelClass: "border-yellow-500/20 bg-yellow-500/10 text-yellow-100",
      };

    case "rejected":
    case "revision_draft":
      return {
        label: "Revision Required",
        tone: "red" as const,
        title: "Update the event using the administrator feedback.",
        description:
          "Review the requested changes, update the listing, and submit the revision for another decision.",
        panelClass: "border-red-500/20 bg-red-500/10 text-red-100",
      };

    case "submitted":
    case "paid_awaiting_approval":
      return {
        label: "Admin Review",
        tone: "blue" as const,
        title: "No action is required right now.",
        description:
          "The event is waiting for an administrator to approve it or request changes.",
        panelClass: "border-blue-500/20 bg-blue-500/10 text-blue-100",
      };

    case "revision_submitted":
      return {
        label: "Revision Review",
        tone: "blue" as const,
        title: "Your revision has been submitted.",
        description:
          "An administrator is reviewing the corrected event details.",
        panelClass: "border-blue-500/20 bg-blue-500/10 text-blue-100",
      };

    case "approved_unpaid":
    case "approved_awaiting_payment":
      return {
        label: "Payment Required",
        tone: "yellow" as const,
        title: "The event is approved but not financially cleared.",
        description:
          "Review the payment requirement. The event cannot enter the public pipeline until payment or an approved override is complete.",
        panelClass: "border-yellow-500/20 bg-yellow-500/10 text-yellow-100",
      };

    case "scheduled":
      return {
        label: "Scheduled",
        tone: "green" as const,
        title: "Your event has entered the public pipeline.",
        description:
          "The listing will become visible according to its promotion window and public-state rules.",
        panelClass: "border-green-500/20 bg-green-500/10 text-green-100",
      };

    case "active":
      return {
        label: "Active",
        tone: "green" as const,
        title: "Your event is actively being promoted.",
        description:
          "The listing is currently available in HypeKnight discovery when its public-state requirements are satisfied.",
        panelClass: "border-green-500/20 bg-green-500/10 text-green-100",
      };

    case "live":
      return {
        label: "Live Now",
        tone: "green" as const,
        title: "The event is marked live.",
        description:
          "Customers may currently be viewing this listing as an event taking place now.",
        panelClass: "border-green-500/20 bg-green-500/10 text-green-100",
      };

    case "removal_requested":
    case "refund_requested":
      return {
        label: "Request Pending",
        tone: "yellow" as const,
        title: "Your request is waiting for administrator review.",
        description:
          "No additional request is needed unless an administrator contacts you for more information.",
        panelClass: "border-yellow-500/20 bg-yellow-500/10 text-yellow-100",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        tone: "red" as const,
        title: "This event has been cancelled.",
        description:
          "Review the event details or contact support if you believe the cancellation requires follow-up.",
        panelClass: "border-red-500/20 bg-red-500/10 text-red-100",
      };

    case "removed":
      return {
        label: "Removed",
        tone: "neutral" as const,
        title: "This event is no longer public.",
        description:
          "The listing has completed the removal workflow and remains available here for your records.",
        panelClass: "border-white/10 bg-black/20 text-white",
      };

    case "ended":
    case "completed":
    case "archived":
      return {
        label: "Completed",
        tone: "neutral" as const,
        title: "This event is part of your event history.",
        description: "The active promotion and event lifecycle have ended.",
        panelClass: "border-white/10 bg-black/20 text-white",
      };

    default:
      return {
        label: "Review Details",
        tone: "neutral" as const,
        title: "Review the event for its latest status.",
        description:
          "Open the event details to see any available actions or administrator feedback.",
        panelClass: "border-white/10 bg-black/20 text-white",
      };
  }
}

function isFinanciallyEligible(event: DashboardEvent) {
  return (
    event.is_paid === true ||
    event.payment_status === "paid" ||
    event.payment_override === true ||
    Number(event.total_price || 0) <= 0
  );
}

function getPaymentLabel(event: DashboardEvent) {
  if (event.payment_override) {
    return "Admin override";
  }

  if (event.is_paid || event.payment_status === "paid") {
    return "Paid";
  }

  if (Number(event.total_price || 0) <= 0) {
    return "No balance due";
  }

  return "Payment required";
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatShortDate(value: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const fieldClass =
  "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-accent/50";