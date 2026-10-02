'use client';

import { useState, useTransition } from 'react';
import { issueOfficialEventPresenceCredential } from '@/app/dashboard/events/[id]/patron-pulse/actions';

type IssuedCredential = {
  credential: string;
  credentialId: string;
  credentialType: string;
  eventId: string;
  eventSlug: string;
  validFrom: string | null;
  expiresAt: string | null;
};

type Props = {
  eventId: string;
  eventSlug: string;
  eventIsLive: boolean;
};

export default function OfficialEventQrControl({
  eventId,
  eventSlug,
  eventIsLive,
}: Props) {
  const [issued, setIssued] = useState<IssuedCredential | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const siteUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : '';

  const checkInUrl =
    issued && siteUrl
      ? `${siteUrl}/events/${encodeURIComponent(
          eventSlug
        )}/check-in?credential=${encodeURIComponent(issued.credential)}`
      : null;

  function issueCredential() {
    setError(null);
    setCopied(false);

    startTransition(async () => {
      try {
        const result =
          await issueOfficialEventPresenceCredential(eventId);

        setIssued(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to issue the Official Event QR credential.'
        );
      }
    });
  }

  async function copyCheckInUrl() {
    if (!checkInUrl) return;

    try {
      await navigator.clipboard.writeText(checkInUrl);
      setCopied(true);
    } catch {
      setError('Unable to copy the check-in link on this device.');
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
            Check-In & QR
          </div>

          <h2 className="mt-2 text-2xl font-black text-white">
            Official Event QR
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/60">
            This is the official HypeKnight Event Presence check-in point.
            Guests scan it at the event to verify presence and unlock live
            Patron Pulse participation. A HypeKnight account is not required.
          </p>
        </div>

        <div
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${
            eventIsLive
              ? 'border-green-500/30 bg-green-500/10 text-green-100'
              : 'border-white/10 bg-white/5 text-white/60'
          }`}
        >
          {eventIsLive ? 'ACTIVE — EVENT LIVE' : 'READY — ACTIVATES LIVE'}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        {!issued ? (
          <>
            <p className="text-sm leading-6 text-white/60">
              Generate the official credential when you are ready to prepare
              your event materials. Generating a new credential revokes the
              previous Official Event QR credential.
            </p>

            <button
              type="button"
              onClick={issueCredential}
              disabled={isPending}
              className="mt-4 rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? 'Generating…'
                : 'Generate Official Event QR'}
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-100">
                OFFICIAL CREDENTIAL ISSUED
              </span>

              <span className="text-xs text-white/40">
                {issued.credentialType}
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-white/60">
              The secure credential exists only in this organizer view. The
              database stores its hash, not the raw credential.
            </p>

            {checkInUrl ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
                  Official check-in link
                </div>

                <div className="mt-2 break-all font-mono text-xs text-white/70">
                  {checkInUrl}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyCheckInUrl}
                disabled={!checkInUrl}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40"
              >
                {copied ? 'Copied' : 'Copy Check-In Link'}
              </button>

              <button
                type="button"
                onClick={issueCredential}
                disabled={isPending}
                className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/15 disabled:opacity-40"
              >
                {isPending ? 'Rotating…' : 'Rotate / Reissue'}
              </button>
            </div>

            <div className="mt-4 text-xs leading-5 text-white/40">
              Refreshing or leaving this page removes the raw credential from
              this view. Reissue it only when a replacement QR is required.
            </div>
          </>
        )}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="font-semibold text-white">Download / Print</div>
          <div className="mt-1 text-sm text-white/50">
            Printable official HypeKnight check-in material.
          </div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-white/30">
            QR renderer next
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="font-semibold text-white">
            Full-Screen Display
          </div>
          <div className="mt-1 text-sm text-white/50">
            Designed for venue TVs, projectors and tablets.
          </div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-white/30">
            Coming next
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="font-semibold text-white">
            Official Printed Materials
          </div>
          <div className="mt-1 text-sm text-white/50">
            HypeKnight table cards, posters and event signage.
          </div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-white/30">
            Coming soon
          </div>
        </div>
      </div>
    </section>
  );
}
