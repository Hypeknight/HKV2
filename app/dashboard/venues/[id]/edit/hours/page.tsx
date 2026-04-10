import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateVenueHours } from '@/app/dashboard/venues/actions';

type Props = {
  params: Promise<{ id: string }>;
};

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default async function VenueHoursPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, owner_id, name, status')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (venueError || !venue) notFound();

  const { data: hours } = await supabase
    .from('venue_hours')
    .select('*')
    .eq('venue_id', id);

  const hoursMap = new Map((hours || []).map((row) => [row.day_of_week, row]));

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Create Venue</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Operating Days & Hours</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Set the normal operating days and times for this venue. These remain editable later.
        </p>
      </div>

      <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-white/50">Editing venue</p>
        <p className="mt-2 text-xl font-semibold text-white">{venue.name}</p>
        <p className="mt-2 text-sm text-white/60">Current status: {venue.status}</p>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <form action={updateVenueHours} className="space-y-5">
          <input type="hidden" name="venue_id" value={venue.id} />

          {DAYS.map((day) => {
            const existing = hoursMap.get(day.value);

            return (
              <div
                key={day.value}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.9fr] lg:items-center">
                  <div>
                    <p className="text-lg font-semibold text-white">{day.label}</p>
                    <label className="mt-3 flex items-center gap-3 text-white">
                      <input
                        type="checkbox"
                        name={`is_open_${day.value}`}
                        value="yes"
                        defaultChecked={existing?.is_open || false}
                        className="h-4 w-4"
                      />
                      <span>Open this day</span>
                    </label>
                  </div>

                  <div>
                    <label
                      htmlFor={`open_time_${day.value}`}
                      className="mb-2 block text-sm font-medium text-white"
                    >
                      Open Time
                    </label>
                    <input
                      id={`open_time_${day.value}`}
                      name={`open_time_${day.value}`}
                      type="time"
                      defaultValue={existing?.open_time || ''}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`close_time_${day.value}`}
                      className="mb-2 block text-sm font-medium text-white"
                    >
                      Close Time
                    </label>
                    <input
                      id={`close_time_${day.value}`}
                      name={`close_time_${day.value}`}
                      type="time"
                      defaultValue={existing?.close_time || ''}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between">
            <Link
              href={`/dashboard/venues/${venue.id}/edit/step-2`}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-white/20"
            >
              Back to Step 2
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Continue to Step 3
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}