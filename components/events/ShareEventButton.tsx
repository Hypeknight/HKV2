'use client';

import { useMemo, useState } from 'react';

type ShareChannel =
  | 'native_share'
  | 'copy_link'
  | 'sms'
  | 'email';

type Props = {
  eventId: string;
  eventName: string;
  eventPath: string;
  locationText?: string | null;
  startsAt?: string | null;
};

export default function ShareEventButton({
  eventId,
  eventName,
  eventPath,
  locationText,
  startsAt,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return eventPath;
    }

    return new URL(
      eventPath,
      window.location.origin
    ).toString();
  }, [eventPath]);

  const shareText = useMemo(() => {
    const parts = [
      eventName,
      startsAt ? formatDate(startsAt) : null,
      locationText || null,
    ].filter(Boolean);

    return parts.join(' · ');
  }, [eventName, startsAt, locationText]);

  async function recordShare(
    channel: ShareChannel
  ) {
    try {
      await fetch('/api/events/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          channel,
        }),
      });
    } catch (error) {
      console.error(
        'Unable to record event share:',
        error
      );
    }
  }

  async function handleNativeShare() {
    if (!navigator.share) {
      setOpen(true);
      return;
    }

    try {
      await navigator.share({
        title: eventName,
        text: shareText,
        url: shareUrl,
      });

      await recordShare('native_share');
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return;
      }

      console.error('Native sharing failed:', error);
      setOpen(true);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        shareUrl
      );

      setCopied(true);
      await recordShare('copy_link');

      window.setTimeout(
        () => setCopied(false),
        2200
      );
    } catch (error) {
      console.error(
        'Unable to copy event link:',
        error
      );
    }
  }

  function handleSms() {
    void recordShare('sms');

    window.location.href = `sms:?&body=${encodeURIComponent(
      `${shareText}\n${shareUrl}`
    )}`;
  }

  function handleEmail() {
    void recordShare('email');

    window.location.href = `mailto:?subject=${encodeURIComponent(
      eventName
    )}&body=${encodeURIComponent(
      `${shareText}\n\n${shareUrl}`
    )}`;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleNativeShare}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-3 font-semibold text-white hover:border-accent/40"
      >
        Share Event
      </button>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-2 w-full text-sm font-semibold text-white/50 hover:text-accent"
      >
        More sharing options
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-3 w-full min-w-[260px] rounded-2xl border border-white/10 bg-zinc-950 p-3 shadow-2xl">
          <button
            type="button"
            onClick={handleCopy}
            className={optionClass}
          >
            {copied
              ? 'Link Copied ✓'
              : 'Copy Link'}
          </button>

          <button
            type="button"
            onClick={handleSms}
            className={optionClass}
          >
            Send by Text
          </button>

          <button
            type="button"
            onClick={handleEmail}
            className={optionClass}
          >
            Send by Email
          </button>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white/45 hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

const optionClass =
  'w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-white/75 hover:bg-white/5 hover:text-accent';