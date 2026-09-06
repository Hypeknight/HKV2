import Link from 'next/link';
import { createEventStep1 } from '@/app/dashboard/events/actions';
import EventFlyerUpload from '@/components/events/EventFlyerUpload';
import PotentialEventMatches from '@/components/events/PotentialEventMatches';
import VenueAddressMatch from '@/components/events/VenueAddressMatch';
import { US_STATES } from '@/lib/states';

type Props = { searchParams?: Promise<{ source?: string }> };

export default async function NewEventStep1Page({ searchParams }: Props) {
  const query = searchParams ? await searchParams : {};
  const sourceMode = query.source === '1';
  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/dashboard/events/new" className="text-sm text-white/60 hover:text-accent">← Choose another start</Link>
      <header className="rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 sm:p-10">
        <div className="flex items-center justify-between gap-4"><p className="text-xs uppercase tracking-[0.3em] text-accent">1 of 4 · Start</p><span className="text-sm text-white/40">Saved when you continue</span></div>
        <h1 className="mt-4 text-4xl font-black text-white sm:text-6xl">What, where, and when?</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/65">A real physical street address, city, and state are required. That address also lets HypeKnight find an existing venue account and request permission to connect it.</p>
      </header>

      <form action={createEventStep1} data-event-start-form="true" className="space-y-6">
        {sourceMode ? <section className="rounded-[2rem] border border-accent/20 bg-accent/5 p-6"><label className="block"><span className="text-sm font-bold text-white">Official event URL</span><input name="source_url" type="url" required placeholder="https://eventbrite.com/e/..." className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-accent/50" /></label><p className="mt-2 text-xs text-white/45">HypeKnight will preserve this as the event source. You keep your existing ticketing platform.</p></section> : null}

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
          <h2 className="text-2xl font-black text-white">Event identity</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field name="name" label="Event name *" required placeholder="Atlanta Rooftop Saturdays" />
            <Field name="venue_name" label="Venue name (optional)" placeholder="Skyline Rooftop" />
          </div>
          <div className="mt-5"><EventFlyerUpload /></div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
          <h2 className="text-2xl font-black text-white">Physical location</h2>
          <p className="mt-2 text-sm text-white/50">Street number + street name, city, and state are required for in-person events.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field name="address" label="Street address *" required placeholder="123 Peachtree St NE" />
            <Field name="city" label="City *" required placeholder="Atlanta" />
            <label className="block md:col-span-2"><span className="text-sm font-bold text-white/70">State *</span><select name="state" required className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white"><option value="">Select state</option>{US_STATES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <div className="mt-5"><VenueAddressMatch /></div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
          <h2 className="text-2xl font-black text-white">Date & time</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2"><Field name="start_date" label="Start date *" type="date" required /><Field name="start_time" label="Start time *" type="time" required /><Field name="end_date" label="End date" type="date" /><Field name="end_time" label="End time" type="time" /></div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/55">If you do not provide an end time, discovery ends <strong className="text-white">30 minutes after the event starts</strong>. Patron Pulse or Linkd’N will require an end time if selected later.</div>
        </section>

        <PotentialEventMatches />
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><Link href="/dashboard/events" className="rounded-2xl border border-white/10 px-5 py-4 text-center font-bold text-white">Cancel</Link><button className="rounded-2xl bg-accent px-6 py-4 font-black text-black">Continue to Experience →</button></div>
      </form>
    </section>
  );
}

function Field({ name, label, type='text', required=false, placeholder }: { name:string; label:string; type?:string; required?:boolean; placeholder?:string }) {
  return <label className="block"><span className="text-sm font-bold text-white/70">{label}</span><input name={name} type={type} required={required} placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-accent/50" /></label>;
}
