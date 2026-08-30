'use client';

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import type { SignalInput } from '@/lib/signals/types';
import { getAnonymousSessionId } from '@/lib/signals/browser';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  signal: SignalInput;
  children: ReactNode;
};

/**
 * Analytics-aware external anchor. Useful for Directions/Maps links where the
 * browser leaves HypeKnight immediately after the click.
 */
export default function SignalAnchor({ signal, children, ...anchorProps }: Props) {
  function handleClick(_event: MouseEvent<HTMLAnchorElement>) {
    const payload = JSON.stringify({
      ...signal,
      anonymousSessionId:
        signal.anonymousSessionId ?? getAnonymousSessionId(),
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon('/api/signals', blob)) return;
    }

    void fetch('/api/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }

  return (
    <a {...anchorProps} onClick={handleClick}>
      {children}
    </a>
  );
}
