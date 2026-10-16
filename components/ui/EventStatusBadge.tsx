'use client';

import { useMemo } from 'react';
import { eventScheduleBadge, parseEventTimestamp } from '@/lib/time/event-time';
import useEventClock from './useEventClock';

export default function EventStatusBadge({ startAt, endAt }: { startAt?: string | null; endAt?: string | null }) {
  const start = useMemo(() => parseEventTimestamp(startAt), [startAt]);
  const end = useMemo(() => parseEventTimestamp(endAt), [endAt]);
  const now = useEventClock(Boolean(start?.instant != null));
  const status = now === null || (endAt && !end) ? null : eventScheduleBadge(start, end, now);
  if (!status) return null;
  const style = status === 'Live Now' ? 'bg-accent text-black'
    : status === 'Starting Soon' ? 'border border-yellow-500/30 bg-yellow-500/15 text-yellow-100'
    : 'border border-white/10 bg-black/40 text-white/45';
  return <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${style}`}>{status}</span>;
}
