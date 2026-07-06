'use client';

import { useEffect, useState } from 'react';

export default function EventStatusBadge({
  startAt,
  endAt,
}: {
  startAt?: string | null;
  endAt?: string | null;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!startAt) return null;

  const start = new Date(startAt);
  const end = endAt
    ? new Date(endAt)
    : new Date(start.getTime() + 4 * 60 * 60 * 1000);

  const startsSoon =
    start.getTime() > now.getTime() &&
    start.getTime() - now.getTime() <= 3 * 60 * 60 * 1000;

  const live = now >= start && now <= end;
  const ended = now > end;

  if (live) {
    return (
      <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
        Live Now
      </span>
    );
  }

  if (startsSoon) {
    return (
      <span className="rounded-full border border-yellow-500/30 bg-yellow-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100">
        Starting Soon
      </span>
    );
  }

  if (ended) {
    return (
      <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
        Ended
      </span>
    );
  }

  return null;
}