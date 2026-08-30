'use client';

import Link from 'next/link';
import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import type { SignalInput } from '@/lib/signals/types';
import { getAnonymousSessionId } from '@/lib/signals/browser';

type Props = Omit<ComponentProps<typeof Link>, 'onClick'> & {
  signal: SignalInput;
  children: ReactNode;
};

/**
 * Drop-in replacement for a normal Next.js <Link> when a click itself carries
 * intelligence value (Vibe, Active City, Surprise Me, recommendation, etc.).
 *
 * Navigation is NEVER blocked waiting for analytics. navigator.sendBeacon is
 * attempted first; fetch keepalive is the fallback.
 */
export default function SignalLink({ signal, children, ...linkProps }: Props) {
  function recordSignal() {
    const payload = JSON.stringify({
      ...signal,
      anonymousSessionId:
        signal.anonymousSessionId ?? getAnonymousSessionId(),
    });

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const body = new Blob([payload], { type: 'application/json' });
      const sent = navigator.sendBeacon('/api/signals', body);
      if (sent) return;
    }

    void fetch('/api/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Best-effort telemetry: navigation/action must not fail because logging did.
    });
  }

  function handleClick(_event: MouseEvent<HTMLAnchorElement>) {
    recordSignal();
  }

  return (
    <Link {...linkProps} onClick={handleClick}>
      {children}
    </Link>
  );
}
