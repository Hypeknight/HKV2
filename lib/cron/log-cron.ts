import { createAdminClient } from '@/lib/supabase/admin';

export async function startCronLog(cronName: string) {
  const supabase = createAdminClient();

  const startedAt = new Date();

  const { data, error } = await supabase
    .from('cron_logs')
    .insert({
      cron_name: cronName,
      started_at: startedAt.toISOString(),
      status: 'running',
    })
    .select('id, started_at')
    .single();

  if (error) {
    console.error('Failed to start cron log:', error.message);
    return null;
  }

  return data;
}

export async function completeCronLog({
  logId,
  status,
  recordsProcessed = 0,
  recordsUpdated = 0,
  errorMessage,
  notes,
}: {
  logId?: string | null;
  status: 'success' | 'error';
  recordsProcessed?: number;
  recordsUpdated?: number;
  errorMessage?: string;
  notes?: string;
}) {
  if (!logId) return;

  const supabase = createAdminClient();
  const completedAt = new Date();

  const { data: existing } = await supabase
    .from('cron_logs')
    .select('started_at')
    .eq('id', logId)
    .single();

  const startedAt = existing?.started_at
    ? new Date(existing.started_at)
    : completedAt;

  const durationMs = completedAt.getTime() - startedAt.getTime();

  const { error } = await supabase
    .from('cron_logs')
    .update({
      completed_at: completedAt.toISOString(),
      status,
      duration_ms: durationMs,
      records_processed: recordsProcessed,
      records_updated: recordsUpdated,
      error_message: errorMessage || null,
      notes: notes || null,
    })
    .eq('id', logId);

  if (error) {
    console.error('Failed to complete cron log:', error.message);
  }
}