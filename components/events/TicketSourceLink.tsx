'use client';

import type { ReactNode } from 'react';
import SignalAnchor from '@/components/analytics/SignalAnchor';

type Props = {
  href: string;
  provider: string;
  eventId?: string | null;
  externalEventId?: string | null;
  city?: string | null;
  state?: string | null;
  surface?: string;
  className?: string;
  children: ReactNode;
};

export default function TicketSourceLink({
  href,
  provider,
  eventId,
  externalEventId,
  city,
  state,
  surface = 'event_detail',
  className,
  children,
}: Props) {
  return (
    <SignalAnchor
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      signal={{
        signalType: 'ticket_outbound',
        subjectType: 'event',
        subjectId: eventId || externalEventId || provider,
        eventId: eventId || null,
        city: city || null,
        state: state || null,
        source: provider,
        surface,
        verificationLevel: 'observed',
        metadata: {
          provider,
          external_event_id: externalEventId || null,
          destination_host: safeHost(href),
        },
      }}
    >
      {children}
    </SignalAnchor>
  );
}

function safeHost(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}
