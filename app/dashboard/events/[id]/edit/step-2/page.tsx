import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { updateEventStep2 } from '@/app/dashboard/events/actions';
import { createClient } from '@/lib/supabase/server';
import { getLookupMap, type LookupValue } from '@/lib/config/lookups';

type Props = { params: Promise<{ id: string }> };

export default async function ExperienceStep({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: event, error } = await supabase.from('events').select('id,name,description,dress_code,entry_price,music_selection,age_requirement,event_type,vibe_tags,amenities,smoking_policy,parking_notes,special_notes,status').eq('id', id).eq('owner_id', user.id).single();
  if (error || !event) notFound();

  const lookups = await getLookupMap(['dress_codes','age_requirements','event_types','music_genres','vibe_tags','smoking_policies','parking_options','event_amenities']);
  const selectedMusic = Array.isArray(event.music_selection) ? event.music_selection : [];
  const selectedVibes = Array.isArray(event.vibe_tags) ? event.vibe_tags : [];
  const selectedAmenities = Array.isArray(event.amenities) ? event.amenities : [];
  const selectedTypes = String(event.event_type || '').split(',').map((v) => v.trim()).filter(Boolean);

  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/dashboard/events" className="text-sm text-white/60 hover:text-accent">← Save and return later</Link>
      <header className="rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 sm:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">2 of 4 · Experience</p>
        <h1 className="mt-4 text-4xl font-black text-white sm:text-6xl">What will the night feel like?</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/65">Use quick selections for the information that powers HypeKnight discovery. Extra operational details stay optional instead of turning this into an endless form.</p>
      </header>

      <form action={updateEventStep2} className="space-y-6">
        <input type="hidden" name="event_id" value={event.id} />
        <Panel title="Event type" text="Choose at least one."><ChoiceGrid name="event_type" options={lookups.event_types} selected={selectedTypes} /></Panel>
        <Panel title="Music" text="Choose the sounds guests should expect."><ChoiceGrid name="music_selection" options={lookups.music_genres} selected={selectedMusic} /></Panel>
        <Panel title="Vibe" text="Choose at least one experience signal."><ChoiceGrid name="vibe_tags" options={lookups.vibe_tags} selected={selectedVibes} /></Panel>
        <Panel title="Need to know" text="The essentials people use to decide whether the event fits their night.">
          <div className="grid gap-5 md:grid-cols-2">
            <Select name="age_requirement" label="Age requirement" value={event.age_requirement || ''} options={lookups.age_requirements} />
            <Select name="dress_code" label="Dress code" value={event.dress_code || ''} options={lookups.dress_codes} />
            <Field name="entry_price" label="Entry / ticket note" value={event.entry_price || ''} placeholder="Free before 11, $20 at door" />
            <Select name="parking_notes" label="Parking / access" value={event.parking_notes || ''} options={lookups.parking_options} />
          </div>
        </Panel>
        <details className="rounded-[2rem] border border-white/10 bg-white/5 p-6"><summary className="cursor-pointer text-xl font-black text-white">+ More event details</summary><div className="mt-6 space-y-6"><label className="block"><span className="text-sm font-bold text-white/70">Description</span><textarea name="description" rows={5} defaultValue={event.description || ''} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white" /></label><Select name="smoking_policy" label="Smoking policy" value={event.smoking_policy || ''} options={lookups.smoking_policies} /><div><p className="text-sm font-bold text-white/70">Amenities</p><ChoiceGrid name="amenities" options={lookups.event_amenities} selected={selectedAmenities} /></div><label className="block"><span className="text-sm font-bold text-white/70">Additional information</span><textarea name="special_notes" rows={4} defaultValue={event.special_notes || ''} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white" /></label></div></details>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><Link href="/dashboard/events" className="rounded-2xl border border-white/10 px-5 py-4 text-center font-bold text-white">Save and exit</Link><button className="rounded-2xl bg-accent px-6 py-4 font-black text-black">Continue to Enhance →</button></div>
      </form>
    </section>
  );
}

function Panel({ title, text, children }: { title:string; text:string; children:React.ReactNode }) { return <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8"><h2 className="text-2xl font-black text-white">{title}</h2><p className="mt-2 text-sm text-white/50">{text}</p><div className="mt-6">{children}</div></section>; }
function ChoiceGrid({ name, options=[], selected }: { name:string; options?:LookupValue[]; selected:string[] }) { return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{options.map((o) => <label key={o.value} className="cursor-pointer rounded-2xl border border-white/10 bg-black/20 p-4 text-white has-[:checked]:border-accent/60 has-[:checked]:bg-accent/10"><input type="checkbox" name={name} value={o.value} defaultChecked={selected.includes(o.value)} className="mr-3 accent-current" />{o.icon ? `${o.icon} ` : ''}{o.display_name}</label>)}</div>; }
function Field({ name,label,value,placeholder }: { name:string;label:string;value:string;placeholder?:string }) { return <label className="block"><span className="text-sm font-bold text-white/70">{label}</span><input name={name} defaultValue={value} placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white" /></label>; }
function Select({ name,label,value,options=[] }: { name:string;label:string;value:string;options?:LookupValue[] }) { return <label className="block"><span className="text-sm font-bold text-white/70">{label}</span><select name={name} defaultValue={value} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white"><option value="">Not specified</option>{options.map((o) => <option key={o.value} value={o.value}>{o.display_name}</option>)}</select></label>; }
