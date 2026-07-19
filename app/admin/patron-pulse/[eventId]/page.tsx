import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  revokePatronPulseAccess,
  updateAdminAnnouncementStatus,
  updateAdminPulseSessionStatus,
  updateAdminPulseStatus,
} from '../actions';

type Props = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function AdminPatronPulseEventPage({
  params,
}: Props) {
  const { eventId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const { data: system, error: systemError } =
    await supabase
      .from('platform_systems')
      .select('id')
      .eq('slug', 'patron-pulse')
      .single();

  if (systemError || !system) {
    throw new Error(
      systemError?.message ||
        'Patron Pulse system not found.'
    );
  }

  const [
    { data: event, error: eventError },
    { data: activation, error: activationError },
    { data: session, error: sessionError },
    { data: tiers, error: tierError },
  ] = await Promise.all([
    supabase
      .from('events')
      .select(`
        id,
        slug,
        name,
        owner_id,
        venue_name,
        city,
        state,
        event_start_at,
        event_end_at
      `)
      .eq('id', eventId)
      .single(),

    supabase
      .from('event_system_activations')
      .select(`
        *,
        tier:system_tiers(
          id,
          name,
          slug,
          rank
        )
      `)
      .eq('event_id', eventId)
      .eq('system_id', system.id)
      .maybeSingle(),

    supabase
      .from('patron_pulse_sessions')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle(),

    supabase
      .from('system_tiers')
      .select('id, name, slug, rank')
      .eq('system_id', system.id)
      .order('rank', { ascending: true }),
  ]);

  if (eventError || !event) {
    notFound();
  }

  if (activationError) {
    throw new Error(activationError.message);
  }

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (tierError) {
    throw new Error(tierError.message);
  }

  let pulses: any[] = [];
  let announcements: any[] = [];
  let checkinCount = 0;
  let responseCount = 0;

  if (session) {
    const [
      { data: pulseRows, error: pulseError },
      {
        data: announcementRows,
        error: announcementError,
      },
      { count: checkins },
      { count: responses },
    ] = await Promise.all([
      supabase
        .from('patron_pulses')
        .select(`
          *,
          options:patron_pulse_options(
            id,
            label,
            sort_order,
            is_active
          )
        `)
        .eq('session_id', session.id)
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('patron_pulse_announcements')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('patron_pulse_checkins')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('session_id', session.id)
        .eq('status', 'checked_in'),

      supabase
        .from('patron_pulse_responses')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('session_id', session.id),
    ]);

    if (pulseError) {
      throw new Error(pulseError.message);
    }

    if (announcementError) {
      throw new Error(
        announcementError.message
      );
    }

    pulses = pulseRows || [];
    announcements = announcementRows || [];
    checkinCount = checkins || 0;
    responseCount = responses || 0;
  }

  const tier = Array.isArray(activation?.tier)
    ? activation?.tier[0] || null
    : activation?.tier || null;

  return (
    <section className="mx-auto max-w-[1500px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/patron-pulse"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Patron Pulse Admin
        </Link>

        {event.slug ? (
          <Link
            href={`/events/${event.slug}`}
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white"
          >
            View Public Event
          </Link>
        ) : null}
      </div>

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Patron Pulse Event Control
        </p>

        <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">
          {event.name || 'Untitled Event'}
        </h1>

        <p className="mt-3 text-white/60">
          {[
            event.venue_name,
            event.city,
            event.state,
          ]
            .filter(Boolean)
            .join(' · ') || 'Location TBA'}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Tier"
            value={tier?.name || 'No Tier'}
          />
          <Metric
            label="Activation"
            value={
              activation
                ? formatLabel(activation.status)
                : 'Missing'
            }
          />
          <Metric
            label="Session"
            value={
              session
                ? formatLabel(session.status)
                : 'Not Created'
            }
          />
          <Metric
            label="Check-Ins"
            value={String(checkinCount)}
          />
          <Metric
            label="Responses"
            value={String(responseCount)}
          />
        </div>
      </section>

      {activation ? (
        <section className="rounded-[2rem] border border-red-500/20 bg-red-500/10 p-6">
          <h2 className="text-2xl font-black text-red-100">
            Administrative access control
          </h2>

          <p className="mt-3 text-sm leading-7 text-red-100/60">
            Revoking access disables the activation,
            cancels its purchase record, and cancels the
            current Pulse session.
          </p>

          <form
            action={revokePatronPulseAccess}
            className="mt-5"
          >
            <input
              type="hidden"
              name="event_id"
              value={event.id}
            />

            <button className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-semibold text-red-100">
              Revoke Patron Pulse Access
            </button>
          </form>
        </section>
      ) : (
        <section className="rounded-[2rem] border border-yellow-500/20 bg-yellow-500/10 p-6">
          <h2 className="text-2xl font-black text-yellow-100">
            No Patron Pulse activation exists.
          </h2>

          <p className="mt-3 text-sm text-yellow-100/60">
            Grant access from an event-level administration
            form before creating a session.
          </p>
        </section>
      )}

      {session ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <Panel
            eyebrow="Session"
            title="Administrative session controls"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {session.status !== 'open' ? (
                <SessionAction
                  eventId={event.id}
                  sessionId={session.id}
                  status="open"
                  label="Open Session"
                  primary
                />
              ) : (
                <SessionAction
                  eventId={event.id}
                  sessionId={session.id}
                  status="paused"
                  label="Pause Session"
                />
              )}

              {session.status === 'paused' ? (
                <SessionAction
                  eventId={event.id}
                  sessionId={session.id}
                  status="open"
                  label="Resume Session"
                  primary
                />
              ) : null}

              {!['closed', 'cancelled'].includes(
                session.status
              ) ? (
                <SessionAction
                  eventId={event.id}
                  sessionId={session.id}
                  status="closed"
                  label="Close Session"
                />
              ) : null}
            </div>
          </Panel>

          <Panel
            eyebrow="System"
            title="Current configuration"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Metric
                label="Check-In"
                value={
                  session.check_in_enabled
                    ? 'Enabled'
                    : 'Disabled'
                }
              />

              <Metric
                label="Announcements"
                value={
                  session.announcements_enabled
                    ? 'Enabled'
                    : 'Disabled'
                }
              />

              <Metric
                label="Responses"
                value={
                  session.responses_visible
                    ? 'Visible'
                    : 'Hidden'
                }
              />

              <Metric
                label="Created"
                value={formatDate(session.created_at)}
              />
            </div>
          </Panel>
        </section>
      ) : null}

      <Panel
        eyebrow="Pulse Operations"
        title="Pulses"
      >
        <div className="space-y-4">
          {pulses.length ? (
            pulses.map((pulse) => (
              <article
                key={pulse.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Chip
                        label={formatLabel(
                          pulse.pulse_type
                        )}
                      />
                      <Chip
                        label={formatLabel(
                          pulse.status
                        )}
                      />
                    </div>

                    <h3 className="mt-3 text-xl font-black text-white">
                      {pulse.title}
                    </h3>

                    {pulse.prompt ? (
                      <p className="mt-2 text-sm leading-6 text-white/60">
                        {pulse.prompt}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid min-w-[220px] gap-2">
                    {pulse.status !== 'open' ? (
                      <PulseAction
                        eventId={event.id}
                        pulseId={pulse.id}
                        status="open"
                        label="Open Pulse"
                        primary
                      />
                    ) : (
                      <PulseAction
                        eventId={event.id}
                        pulseId={pulse.id}
                        status="closed"
                        label="Close Pulse"
                      />
                    )}

                    {![
                      'closed',
                      'cancelled',
                    ].includes(pulse.status) ? (
                      <PulseAction
                        eventId={event.id}
                        pulseId={pulse.id}
                        status="cancelled"
                        label="Cancel Pulse"
                      />
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <Empty text="No pulses have been created." />
          )}
        </div>
      </Panel>

      <Panel
        eyebrow="Communication"
        title="Announcements"
      >
        <div className="space-y-4">
          {announcements.length ? (
            announcements.map((announcement) => (
              <article
                key={announcement.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Chip
                        label={formatLabel(
                          announcement.priority
                        )}
                      />
                      <Chip
                        label={formatLabel(
                          announcement.status
                        )}
                      />
                    </div>

                    <h3 className="mt-3 text-xl font-black text-white">
                      {announcement.title}
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/60">
                      {announcement.message}
                    </p>
                  </div>

                  <div className="grid min-w-[220px] gap-2">
                    {announcement.status !==
                    'published' ? (
                      <AnnouncementAction
                        eventId={event.id}
                        announcementId={
                          announcement.id
                        }
                        status="published"
                        label="Publish"
                        primary
                      />
                    ) : (
                      <AnnouncementAction
                        eventId={event.id}
                        announcementId={
                          announcement.id
                        }
                        status="expired"
                        label="Expire"
                      />
                    )}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <Empty text="No announcements have been created." />
          )}
        </div>
      </Panel>
    </section>
  );
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
      <p className="text-xs uppercase tracking-[0.25em] text-accent">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black text-white">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">
        {label}
      </p>
      <p className="mt-3 text-xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function SessionAction({
  eventId,
  sessionId,
  status,
  label,
  primary = false,
}: {
  eventId: string;
  sessionId: string;
  status: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={updateAdminPulseSessionStatus}>
      <input
        type="hidden"
        name="event_id"
        value={eventId}
      />
      <input
        type="hidden"
        name="session_id"
        value={sessionId}
      />
      <input
        type="hidden"
        name="status"
        value={status}
      />
      <button
        className={
          primary
            ? primaryButtonClass
            : secondaryButtonClass
        }
      >
        {label}
      </button>
    </form>
  );
}

function PulseAction({
  eventId,
  pulseId,
  status,
  label,
  primary = false,
}: {
  eventId: string;
  pulseId: string;
  status: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={updateAdminPulseStatus}>
      <input
        type="hidden"
        name="event_id"
        value={eventId}
      />
      <input
        type="hidden"
        name="pulse_id"
        value={pulseId}
      />
      <input
        type="hidden"
        name="status"
        value={status}
      />
      <button
        className={
          primary
            ? primaryButtonClass
            : secondaryButtonClass
        }
      >
        {label}
      </button>
    </form>
  );
}

function AnnouncementAction({
  eventId,
  announcementId,
  status,
  label,
  primary = false,
}: {
  eventId: string;
  announcementId: string;
  status: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={updateAdminAnnouncementStatus}>
      <input
        type="hidden"
        name="event_id"
        value={eventId}
      />
      <input
        type="hidden"
        name="announcement_id"
        value={announcementId}
      />
      <input
        type="hidden"
        name="status"
        value={status}
      />
      <button
        className={
          primary
            ? primaryButtonClass
            : secondaryButtonClass
        }
      >
        {label}
      </button>
    </form>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/65">
      {label}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/55">
      {text}
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

const primaryButtonClass =
  'w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90';

const secondaryButtonClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-3 font-semibold text-white hover:border-accent/40';