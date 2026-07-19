import Link from 'next/link';
import {
  checkIntoPatronPulse,
  submitPatronPulseResponse,
} from '@/app/events/patron-pulse/actions';

type PulseOption = {
  id: string;
  label: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
};

type PulseRecord = {
  id: string;
  pulse_type: string;
  title: string;
  prompt: string | null;
  description: string | null;
  status: string;
  results_visibility: string;
  allow_multiple_responses: boolean;
  opens_at: string | null;
  closes_at: string | null;
  sort_order: number;
  options: PulseOption[] | null;
};

type AnnouncementRecord = {
  id: string;
  title: string;
  message: string;
  priority: string;
  published_at: string | null;
  expires_at: string | null;
};

type ViewerResponse = {
  id: string;
  pulse_id: string;
  option_id: string | null;
  text_response: string | null;
  numeric_response: number | null;
  boolean_response: boolean | null;
  submitted_at: string;
};

type Props = {
  eventId: string;
  eventSlug: string;
  eventName: string;
  userId?: string | null;
  session: {
    id: string;
    title: string;
    status: string;
    check_in_enabled: boolean;
    announcements_enabled: boolean;
    responses_visible: boolean;
  } | null;
  pulses: PulseRecord[];
  announcements: AnnouncementRecord[];
  viewerCheckin: {
    id: string;
    status: string;
    checked_in_at: string;
    last_active_at: string;
  } | null;
  viewerResponses: ViewerResponse[];
};

