import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeState } from '@/lib/states';

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = await req.json();

  const payload = {
    event_id: body.event_id || null,
    external_event_id: body.external_event_id || null,
    source_type: body.source_type || 'page',
    page_type: body.page_type || null,
    city: body.city || null,
    state: body.state ? normalizeState(String(body.state)) : null,
    path: body.path || null,
    referrer: body.referrer || null,
    user_id: user?.id || null,
  };

  const { error } = await supabase.from('event_view_logs').insert(payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}