"use client";

import { useMemo, useState } from "react";

type Props = {
  eventName: string;
  slug: string;
  flyerUrl?: string | null;
};

export default function PublicEventLinkCard({
  eventName,
  slug,
  flyerUrl,
}: Props) {
  const [copied, setCopied] = useState(false);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/events/${slug}`;
    }

    return `${window.location.origin}/events/${slug}`;
  }, [slug]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  async function shareEvent() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventName,
          text: `Check out ${eventName} on HypeKnight.`,
          url: publicUrl,
        });
        return;
      } catch {
        return;
      }
    }

    await copyLink();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
      <div className="flex items-start gap-4">
        {flyerUrl ? (
          <div
            className="h-16 w-16 shrink-0 rounded-xl border border-white/10 bg-cover bg-center"
            style={{ backgroundImage: `url("${flyerUrl}")` }}
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
            Public Event Link
          </p>

          <p className="mt-2 break-all text-sm font-medium text-white/70">
            {publicUrl}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <a
          href={`/events/${slug}`}
          className="rounded-xl bg-accent px-4 py-3 text-center text-sm font-black text-black hover:opacity-90"
        >
          Open Page
        </a>

        <button
          type="button"
          onClick={copyLink}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:border-accent/40"
        >
          {copied ? "Copied" : "Copy Link"}
        </button>

        <button
          type="button"
          onClick={shareEvent}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:border-accent/40"
        >
          Share Event
        </button>
      </div>
    </div>
  );
}
