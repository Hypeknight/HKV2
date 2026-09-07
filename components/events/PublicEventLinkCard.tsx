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
    <section className="overflow-hidden rounded-[2rem] border border-accent/20 bg-accent/10">
      <div className="grid md:grid-cols-[220px_1fr]">
        <div className="relative min-h-[180px] overflow-hidden bg-black/30 md:min-h-full">
          {flyerUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${flyerUrl}")` }}
            />
          ) : (
            <div className="flex h-full min-h-[180px] items-center justify-center p-6 text-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                  HypeKnight
                </p>
                <p className="mt-2 text-sm text-white/40">
                  Event image unavailable
                </p>
              </div>
            </div>
          )}

          {flyerUrl ? (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          ) : null}
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Public Event Link
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Your event is public.
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            Share this link anywhere you promote your event. Visitors can use
            it to open the event directly on HypeKnight.
          </p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            <p className="break-all px-4 py-4 text-sm font-medium text-white/75">
              {publicUrl}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <a
              href={`/events/${slug}`}
              className="rounded-xl bg-accent px-4 py-3 text-center text-sm font-black text-black hover:opacity-90"
            >
              Open Public Page
            </a>

            <button
              type="button"
              onClick={copyLink}
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:border-accent/40"
            >
              {copied ? "Link Copied" : "Copy Link"}
            </button>

            <button
              type="button"
              onClick={shareEvent}
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:border-accent/40"
            >
              Share Event
            </button>
          </div>

          <p className="mt-4 text-xs leading-5 text-white/35">
            Shared-link previews will use the event thumbnail once HypeKnight's
            public event metadata is connected to the event image.
          </p>
        </div>
      </div>
    </section>
  );
}
