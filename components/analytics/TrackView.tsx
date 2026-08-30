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
import { getAnonymousSessionId } from '@/lib/signals/browser';

export default function TrackView({
  eventId,
  venueId,
  externalEventId,
  sourceType = 'page',
  pageType,
  city,
  state,
  path,
}: {
  eventId?: string | null;
  venueId?: string | null;
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
      venue_id: venueId || null,
      external_event_id: externalEventId || null,
      source_type: sourceType,
      page_type: pageType,
      city: city || null,
      state: state || null,
      path,
      referrer: document.referrer || null,
      // SIGNAL BRIDGE: non-PII browser id lets public views participate in
      // unique/repeat-interest analysis without requiring an account.
      anonymous_session_id: getAnonymousSessionId(),
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
  }, [eventId, venueId, externalEventId, sourceType, pageType, city, state, path]);

  return null;
}