export default function PatronPulseGuestPanel({
  eventId,
  eventSlug,
  eventName,
  userId,
  session,
  pulses,
  announcements,
  viewerCheckin,
  viewerResponses,
}: Props) {
  if (!session) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Patron Pulse
        </p>

        <h2 className="mt-2 text-3xl font-black text-white">
          The live guest experience is not open yet.
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
          When Patron Pulse opens for {eventName}, this section can
          deliver check-in, announcements, live questions, voting,
          requests, challenges, and other in-house interactions directly
          to your phone.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <FeatureChip label="Guest Check-In" />
          <FeatureChip label="Live Pulses" />
          <FeatureChip label="Announcements" />
          <FeatureChip label="Audience Input" />
        </div>
      </section>
    );
  }

  const isCheckedIn =
    viewerCheckin?.status === 'checked_in';

  const responseByPulse = new Map(
    viewerResponses.map((response) => [
      response.pulse_id,
      response,
    ])
  );

  const activePulses = [...pulses]
    .filter((pulse) =>
      ['scheduled', 'open', 'closed'].includes(
        pulse.status
      )
    )
    .sort(
      (a, b) =>
        Number(a.sort_order || 0) -
        Number(b.sort_order || 0)
    );

  return (
    <section className="overflow-hidden rounded-[2rem] border border-accent/20 bg-gradient-to-br from-accent/10 via-white/5 to-black/20 sm:rounded-[2.75rem]">
      <div className="border-b border-white/10 p-5 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-accent">
              Patron Pulse
            </p>

            <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              {session.title || 'Live Event Experience'}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65">
              Patron Pulse connects the people inside this event.
              Check in, receive live updates, and respond when the
              organizer opens a pulse.
            </p>
          </div>

          <SessionStatus status={session.status} />
        </div>

        {!userId ? (
          <div className="mt-6 rounded-2xl border border-accent/20 bg-black/20 p-5">
            <h3 className="text-xl font-black text-white">
              Sign in to participate.
            </h3>

            <p className="mt-2 text-sm leading-6 text-white/60">
              You can view public updates, but check-in and pulse
              responses require a HypeKnight account.
            </p>

            <Link
              href={`/auth/login?redirect=${encodeURIComponent(
                `/events/${eventSlug}`
              )}`}
              className="mt-5 inline-flex rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              Sign In to Join
            </Link>
          </div>
        ) : session.check_in_enabled &&
          !isCheckedIn ? (
          <form
            action={checkIntoPatronPulse}
            className="mt-6 rounded-2xl border border-accent/20 bg-black/20 p-5"
          >
            <input
              type="hidden"
              name="event_id"
              value={eventId}
            />

            <input
              type="hidden"
              name="slug"
              value={eventSlug}
            />

            <h3 className="text-xl font-black text-white">
              Check in to the experience.
            </h3>

            <p className="mt-2 text-sm leading-6 text-white/60">
              Checking in lets the event know you are participating
              and unlocks available live pulses.
            </p>

            <button className="mt-5 rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90">
              Check In
            </button>
          </form>
        ) : isCheckedIn ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
            <span className="text-lg">✓</span>

            <div>
              <p className="font-semibold text-green-100">
                You are checked in.
              </p>

              <p className="text-sm text-green-100/60">
                Your input can now become part of the night.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-8 p-5 sm:p-8">
        {session.announcements_enabled &&
        announcements.length ? (
          <section>
            <SectionHeading
              eyebrow="Live Updates"
              title="Announcements"
            />

            <div className="mt-4 space-y-3">
              {announcements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <SectionHeading
            eyebrow="Your Input"
            title="Live Pulses"
          />

          {!activePulses.length ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="font-semibold text-white">
                No pulse is active right now.
              </p>

              <p className="mt-2 text-sm leading-6 text-white/50">
                Stay on this page. New prompts and decisions can
                appear as the event develops.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-5">
              {activePulses.map((pulse) => (
                <PulseCard
                  key={pulse.id}
                  pulse={pulse}
                  eventId={eventId}
                  eventSlug={eventSlug}
                  userId={userId}
                  checkedIn={isCheckedIn}
                  viewerResponse={
                    responseByPulse.get(pulse.id) ||
                    null
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function PulseCard({
  pulse,
  eventId,
  eventSlug,
  userId,
  checkedIn,
  viewerResponse,
}: {
  pulse: PulseRecord;
  eventId: string;
  eventSlug: string;
  userId?: string | null;
  checkedIn: boolean;
  viewerResponse: ViewerResponse | null;
}) {
  const isOpen = pulse.status === 'open';
  const isClosed = pulse.status === 'closed';

  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <FeatureChip
              label={formatLabel(pulse.pulse_type)}
            />

            <PulseStatus status={pulse.status} />
          </div>

          <h3 className="mt-4 text-2xl font-black text-white">
            {pulse.title}
          </h3>

          {pulse.prompt ? (
            <p className="mt-3 text-base leading-7 text-white/75">
              {pulse.prompt}
            </p>
          ) : null}

          {pulse.description ? (
            <p className="mt-2 text-sm leading-6 text-white/50">
              {pulse.description}
            </p>
          ) : null}
        </div>

        <PulseTiming
          opensAt={pulse.opens_at}
          closesAt={pulse.closes_at}
        />
      </div>

      {viewerResponse ? (
        <SubmittedState
          pulse={pulse}
          response={viewerResponse}
        />
      ) : !userId ? (
        <LockedState text="Sign in to answer this pulse." />
      ) : !checkedIn ? (
        <LockedState text="Check in before answering live pulses." />
      ) : !isOpen ? (
        <LockedState
          text={
            isClosed
              ? 'This pulse has closed.'
              : 'This pulse is scheduled and not open yet.'
          }
        />
      ) : pulse.pulse_type === 'feedback' ||
        pulse.pulse_type === 'dj_request' ? (
        <TextResponseForm
          pulseId={pulse.id}
          eventId={eventId}
          eventSlug={eventSlug}
          placeholder={
            pulse.pulse_type === 'dj_request'
              ? 'Enter your song request...'
              : 'Share your response...'
          }
        />
      ) : (
        <OptionResponseForm
          pulse={pulse}
          eventId={eventId}
          eventSlug={eventSlug}
        />
      )}
    </article>
  );
}

function OptionResponseForm({
  pulse,
  eventId,
  eventSlug,
}: {
  pulse: PulseRecord;
  eventId: string;
  eventSlug: string;
}) {
  const options = (pulse.options || [])
    .filter((option) => option.is_active)
    .sort(
      (a, b) =>
        Number(a.sort_order || 0) -
        Number(b.sort_order || 0)
    );

  if (!options.length) {
    return (
      <LockedState text="No response options are available." />
    );
  }

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {options.map((option) => (
        <form
          key={option.id}
          action={submitPatronPulseResponse}
        >
          <input
            type="hidden"
            name="event_id"
            value={eventId}
          />

          <input
            type="hidden"
            name="slug"
            value={eventSlug}
          />

          <input
            type="hidden"
            name="pulse_id"
            value={pulse.id}
          />

          <input
            type="hidden"
            name="option_id"
            value={option.id}
          />

          <button className="h-full w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-accent/40 hover:bg-accent/10">
            <p className="font-semibold text-white">
              {option.icon
                ? `${option.icon} `
                : ''}
              {option.label}
            </p>

            {option.description ? (
              <p className="mt-2 text-sm leading-5 text-white/50">
                {option.description}
              </p>
            ) : null}
          </button>
        </form>
      ))}
    </div>
  );
}

function TextResponseForm({
  pulseId,
  eventId,
  eventSlug,
  placeholder,
}: {
  pulseId: string;
  eventId: string;
  eventSlug: string;
  placeholder: string;
}) {
  return (
    <form
      action={submitPatronPulseResponse}
      className="mt-6"
    >
      <input
        type="hidden"
        name="event_id"
        value={eventId}
      />

      <input
        type="hidden"
        name="slug"
        value={eventSlug}
      />

      <input
        type="hidden"
        name="pulse_id"
        value={pulseId}
      />

      <textarea
        name="text_response"
        required
        rows={4}
        maxLength={500}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-accent/50"
      />

      <button className="mt-3 rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90">
        Submit Response
      </button>
    </form>
  );
}

function SubmittedState({
  pulse,
  response,
}: {
  pulse: PulseRecord;
  response: ViewerResponse;
}) {
  const option = (pulse.options || []).find(
    (item) => item.id === response.option_id
  );

  const answer =
    option?.label ||
    response.text_response ||
    (response.boolean_response === true
      ? 'Yes'
      : response.boolean_response === false
        ? 'No'
        : response.numeric_response !== null
          ? String(response.numeric_response)
          : 'Response submitted');

  return (
    <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-green-200/60">
        Response Submitted
      </p>

      <p className="mt-2 font-semibold text-green-100">
        {answer}
      </p>

      <p className="mt-2 text-sm text-green-100/55">
        Your input is now part of this experience.
      </p>
    </div>
  );
}

function AnnouncementCard({
  announcement,
}: {
  announcement: AnnouncementRecord;
}) {
  const classes =
    announcement.priority === 'urgent'
      ? 'border-red-500/25 bg-red-500/10'
      : announcement.priority === 'high'
        ? 'border-orange-500/25 bg-orange-500/10'
        : 'border-white/10 bg-black/20';

  return (
    <article
      className={`rounded-2xl border p-5 ${classes}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-black text-white">
          {announcement.title}
        </h3>

        <FeatureChip
          label={formatLabel(
            announcement.priority
          )}
        />
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/65">
        {announcement.message}
      </p>
    </article>
  );
}

function LockedState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
      {text}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.24em] text-accent">
        {eyebrow}
      </p>

      <h3 className="mt-2 text-2xl font-black text-white">
        {title}
      </h3>
    </div>
  );
}

function SessionStatus({
  status,
}: {
  status: string;
}) {
  const classes =
    status === 'open'
      ? 'border-green-500/20 bg-green-500/10 text-green-200'
      : status === 'paused'
        ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
        : 'border-white/10 bg-white/5 text-white/60';

  return (
    <span
      className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${classes}`}
    >
      {status === 'open'
        ? 'Pulse Open'
        : formatLabel(status)}
    </span>
  );
}

function PulseStatus({
  status,
}: {
  status: string;
}) {
  return (
    <FeatureChip
      label={
        status === 'open'
          ? 'Open Now'
          : formatLabel(status)
      }
    />
  );
}

function PulseTiming({
  opensAt,
  closesAt,
}: {
  opensAt: string | null;
  closesAt: string | null;
}) {
  const text = closesAt
    ? `Closes ${formatDate(closesAt)}`
    : opensAt
      ? `Opens ${formatDate(opensAt)}`
      : null;

  if (!text) {
    return null;
  }

  return (
    <p className="shrink-0 text-xs text-white/40">
      {text}
    </p>
  );
}

function FeatureChip({
  label,
}: {
  label: string;
}) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">
      {label}
    </span>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'later';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}