import { NextResponse } from 'next/server';
import { loadSignedInCommunityPulseState } from '@/lib/community-pulse/home';
import { COMMUNITY_PULSE_HEADERS } from '@/lib/community-pulse/http';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const result = await loadSignedInCommunityPulseState(new URL(request.url).searchParams.get('question') || '');
  return NextResponse.json(result, { headers: COMMUNITY_PULSE_HEADERS });
}
