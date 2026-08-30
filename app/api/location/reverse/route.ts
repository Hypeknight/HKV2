import { NextResponse } from 'next/server';
import { normalizeState } from '@/lib/states';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get('lat'));
  const longitude = Number(url.searchParams.get('lng'));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: 'Valid coordinates are required.' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'HypeKnight/1.0 (https://hypeknight.fun)',
          Accept: 'application/json',
        },
        next: { revalidate: 60 * 60 * 24 },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Unable to resolve location.' }, { status: 502 });
    }

    const data = await response.json();
    const address = data?.address || {};
    const city = String(
      address.city || address.town || address.village || address.municipality || address.county || ''
    ).trim();
    const state = normalizeState(String(address.state_code || address.state || ''));

    if (!city || !state) {
      return NextResponse.json({ error: 'Location could not be mapped to a city.' }, { status: 404 });
    }

    return NextResponse.json({ city, state, latitude, longitude });
  } catch (error) {
    console.error('[location] reverse geocode failed', error);
    return NextResponse.json({ error: 'Unable to resolve location.' }, { status: 500 });
  }
}
