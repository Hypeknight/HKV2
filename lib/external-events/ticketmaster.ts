type TicketmasterSearchParams = {
  city: string;
  stateCode?: string;
  keyword?: string;
  size?: number;
};

export async function searchTicketmasterEvents({
  city,
  stateCode,
  keyword,
  size = 10,
}: TicketmasterSearchParams) {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    throw new Error('Missing TICKETMASTER_API_KEY');
  }

  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');

  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('countryCode', 'US');
  url.searchParams.set('city', city);
  url.searchParams.set('size', String(size));
  url.searchParams.set('sort', 'date,asc');

  if (stateCode) url.searchParams.set('stateCode', stateCode);
  if (keyword) url.searchParams.set('keyword', keyword);

  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Ticketmaster search failed: ${response.status}`);
  }

  const data = await response.json();

  return data?._embedded?.events ?? [];
}

export function normalizeTicketmasterEvent(event: any) {
  const venue = event?._embedded?.venues?.[0];
  const image =
    event?.images?.find((img: any) => img.ratio === '16_9') ||
    event?.images?.[0];

  const classification = event?.classifications?.[0];

  const localDate = event?.dates?.start?.localDate;
  const localTime = event?.dates?.start?.localTime;
  const eventStartAt =
    localDate && localTime
      ? new Date(`${localDate}T${localTime}`).toISOString()
      : localDate
      ? new Date(`${localDate}T00:00:00`).toISOString()
      : null;

  return {
    source_code: 'ticketmaster',
    source_event_id: event.id,
    source_url: event.url || null,
    name: event.name,
    description: event.info || event.pleaseNote || null,
    city: venue?.city?.name || null,
    state: venue?.state?.stateCode || null,
    country: venue?.country?.countryCode || 'US',
    venue_name: venue?.name || null,
    event_start_at: eventStartAt,
    image_url: image?.url || null,
    classification: classification?.segment?.name || null,
    genre: classification?.genre?.name || null,
    segment: classification?.segment?.name || null,
    status: 'active',
    popularity_score: calculateExternalPopularity(event),
    imported_by: 'ai_fill',
    raw_payload: event,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function calculateExternalPopularity(event: any) {
  let score = 0;

  if (event?.images?.length) score += 10;
  if (event?.dates?.start?.localDate) score += 10;
  if (event?.classifications?.[0]?.segment?.name === 'Music') score += 15;
  if (event?.priceRanges?.length) score += 5;
  if (event?.url) score += 5;

  return score;
}