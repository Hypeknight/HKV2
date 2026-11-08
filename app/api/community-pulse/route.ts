import { NextResponse } from 'next/server';
import { communityPulseEnabled, loadHomeCommunityPulse, submitSignedInCommunityPulse } from '@/lib/community-pulse/home';
import { COMMUNITY_PULSE_HEADERS, sameOriginJson, readCommunityPulseBody } from '@/lib/community-pulse/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = await loadHomeCommunityPulse(params.get('city') || '', params.get('state') || '');
  return NextResponse.json(result, { headers: COMMUNITY_PULSE_HEADERS });
}

export async function POST(request: Request) {
  if (!communityPulseEnabled())
    return NextResponse.json({ state: 'disabled' }, { status: 404, headers: COMMUNITY_PULSE_HEADERS });
  if (!sameOriginJson(request))
    return NextResponse.json({ state: 'invalid' }, { status: 403, headers: COMMUNITY_PULSE_HEADERS });
  let input: unknown;
  try { input = await readCommunityPulseBody(request); }
  catch { return NextResponse.json({ state: 'invalid' }, { status: 400, headers: COMMUNITY_PULSE_HEADERS }); }
  const result = await submitSignedInCommunityPulse(input);
  const status = result.state === 'sign_in_required' ? 401 : result.state === 'rate_limited' ? 429 :
    result.state === 'unavailable' ? 503 : result.state === 'invalid' ? 400 : 200;
  return NextResponse.json(result, { status, headers: {
    ...COMMUNITY_PULSE_HEADERS, ...(status === 429 ? { 'Retry-After': '60' } : {}),
  } });
}
