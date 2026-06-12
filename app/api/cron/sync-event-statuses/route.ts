/*
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc('sync_event_statuses');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
  */
 import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { completeCronLog, startCronLog } from '@/lib/cron/log-cron';

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cronLog = await startCronLog('sync-event-statuses');
  const supabase = createAdminClient();

  try {
    const { data: beforeEvents, error: beforeError } = await supabase
      .from('events')
      .select('id, status')
      .in('status', ['scheduled', 'active', 'paid_awaiting_approval']);

    if (beforeError) throw new Error(beforeError.message);

    const { error } = await supabase.rpc('sync_event_statuses');

    if (error) throw new Error(error.message);

    const { data: afterEvents, error: afterError } = await supabase
      .from('events')
      .select('id, status')
      .in('status', ['scheduled', 'active', 'completed', 'paid_awaiting_approval']);

    if (afterError) throw new Error(afterError.message);

    const beforeMap = new Map(
      (beforeEvents ?? []).map((event) => [event.id, event.status])
    );

    const recordsUpdated = (afterEvents ?? []).filter(
      (event) => beforeMap.get(event.id) && beforeMap.get(event.id) !== event.status
    ).length;

    await completeCronLog({
      logId: cronLog?.id,
      status: 'success',
      recordsProcessed: beforeEvents?.length ?? 0,
      recordsUpdated,
      notes: 'Event statuses synced.',
    });

    return NextResponse.json({
      ok: true,
      cron: 'sync-event-statuses',
      processed: beforeEvents?.length ?? 0,
      updated: recordsUpdated,
    });
  } catch (error) {
    await completeCronLog({
      logId: cronLog?.id,
      status: 'error',
      errorMessage:
        error instanceof Error ? error.message : 'Unknown sync cron error.',
    });

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Event status sync failed.',
      },
      { status: 500 }
    );
  }
}