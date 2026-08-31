import Link from 'next/link';

export default function NewEventLandingPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/dashboard/events" className="text-sm text-white/60 hover:text-accent">← Back to My Events</Link>
      <div className="rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 sm:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Create Event</p>
        <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">How are you starting?</h1>
        <p className="mt-4 max-w-2xl text-white/65">Start fresh or connect an event you already have on Eventbrite, Ticketmaster, or another official event page.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Link href="/dashboard/events/new/step-1" className="group rounded-[2rem] border border-white/10 bg-white/5 p-7 hover:border-accent/50">
          <p className="text-3xl">✦</p><h2 className="mt-5 text-2xl font-black text-white">Create something new</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">Build a HypeKnight event from the ground up.</p>
          <p className="mt-6 font-bold text-accent">Start event →</p>
        </Link>
        <Link href="/dashboard/events/new/step-1?source=1" className="group rounded-[2rem] border border-white/10 bg-white/5 p-7 hover:border-accent/50">
          <p className="text-3xl">🔗</p><h2 className="mt-5 text-2xl font-black text-white">I already have an event</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">Connect an Eventbrite, Ticketmaster, or other official listing and add HypeKnight-specific experience details.</p>
          <p className="mt-6 font-bold text-accent">Connect event →</p>
        </Link>
      </div>
    </section>
  );
}
