'use client';

import { useEffect } from 'react';

export default function TrackView({
  eventId,
  externalEventId,
  sourceType = 'page',
  pageType,
  city,
  state,
  path,
}: {
  eventId?: string | null;
  externalEventId?: string | null;
  sourceType?: 'hypeknight' | 'external' | 'page';
  pageType: string;
  city?: string | null;
  state?: string | null;
  path: string;
}) {
  useEffect(() => {
    fetch('/api/analytics/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        external_event_id: externalEventId,
        source_type: sourceType,
        page_type: pageType,
        city,
        state,
        path,
        referrer: document.referrer || null,
      }),
    }).catch(() => {});
  }, [eventId, externalEventId, sourceType, pageType, city, state, path]);

  return null;
}