/*'use client';

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
  */
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
    const payload = {
      event_id: eventId || null,
      external_event_id: externalEventId || null,
      source_type: sourceType,
      page_type: pageType,
      city: city || null,
      state: state || null,
      path,
      referrer: document.referrer || null,
    };

    console.log('TrackView firing:', payload);

    fetch('/api/analytics/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        console.log('TrackView response:', res.status, data);
      })
      .catch((error) => {
        console.error('TrackView failed:', error);
      });
  }, [eventId, externalEventId, sourceType, pageType, city, state, path]);

  return null;
}