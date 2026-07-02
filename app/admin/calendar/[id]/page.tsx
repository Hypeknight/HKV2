import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  updateSpecialDay,
  deleteSpecialDay,
  assignEventToSpecialDay,
  removeEventFromSpecialDay,
} from '../actions';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminCalendarDetailPage({ params }: Props) {
  const { id } = await params;

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

  const { data: specialDay, error } = await supabase
    .from('special_days')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !specialDay) notFound();

  const [{ data: internalEvents }, { data: externalEvents }, { data: assignments }] =
    await Promise.all([
      supabase
        .from('events')
        .select('id, name, city, state, event_start_at, status, is_public')
        .in('status', ['scheduled', 'active'])
        .order('event_start_at', { ascending: true })
        .limit(100),

      supabase
        .from('external_events')
        .select('id, name, city, state, event_start_at, status, source_code')
        .eq('status', 'active')
        .order('event_start_at', { ascending: true })
        .limit(100),

      supabase
        .from('special_day_events')
        .select('*')
        .eq('special_day_id', id),
    ]);

  const assignedInternalIds = new Set(
    (assignments ?? [])
      .filter((row) => row.source_type === 'hypeknight')
      .map((row) => row.event_id)
  );

  const assignedExternalIds = new Set(
    (assignments ?? [])
      .filter((row) => row.source_type === 'external')
      .map((row) => row.external_event_id)
  );

  const assignedInternalEvents =
    internalEvents?.filter((event) => assignedInternalIds.has(event.id)) ?? [];

  const assignedExternalEvents =
    externalEvents?.filter((event) => assignedExternalIds.has(event.id)) ?? [];

  const availableInternalEvents =
    internalEvents?.filter((event) => !assignedInternalIds.has(event.id)) ?? [];

  const availableExternalEvents =
    externalEvents?.filter((event) => !assignedExternalIds.has(event.id)) ?? [];

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/admin/calendar" className="text-sm text-white/60 hover:text-accent">
        ← Back to Calendar
      </Link>

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Calendar Theme
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          {specialDay.name}
        </h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Edit this special day and assign internal or external events to its
          themed collection.
        </p>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          action={updateSpecialDay}
          className="space-y-5 rounded-[2.5rem] border border-white/10 bg-white/5 p-8"
        >
          <input type="hidden" name="id" value={specialDay.id} />

          <h2 className="text-2xl font-bold text-white">Edit Theme</h2>

          <Input
            name="name"
            label="Name"
            defaultValue={specialDay.name}
            required
          />

          <label className="block">
            <span className="text-sm text-white/60">Description</span>
            <textarea
              name="description"
              rows={4}
              defaultValue={specialDay.description || ''}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />
          </label>

          <label className="block">
            <span className="text-sm text-white/60">Category</span>
            <select
              name="category"
              defaultValue={specialDay.category || 'holiday'}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
            >
              <option value="holiday">Holiday</option>
              <option value="seasonal">Seasonal</option>
              <option value="city">City Theme</option>
              <option value="sports">Sports</option>
              <option value="music">Music</option>
              <option value="food">Food</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="starts_on"
              label="Start Date"
              type="date"
              defaultValue={specialDay.starts_on}
              required
            />
            <Input
              name="ends_on"
              label="End Date"
              type="date"
              defaultValue={specialDay.ends_on || ''}
            />
          </div>

          <div className="grid gap-3">
            <Toggle
              name="is_active"
              label="Active / public"
              defaultChecked={specialDay.is_active}
            />
            <Toggle
              name="is_featured"
              label="Feature this theme"
              defaultChecked={specialDay.is_featured}
            />
          </div>

          <button className="w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90">
            Save Theme
          </button>
        </form>

        <section className="space-y-6 rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Danger Zone</h2>

          <p className="text-white/60">
            Deleting this theme removes the calendar collection and all event
            assignments connected to it.
          </p>

          <form action={deleteSpecialDay}>
            <input type="hidden" name="id" value={specialDay.id} />
            <button className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-red-200 hover:border-red-500/40">
              Delete Theme
            </button>
          </form>
        </section>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <AssignmentPanel
          title="Assigned HypeKnight Events"
          events={assignedInternalEvents}
          sourceType="hypeknight"
          specialDayId={specialDay.id}
          assigned
        />

        <AssignmentPanel
          title="Assigned External Events"
          events={assignedExternalEvents}
          sourceType="external"
          specialDayId={specialDay.id}
          assigned
        />

        <AssignmentPanel
          title="Available HypeKnight Events"
          events={availableInternalEvents}
          sourceType="hypeknight"
          specialDayId={specialDay.id}
        />

        <AssignmentPanel
          title="Available External Events"
          events={availableExternalEvents}
          sourceType="external"
          specialDayId={specialDay.id}
        />
      </section>
    </section>
  );
}

function AssignmentPanel({
  title,
  events,
  sourceType,
  specialDayId,
  assigned = false,
}: {
  title: string;
  events: any[];
  sourceType: 'hypeknight' | 'external';
  specialDayId: string;
  assigned?: boolean;
}) {
  return (
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>

      <div className="mt-6 space-y-4">
        {events.length ? (
          events.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-white/10 bg-black/20 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{event.name}</h3>
                  <p className="mt-2 text-white/55">
                    {[event.city, event.state].filter(Boolean).join(', ') ||
                      'Location TBA'}
                  </p>
                  {event.event_start_at ? (
                    <p className="mt-1 text-sm text-white/45">
                      {new Date(event.event_start_at).toLocaleString()}
                    </p>
                  ) : null}
                </div>

                {assigned ? (
                  <form action={removeEventFromSpecialDay}>
                    <input type="hidden" name="special_day_id" value={specialDayId} />
                    <input type="hidden" name="source_type" value={sourceType} />
                    <input type="hidden" name="event_id" value={event.id} />
                    <button className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:border-red-500/40">
                      Remove
                    </button>
                  </form>
                ) : (
                  <form action={assignEventToSpecialDay}>
                    <input type="hidden" name="special_day_id" value={specialDayId} />
                    <input type="hidden" name="source_type" value={sourceType} />
                    <input type="hidden" name="event_id" value={event.id} />
                    <button className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-2 text-sm text-accent hover:border-accent/40">
                      Assign
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))
        ) : (
          <Empty text="No events in this section." />
        )}
      </div>
    </section>
  );
}

function Input({
  name,
  label,
  type = 'text',
  defaultValue = '',
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm text-white/60">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue || ''}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />
    </label>
  );
}

function Toggle({
  name,
  label,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
      <span>{label}</span>
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">
      {text}
    </div>
  );
}