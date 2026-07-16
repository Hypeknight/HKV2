import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  discardDraftEvent,
  requestEventRemoval,
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

  const eventRows = (events ?? []) as DashboardEvent[];

  const needsAction = eventRows.filter((event) =>
    [
      "draft",
      "building",
      "rejected",
      "revision_draft",
      "approved_unpaid",
      "approved_awaiting_payment",
    ].includes(event.status),
  );

  const pending = eventRows.filter((event) =>
    ["submitted", "paid_awaiting_approval", "revision_submitted"].includes(
      event.status,
    ),
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

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Event Management Center
            </p>

            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              Manage your HypeKnight events.
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              See what each event needs next, continue drafts, respond to admin
              feedback, complete payment, track review, and manage public
              listings from one place.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <StatusChip
                label={`${needsAction.length} need your action`}
                tone={needsAction.length ? "yellow" : "neutral"}
              />

              <StatusChip
                label={`${pending.length} waiting on review`}
                tone={pending.length ? "blue" : "neutral"}
              />

              <StatusChip label={`${publicCount} public`} tone="green" />

              <StatusChip
                label={`${paymentNeededCount} need payment`}
                tone={paymentNeededCount ? "red" : "neutral"}
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Create Another Event
            </p>

            <p className="mt-3 text-sm leading-6 text-white/60">
              Start a new draft now. You can save your progress and finish the
              submission later.
            </p>

            <ButtonLink href="/dashboard/events/new/step-1" variant="primary">
              Create New Event
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
              text="Continue drafts, respond to feedback, finish revisions, or complete payment."
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
              eyebrow="Public Pipeline"
              title="Scheduled, active, and live"
              text="These events have cleared the core approval process and are moving through public promotion."
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
            <EventSection
              id="completed"
              eyebrow="History"
              title="Completed or archived events"
              text="Past, removed, archived, or completed event listings."
              events={completed}
            />
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
  const canDiscard = ["draft", "building"].includes(event.status);
  const canRequestRemoval = PUBLIC_STATUSES.includes(event.status);

  const canViewPublic =
    Boolean(event.slug) &&
    event.is_public === true &&
    PUBLIC_STATUSES.includes(event.status);

  const editHref = getEditHref(event);
  const guidance = getOwnerGuidance(event);
  const paymentLabel = getPaymentLabel(event);

  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 sm:rounded-[2.5rem]">
      <div className="grid gap-0 xl:grid-cols-[1fr_300px]">
        <div className="p-5 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black leading-tight text-white sm:text-3xl">
              {event.name || "Untitled Event"}
            </h2>

            <StatusBadge status={event.status} />

            <StatusChip label={guidance.label} tone={guidance.tone} />
          </div>

          <p className="mt-3 text-sm text-white/60">
            {event.venue_name || "No venue listed"} ·{" "}
            {[event.city, event.state].filter(Boolean).join(", ") ||
              "Location pending"}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              label="Starts"
              icon="🕒"
              value={<EventTime value={event.event_start_at} mode="wall" />}
              accent
            />

            <InfoCard
              label="Visibility"
              icon="👁️"
              value={
                canViewPublic
                  ? "Public now"
                  : event.is_public
                    ? "Public status pending"
                    : "Not public"
              }
            />

            <InfoCard label="Payment" icon="💳" value={paymentLabel} />

            <InfoCard
              label="Total"
              icon="💵"
              value={`$${Number(event.total_price || 0).toFixed(2)}`}
            />
          </div>

          <div className={`mt-5 rounded-2xl border p-4 ${guidance.panelClass}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
              What happens next
            </p>

            <p className="mt-2 text-sm font-semibold">{guidance.title}</p>

            <p className="mt-1 text-sm leading-6 opacity-75">
              {guidance.description}
            </p>
          </div>

          {event.rejection_reason || event.revision_admin_note ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
              <p className="font-semibold">Administrator feedback</p>

              <p className="mt-1 text-red-100/75">
                {event.revision_admin_note || event.rejection_reason}
              </p>
            </div>
          ) : null}

          {event.removal_reason ? (
            <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100/80">
              <span className="font-semibold">Removal reason:</span>{" "}
              {event.removal_reason}
            </div>
          ) : null}

          {event.refund_status ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
              Refund status:{" "}
              <span className="font-semibold text-white">
                {formatStatus(event.refund_status)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/10 bg-black/20 p-5 sm:p-6 xl:border-l xl:border-t-0">
          <p className="text-xs uppercase tracking-[0.22em] text-white/40">
            Event Actions
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <Link
              href={`/dashboard/events/${event.id}/review`}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center font-semibold text-white hover:border-accent/40"
            >
              Review Event Details
            </Link>

            {canViewPublic ? (
              <Link
                href={`/events/${event.slug}`}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center font-semibold text-white hover:border-accent/40"
              >
                View Public Event
              </Link>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-sm text-white/40">
                Public page unavailable
              </div>
            )}

            {canEdit ? (
              <Link
                href={editHref}
                className="rounded-2xl bg-accent px-4 py-3 text-center font-semibold text-black hover:opacity-90"
              >
                {event.status === "rejected" ||
                event.status === "revision_draft"
                  ? "Continue Revision"
                  : "Continue / Edit"}
              </Link>
            ) : null}

            {["approved_unpaid", "approved_awaiting_payment"].includes(
              event.status,
            ) && !isFinanciallyEligible(event) ? (
              <Link
                href={`/dashboard/events/${event.id}/review`}
                className="rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-center font-semibold text-green-200 hover:border-green-500/40"
              >
                Review Payment Requirement
              </Link>
            ) : null}

            {canDiscard ? (
              <form action={discardDraftEvent}>
                <input type="hidden" name="event_id" value={event.id} />

                <button
                  type="submit"
                  className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-semibold text-red-200 hover:border-red-500/40"
                >
                  Remove Draft
                </button>
              </form>
            ) : null}

            {canRequestRemoval ? (
              <details className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
                <summary className="cursor-pointer text-sm font-semibold">
                  Request removal or refund
                </summary>

                <form action={requestEventRemoval} className="mt-4 space-y-3">
                  <input type="hidden" name="event_id" value={event.id} />

                  <textarea
                    name="removal_reason"
                    rows={3}
                    required
                    placeholder="Explain why this event should be removed."
                    className={fieldClass}
                  />

                  <select
                    name="refund_requested"
                    defaultValue="no"
                    className={fieldClass}
                  >
                    <option value="no">No refund requested</option>
                    <option value="yes">Request refund review</option>
                  </select>

                  <button
                    type="submit"
                    className="w-full rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 font-semibold text-accent hover:border-accent/40"
                  >
                    Submit Request
                  </button>
                </form>
              </details>
            ) : null}
          </div>

          <div className="mt-5 space-y-3">
            <CompactFact label="Updated" value={formatDate(event.updated_at)} />

            <CompactFact
              label="Promotion Begins"
              value={formatDate(event.promotion_start_at)}
            />

            <CompactFact
              label="Promotion Ends"
              value={formatDate(event.promotion_end_at)}
            />
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