import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { updateEventStep2 } from '@/app/dashboard/events/actions';
import { createClient } from '@/lib/supabase/server';

type Step2PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEventStep2Page({ params }: Step2PageProps) {
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
      description,
      dress_code,
      entry_price,
      music_selection,
      age_requirement,
      event_type,
      vibe_tags,
      smoking_policy,
      parking_notes,
      special_notes,
      status
    `)
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error || !event) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Create Event
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">Step 2: Event Details</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Add the information that helps HypeKnight connect people to the right
          vibe, scene, and experience.
        </p>
      </div>

      <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-white/50">
          Editing event
        </p>
        <p className="mt-2 text-xl font-semibold text-white">{event.name}</p>
        <p className="mt-2 text-sm text-white/60">Current status: {event.status}</p>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-glow">
        <form action={updateEventStep2} className="grid gap-6">
          <input type="hidden" name="event_id" value={event.id} />

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-white"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              defaultValue={event.description || ''}
              placeholder="Describe the event, the energy, the experience, and what guests should expect."
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="dress_code"
                className="mb-2 block text-sm font-medium text-white"
              >
                Dress Code
              </label>
              <input
                id="dress_code"
                name="dress_code"
                type="text"
                defaultValue={event.dress_code || ''}
                placeholder="Casual, upscale, all white, costume, etc."
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
              />
            </div>

            <div>
              <label
                htmlFor="entry_price"
                className="mb-2 block text-sm font-medium text-white"
              >
                Entry Price
              </label>
              <input
                id="entry_price"
                name="entry_price"
                type="text"
                defaultValue={event.entry_price || ''}
                placeholder="$10, Free before 11, $20 at door"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="age_requirement"
                className="mb-2 block text-sm font-medium text-white"
              >
                Age Requirement
              </label>
              <input
                id="age_requirement"
                name="age_requirement"
                type="text"
                defaultValue={event.age_requirement || ''}
                placeholder="21+, 18+, all ages"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
              />
            </div>

            <div>
              <label
                htmlFor="event_type"
                className="mb-2 block text-sm font-medium text-white"
              >
                Event Type
              </label>
              <input
                id="event_type"
                name="event_type"
                type="text"
                defaultValue={event.event_type || ''}
                placeholder="Club night, lounge, festival, rooftop, hookah, etc."
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
              />
            </div>
          </div>

          <div>
            <p className="mb-3 block text-sm font-medium text-white">Music Selection</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                'Hip-Hop',
                'R&B',
                'Afrobeats',
                'House',
                'EDM',
                'Latin',
                'Top 40',
                'Trap',
                'Dancehall',
              ].map((genre) => (
                <label
                  key={genre}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                >
                  <input
                    type="checkbox"
                    name="music_selection"
                    value={genre}
                    defaultChecked={(event.music_selection || []).includes(genre)}
                    className="h-4 w-4"
                  />
                  <span>{genre}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 block text-sm font-medium text-white">Vibe Tags</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                'High Energy',
                'Chill',
                'Luxury',
                'Underground',
                'Tourist Friendly',
                'Locals Spot',
                'Live DJ',
                'Late Night',
                'Free Spirit',
              ].map((tag) => (
                <label
                  key={tag}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                >
                  <input
                    type="checkbox"
                    name="vibe_tags"
                    value={tag}
                    defaultChecked={(event.vibe_tags || []).includes(tag)}
                    className="h-4 w-4"
                  />
                  <span>{tag}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="smoking_policy"
                className="mb-2 block text-sm font-medium text-white"
              >
                Smoking Policy
              </label>
              <input
                id="smoking_policy"
                name="smoking_policy"
                type="text"
                defaultValue={event.smoking_policy || ''}
                placeholder="No smoking, patio only, hookah allowed"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
              />
            </div>

            <div>
              <label
                htmlFor="parking_notes"
                className="mb-2 block text-sm font-medium text-white"
              >
                Parking / Access Notes
              </label>
              <input
                id="parking_notes"
                name="parking_notes"
                type="text"
                defaultValue={event.parking_notes || ''}
                placeholder="Street parking, valet, garage access"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="special_notes"
              className="mb-2 block text-sm font-medium text-white"
            >
              Special Notes
            </label>
            <textarea
              id="special_notes"
              name="special_notes"
              rows={4}
              defaultValue={event.special_notes || ''}
              placeholder="Add anything else guests should know."
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-white/20"
            >
              Save and return later
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