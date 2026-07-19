import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveEffectiveSystemTier } from '@/lib/systems/resolve-effective-tier';
import PatronPulseAutoRefresh from '@/components/patron-pulse/PatronPulseAutoRefresh';
import PulseResultsPanel, { type PatronPulseResultSummary } from '@/components/patron-pulse/PulseResultsPanel';
import PatronPulseActivityTimeline, { type PatronPulseActivityItem } from '@/components/patron-pulse/PatronPulseActivityTimeline';
import {
  createPatronPulse,
  createPatronPulseAnnouncement,
  createPatronPulseSession,
  updatePatronPulseAnnouncementStatus,
  updatePatronPulseSessionSettings,
  updatePatronPulseSessionStatus,
  updatePatronPulseStatus,
} from './actions';

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    created?: string;
  }>;
};

export default async function PatronPulseOwnerPage({
  params,
}: Props) {
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
    redirect('/auth/login');
  }

  const [
    { data: event, error: eventError },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from('events')
      .select(`
        id,
        slug,
        name,
        owner_id,
        event_start_at,
        event_end_at,
        venue_name,
        city,
        state
      `)
      .eq('id', id)
      .single(),

    supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  if (eventError || !event) {
    notFound();
  }

  const isOwner = event.owner_id === user.id;
  const isAdmin = profile?.app_role === 'admin';

  if (!isOwner && !isAdmin) {
    redirect('/dashboard/events');
  }

  const entitlement =
    await resolveEffectiveSystemTier({
      supabase,
      eventId: event.id,
      systemSlug: 'patron-pulse',
    });

  const { data: session, error: sessionError } =
    await supabase
      .from('patron_pulse_sessions')
      .select('*')
      .eq('event_id', event.id)
      .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  let pulses: any[] = [];
  let announcements: any[] = [];
  let checkinCount = 0;
  let responseCount = 0;
  let responseRows: any[] = [];
  let activityItems: PatronPulseActivityItem[] = [];

  if (session) {
    const [
      { data: pulseRows, error: pulseError },
      {
        data: announcementRows,
        error: announcementError,
      },
      {
        count: checkins,
        error: checkinError,
      },
      {
        count: responses,
        error: responseError,
      },
      {
        data: detailedResponses,
        error: detailedResponseError,
      },
      {
        data: activityRows,
        error: activityError,
      },
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

      supabase
        .from('patron_pulse_responses')
        .select(`
          id,
          pulse_id,
          option_id,
          text_response,
          numeric_response,
          boolean_response,
          submitted_at
        `)
        .eq('session_id', session.id),

      supabase
        .from('patron_pulse_activity_log')
        .select(`
          id,
          action,
          actor_role,
          from_status,
          to_status,
          note,
          created_at
        `)
        .eq('event_id', event.id)
        .order('created_at', {
          ascending: false,
        })
        .limit(100),
    ]);

    if (pulseError) {
      throw new Error(pulseError.message);
    }

    if (announcementError) {
      throw new Error(
        announcementError.message
      );
    }

    if (checkinError) {
      throw new Error(checkinError.message);
    }

    if (responseError) {
      throw new Error(responseError.message);
    }

    if (detailedResponseError) {
      throw new Error(
        detailedResponseError.message
      );
    }

    if (activityError) {
      throw new Error(activityError.message);
    }

    pulses = pulseRows || [];
    announcements = announcementRows || [];
    checkinCount = checkins || 0;
    responseCount = responses || 0;
    responseRows = detailedResponses || [];
    activityItems =
      (activityRows || []) as PatronPulseActivityItem[];
  }

  const pulseResults: PatronPulseResultSummary[] =
    pulses.map((pulse) => {
      const pulseResponses = responseRows.filter(
        (response) =>
          response.pulse_id === pulse.id
      );

      const totalResponses =
        pulseResponses.length;

      const options = (pulse.options || []).map(
        (option: any) => {
          const count = pulseResponses.filter(
            (response) =>
              response.option_id === option.id
          ).length;

          return {
            optionId: option.id,
            label: option.label,
            count,
            percentage:
              totalResponses > 0
                ? (count / totalResponses) * 100
                : 0,
          };
        }
      );

      return {
        pulseId: pulse.id,
        title: pulse.title,
        status: pulse.status,
        totalResponses,
        options,
      };
    });

  const canUsePulse =
    entitlement.effectiveTierId !== null;

  return (
    <section className="mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PatronPulseAutoRefresh />
        <Link
          href={`/dashboard/events/${event.id}/review`}
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Event Mission Control
        </Link>

        {event.slug ? (
          <Link
            href={`/events/${event.slug}`}
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
          >
            View Public Event
          </Link>
        ) : null}
      </div>

      <section className="rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 sm:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">
          Patron Pulse Control Center
        </p>

        <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">
          {event.name || 'Untitled Event'}
        </h1>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65">
          Create and manage the in-house mobile experience for this event.
          Open check-in, publish announcements, launch pulses, and monitor
          participation.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Effective Tier"
            value={
              entitlement.effectiveTierName ||
              'No Access'
            }
          />

          <Metric
            label="Access Source"
            value={formatLabel(
              entitlement.entitlementSource
            )}
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
            label="Checked In"
            value={String(checkinCount)}
          />

          <Metric
            label="Responses"
            value={String(responseCount)}
          />
        </div>
      </section>

      {!canUsePulse ? (
        <section className="rounded-[2rem] border border-yellow-500/20 bg-yellow-500/10 p-6">
          <h2 className="text-2xl font-black text-yellow-100">
            Patron Pulse is not enabled for this event.
          </h2>

          <p className="mt-3 text-sm leading-7 text-yellow-100/65">
            The event needs a venue entitlement, qualified event purchase,
            or administrative grant before a Pulse session can be created.
          </p>
        </section>
      ) : !session ? (
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-accent">
            Setup
          </p>

          <h2 className="mt-2 text-3xl font-black text-white">
            Create the event’s Pulse session.
          </h2>

          <form
            action={createPatronPulseSession}
            className="mt-6 grid gap-4"
          >
            <input
              type="hidden"
              name="event_id"
              value={event.id}
            />

            <label>
              <span className={labelClass}>
                Session Title
              </span>

              <input
                name="title"
                defaultValue="Live Event Experience"
                className={fieldClass}
              />
            </label>

            <button className={primaryButtonClass}>
              Create Patron Pulse Session
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <Panel
              eyebrow="Session"
              title="Live controls"
            >
              <form
                action={updatePatronPulseSessionSettings}
                className="grid gap-4"
              >
                <input
                  type="hidden"
                  name="event_id"
                  value={event.id}
                />

                <input
                  type="hidden"
                  name="session_id"
                  value={session.id}
                />

                <label>
                  <span className={labelClass}>
                    Session Title
                  </span>

                  <input
                    name="title"
                    defaultValue={session.title}
                    className={fieldClass}
                  />
                </label>

                <Toggle
                  name="check_in_enabled"
                  label="Guest check-in enabled"
                  defaultChecked={
                    session.check_in_enabled
                  }
                />

                <Toggle
                  name="announcements_enabled"
                  label="Announcements enabled"
                  defaultChecked={
                    session.announcements_enabled
                  }
                />

                <Toggle
                  name="responses_visible"
                  label="Guest response state visible"
                  defaultChecked={
                    session.responses_visible
                  }
                />

                <button className={secondaryButtonClass}>
                  Save Session Settings
                </button>
              </form>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {session.status !== 'open' ? (
                  <SessionAction
                    eventId={event.id}
                    sessionId={session.id}
                    status="open"
                    label={
                      session.status === 'cancelled'
                        ? 'Restore and Open Session'
                        : session.status === 'closed'
                          ? 'Reopen Session'
                          : 'Open Session'
                    }
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
              eyebrow="Participation"
              title="Current activity"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Metric
                  label="Active Check-Ins"
                  value={String(checkinCount)}
                />

                <Metric
                  label="Responses"
                  value={String(responseCount)}
                />

                <Metric
                  label="Pulses"
                  value={String(pulses.length)}
                />

                <Metric
                  label="Announcements"
                  value={String(
                    announcements.length
                  )}
                />
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel
              eyebrow="Create"
              title="New pulse"
            >
              <form
                action={createPatronPulse}
                className="grid gap-4"
              >
                <input
                  type="hidden"
                  name="event_id"
                  value={event.id}
                />

                <input
                  type="hidden"
                  name="session_id"
                  value={session.id}
                />

                <label>
                  <span className={labelClass}>
                    Pulse Type
                  </span>

                  <select
                    name="pulse_type"
                    className={fieldClass}
                    defaultValue="poll"
                  >
                    <option value="poll">
                      Poll
                    </option>
                    <option value="yes_no">
                      Yes / No
                    </option>
                    <option value="rating">
                      Rating
                    </option>
                    <option value="dj_request">
                      DJ Request
                    </option>
                    <option value="challenge">
                      Challenge
                    </option>
                    <option value="feedback">
                      Feedback
                    </option>
                  </select>
                </label>

                <label>
                  <span className={labelClass}>
                    Title
                  </span>

                  <input
                    name="title"
                    required
                    className={fieldClass}
                    placeholder="Choose the next song"
                  />
                </label>

                <label>
                  <span className={labelClass}>
                    Prompt
                  </span>

                  <textarea
                    name="prompt"
                    rows={3}
                    className={fieldClass}
                    placeholder="What should happen next?"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((number) => (
                    <label key={number}>
                      <span className={labelClass}>
                        Option {number}
                      </span>

                      <input
                        name={`option_${number}`}
                        className={fieldClass}
                        placeholder={`Option ${number}`}
                      />
                    </label>
                  ))}
                </div>

                <label>
                  <span className={labelClass}>
                    Result Visibility
                  </span>

                  <select
                    name="results_visibility"
                    className={fieldClass}
                    defaultValue="after_close"
                  >
                    <option value="hidden">
                      Hidden
                    </option>
                    <option value="live">
                      Live
                    </option>
                    <option value="after_response">
                      After Guest Responds
                    </option>
                    <option value="after_close">
                      After Pulse Closes
                    </option>
                  </select>
                </label>

                <button className={primaryButtonClass}>
                  Create Draft Pulse
                </button>
              </form>
            </Panel>

            <Panel
              eyebrow="Communication"
              title="New announcement"
            >
              <form
                action={createPatronPulseAnnouncement}
                className="grid gap-4"
              >
                <input
                  type="hidden"
                  name="event_id"
                  value={event.id}
                />

                <input
                  type="hidden"
                  name="session_id"
                  value={session.id}
                />

                <label>
                  <span className={labelClass}>
                    Title
                  </span>

                  <input
                    name="title"
                    required
                    className={fieldClass}
                    placeholder="Doors are now open"
                  />
                </label>

                <label>
                  <span className={labelClass}>
                    Message
                  </span>

                  <textarea
                    name="message"
                    required
                    rows={6}
                    className={fieldClass}
                    placeholder="Tell checked-in guests what they need to know."
                  />
                </label>

                <label>
                  <span className={labelClass}>
                    Priority
                  </span>

                  <select
                    name="priority"
                    className={fieldClass}
                    defaultValue="normal"
                  >
                    <option value="low">
                      Low
                    </option>
                    <option value="normal">
                      Normal
                    </option>
                    <option value="high">
                      High
                    </option>
                    <option value="urgent">
                      Urgent
                    </option>
                  </select>
                </label>

                <Toggle
                  name="publish_now"
                  label="Publish immediately"
                  defaultChecked
                />

                <button className={primaryButtonClass}>
                  Create Announcement
                </button>
              </form>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <PulseResultsPanel
              results={pulseResults}
            />

            <PatronPulseActivityTimeline
              items={activityItems}
            />
          </section>

          <Panel
            eyebrow="Pulse Library"
            title="Created pulses"
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

                        {pulse.options?.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {pulse.options.map(
                              (option: any) => (
                                <Chip
                                  key={option.id}
                                  label={option.label}
                                />
                              )
                            )}
                          </div>
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
                <Empty text="No pulses have been created yet." />
              )}
            </div>
          </Panel>

          <Panel
            eyebrow="Announcement Library"
            title="Announcements"
          >
            <div className="space-y-4">
              {announcements.length ? (
                announcements.map(
                  (announcement) => (
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
                  )
                )
              ) : (
                <Empty text="No announcements have been created yet." />
              )}
            </div>
          </Panel>
        </>
      )}
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

      <p className="mt-3 text-2xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function Toggle({
  name,
  label,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4"
      />

      <span className="text-sm font-semibold text-white/70">
        {label}
      </span>
    </label>
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
    <form action={updatePatronPulseSessionStatus}>
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
    <form action={updatePatronPulseStatus}>
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
    <form
      action={updatePatronPulseAnnouncementStatus}
    >
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
    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">
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

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-accent/50';

const labelClass =
  'mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45';

const primaryButtonClass =
  'w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90';

const secondaryButtonClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-3 font-semibold text-white hover:border-accent/40';