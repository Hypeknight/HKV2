import Link from 'next/link';
import { createEventStep1 } from '@/app/dashboard/events/actions';

export default function NewEventStep1Page() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Create Event
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">Step 1: Event Basics</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Start with the core identity of the event. This is the first information
          HypeKnight needs to begin building your listing.
        </p>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-glow">
        <form action={createEventStep1} className="grid gap-6">
          <div>
            <label
              htmlFor="flyer_url"
              className="mb-2 block text-sm font-medium text-white"
            >
              Flyer Image URL
            </label>
            <input
              id="flyer_url"
              name="flyer_url"
              type="url"
              placeholder="https://your-image-link.com/flyer.jpg"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />
            <p className="mt-2 text-xs text-white/50">
              For now, use an image URL. Later we can switch this to true file upload.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-white"
              >
                Event Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Midnight Vibes"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
              />
            </div>

            <div>
              <label
                htmlFor="venue_name"
                className="mb-2 block text-sm font-medium text-white"
              >
                Venue Name
              </label>
              <input
                id="venue_name"
                name="venue_name"
                type="text"
                placeholder="Club Nova"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="address"
              className="mb-2 block text-sm font-medium text-white"
            >
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              required
              placeholder="123 Main St"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="city"
                className="mb-2 block text-sm font-medium text-white"
              >
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                required
                placeholder="Kansas City"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
              />
            </div>

            <div>
              <label
                htmlFor="state"
                className="mb-2 block text-sm font-medium text-white"
              >
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                required
                placeholder="Missouri"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="start_date"
                className="mb-2 block text-sm font-medium text-white"
              >
                Start Date
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                required
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label
                htmlFor="start_time"
                className="mb-2 block text-sm font-medium text-white"
              >
                Start Time
              </label>
              <input
                id="start_time"
                name="start_time"
                type="time"
                required
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="end_date"
                className="mb-2 block text-sm font-medium text-white"
              >
                End Date
              </label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label
                htmlFor="end_time"
                className="mb-2 block text-sm font-medium text-white"
              >
                End Time
              </label>
              <input
                id="end_time"
                name="end_time"
                type="time"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-accent/50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-white/20"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
            >
              Continue to Step 2
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}