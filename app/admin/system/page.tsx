import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminSystemPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') redirect('/dashboard');

  const { data: cronLogs, error } = await supabase
    .from('cron_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  const rows = cronLogs ?? [];

  const latestByCron = new Map<string, any>();

  for (const log of rows) {
    if (!latestByCron.has(log.cron_name)) {
      latestByCron.set(log.cron_name, log);
    }
  }

  const latestRuns = Array.from(latestByCron.values());

  const successCount = rows.filter((log) => log.status === 'success').length;
  const errorCount = rows.filter((log) => log.status === 'error').length;
  const runningCount = rows.filter((log) => log.status === 'running').length;

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Admin System
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">
            HypeKnight System Health
          </h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Monitor cron jobs, automation health, event status syncing,
            discovery scans, and system activity.
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
        >
          Back to Admin
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Recent Runs" value={String(rows.length)} />
        <Metric label="Successful" value={String(successCount)} />
        <Metric label="Errors" value={String(errorCount)} />
        <Metric label="Running" value={String(runningCount)} />
      </section>

      <Panel
        title="Cron Health"
        subtitle="Latest run for each tracked automation."
      >
        {latestRuns.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {latestRuns.map((log) => (
              <CronHealthCard key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <Empty text="No cron logs have been recorded yet." />
        )}
      </Panel>

      <Panel
        title="Recent Cron Activity"
        subtitle="Most recent cron logs across all automations."
      >
        {rows.length ? (
          <div className="space-y-4">
            {rows.map((log) => (
              <CronLogRow key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <Empty text="No cron activity yet." />
        )}
      </Panel>
    </section>
  );
}

function CronHealthCard({ log }: { log: any }) {
  const expectedInterval = getExpectedIntervalMinutes(log.cron_name);
  const nextRun = log.completed_at
    ? new Date(new Date(log.completed_at).getTime() + expectedInterval * 60 * 1000)
    : null;

  const now = new Date();
  const overdue = nextRun ? nextRun.getTime() < now.getTime() : false;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={log.status} />
        {overdue ? <SmallChip label="Overdue" danger /> : null}
      </div>

      <h3 className="mt-4 text-2xl font-bold text-white">
        {formatCronName(log.cron_name)}
      </h3>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Info label="Last Started" value={formatDate(log.started_at)} />
        <Info label="Completed" value={formatDate(log.completed_at)} />
        <Info label="Expected Next Run" value={nextRun ? formatDate(nextRun.toISOString()) : '—'} />
        <Info label="Duration" value={formatDuration(log.duration_ms)} />
        <Info label="Processed" value={String(log.records_processed ?? 0)} />
        <Info label="Updated" value={String(log.records_updated ?? 0)} />
      </div>

      {log.error_message ? (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {log.error_message}
        </div>
      ) : null}

      {log.notes ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          {log.notes}
        </div>
      ) : null}
    </div>
  );
}

function CronLogRow({ log }: { log: any }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-white">
              {formatCronName(log.cron_name)}
            </h3>
            <StatusChip status={log.status} />
          </div>

          <p className="mt-2 text-white/55">
            Started: {formatDate(log.started_at)} • Completed:{' '}
            {formatDate(log.completed_at)}
          </p>

          <p className="mt-1 text-white/45">
            Processed: {log.records_processed ?? 0} • Updated:{' '}
            {log.records_updated ?? 0} • Duration:{' '}
            {formatDuration(log.duration_ms)}
          </p>

          {log.error_message ? (
            <p className="mt-2 text-sm text-red-300">
              Error: {log.error_message}
            </p>
          ) : null}

          {log.notes ? (
            <p className="mt-2 text-sm text-white/50">
              Notes: {log.notes}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getExpectedIntervalMinutes(cronName?: string | null) {
  if (cronName === 'sync-event-statuses') return 15;
  if (cronName === 'discovery-ai-recommendations') return 1440;
  if (cronName === 'ticketmaster-sync') return 360;
  return 60;
}

function formatCronName(name?: string | null) {
  if (!name) return 'Unknown Cron';

  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  return new Date(value).toLocaleString();
}

function formatDuration(value?: number | null) {
  if (!value) return '—';

  if (value < 1000) return `${value}ms`;

  return `${(value / 1000).toFixed(2)}s`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-white/65">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/45">
        {label}
      </p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
    </div>
  );
}

function StatusChip({ status }: { status?: string | null }) {
  const styles =
    status === 'success'
      ? 'border-green-500/20 bg-green-500/10 text-green-200'
      : status === 'error'
      ? 'border-red-500/20 bg-red-500/10 text-red-200'
      : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200';

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${styles}`}
    >
      {status || 'unknown'}
    </span>
  );
}

function SmallChip({
  label,
  danger = false,
}: {
  label: string;
  danger?: boolean;
}) {
  const styles = danger
    ? 'border-red-500/20 bg-red-500/10 text-red-200'
    : 'border-white/10 bg-white/5 text-white/60';

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${styles}`}
    >
      {label}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">
      {text}
    </div>
  );
}