import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateEventStep1 } from '@/app/dashboard/events/actions';
import EventFlyerUpload from '@/components/events/EventFlyerUpload';

type EditStep1PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEventStep1Page({ params }: EditStep1PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      id,
      owner_id,
      name,
      slug,
      flyer_url,
      venue_name,
      address,
      city,
      state,
      event_start_at,
      event_end_at,
      status
    `)
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  //if (error || !event) notFound();
  if (error) {
  throw new Error(error.message);
}

if (!event) {
  notFound();
}

  if (!['draft', 'building', 'rejected'].includes(event.status)) {
    redirect(`/events/${event.slug}`);
  }

  const startDate = event.event_start_at
    ? new Date(event.event_start_at).toISOString().slice(0, 10)
    : '';
  const startTime = event.event_start_at
    ? new Date(event.event_start_at).toISOString().slice(11, 16)
    : '';
  const endDate = event.event_end_at
    ? new Date(event.event_end_at).toISOString().slice(0, 10)
    : '';
  const endTime = event.event_end_at
    ? new Date(event.event_end_at).toISOString().slice(11, 16)
    : '';

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Edit Event</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Step 1: Event Basics</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Update the basic event identity information.
        </p>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-glow">
        <form action={updateEventStep1} className="grid gap-6">
          <input type="hidden" name="event_id" value={event.id} />

          <div>
            <label htmlFor="flyer_url" className="mb-2 block text-sm font-medium text-white">
              Flyer Image URL
            </label>
            <EventFlyerUpload defaultUrl={event.flyer_url} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-white">
                Event Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={event.name || ''}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label htmlFor="venue_name" className="mb-2 block text-sm font-medium text-white">
                Venue Name
              </label>
              <input
                id="venue_name"
                name="venue_name"
                type="text"
                defaultValue={event.venue_name || ''}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>
          </div>

          <div>
            <label htmlFor="address" className="mb-2 block text-sm font-medium text-white">
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              defaultValue={event.address || ''}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="city" className="mb-2 block text-sm font-medium text-white">
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                required
                defaultValue={event.city || ''}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label htmlFor="state" className="mb-2 block text-sm font-medium text-white">
                State
              </label>
              <select
                id="state"
                name="state"
                required
                defaultValue={event.state || ''}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              >
                <option value="" disabled>Select a state</option>
                {[
                  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
                  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
                  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
                  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
                  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
                  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
                  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
                  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
                  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
                  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
                  ['DC','District of Columbia'],
                ].map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="start_date" className="mb-2 block text-sm font-medium text-white">
                Start Date
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                required
                defaultValue={startDate}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label htmlFor="start_time" className="mb-2 block text-sm font-medium text-white">
                Start Time
              </label>
              <input
                id="start_time"
                name="start_time"
                type="time"
                required
                defaultValue={startTime}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="end_date" className="mb-2 block text-sm font-medium text-white">
                End Date
              </label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                defaultValue={endDate}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label htmlFor="end_time" className="mb-2 block text-sm font-medium text-white">
                End Time
              </label>
              <input
                id="end_time"
                name="end_time"
                type="time"
                defaultValue={endTime}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between">
            <Link
              href={`/events/${event.slug}`}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-white/20"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Save Step 1
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}