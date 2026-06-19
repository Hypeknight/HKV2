import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  submitEventRevision,
  updateEventRevision,
} from '@/app/dashboard/events/actions';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EventRevisionEditPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (error || !event) notFound();

  if (event.status !== 'revision_draft') {
    redirect(`/dashboard/events/${event.id}/review`);
  }

  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href={`/dashboard/events/${event.id}/review`}
        className="text-sm text-white/60 hover:text-accent"
      >
        ← Back to Event Review
      </Link>

      <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Revision Draft
        </p>

        <h1 className="mt-3 text-4xl font-bold text-white">
          Edit Event Revision
        </h1>

        <p className="mt-3 max-w-3xl text-white/70">
          Make your changes, save the revision, then submit it back to
          HypeKnight for approval. The event will stay hidden until reviewed.
        </p>
      </section>

      <form
  action={updateEventRevision}
  encType="multipart/form-data"
  className="space-y-8 rounded-[2.75rem] border border-white/10 bg-white/5 p-8"
>
        <input type="hidden" name="event_id" value={event.id} />

        <FormSection title="Basic Information">
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="name" label="Event Name" defaultValue={event.name} required />
            <Input name="venue_name" label="Venue Name" defaultValue={event.venue_name} />
            <Input name="address" label="Address" defaultValue={event.address} />
            <Input name="city" label="City" defaultValue={event.city} />
            <Input name="state" label="State" defaultValue={event.state} />
            <Input
              name="event_start_at"
              label="Start Date/Time"
              type="datetime-local"
              defaultValue={toDateTimeLocal(event.event_start_at)}
            />
            <Input
              name="event_end_at"
              label="End Date/Time"
              type="datetime-local"
              defaultValue={toDateTimeLocal(event.event_end_at)}
            />
            <div className="md:col-span-2">
  {event.flyer_url || event.image_url ? (
    <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <img
        src={event.flyer_url || event.image_url}
        alt={event.name || 'Current event flyer'}
        className="max-h-80 w-full object-cover"
      />
    </div>
  ) : null}

  <Input
    name="flyer_url"
    label="Flyer URL"
    defaultValue={event.flyer_url || event.image_url}
  />

  <label className="mt-4 block">
    <span className="text-sm text-white/60">Upload New Flyer / Image</span>
    <input
      name="flyer_file"
      type="file"
      accept="image/*"
      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-accent file:px-4 file:py-2 file:font-semibold file:text-black"
    />
  </label>

  <p className="mt-2 text-sm text-white/45">
    Uploading a new image will replace the current flyer for this revision.
  </p>
</div>
          </div>
        </FormSection>

        <FormSection title="Event Details">
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="dress_code" label="Dress Code" defaultValue={event.dress_code} />
            <Input name="entry_price" label="Entry Price" defaultValue={event.entry_price} />
            <Input name="age_requirement" label="Age Requirement" defaultValue={event.age_requirement} />
            <Input name="event_type" label="Event Type" defaultValue={event.event_type} />
            <Input name="smoking_policy" label="Smoking Policy" defaultValue={event.smoking_policy} />
            <Input name="parking_notes" label="Parking Notes" defaultValue={event.parking_notes} />
          </div>

          <Textarea
            name="description"
            label="Description"
            defaultValue={event.description}
          />

          <Textarea
            name="special_notes"
            label="Special Notes"
            defaultValue={event.special_notes}
          />

          <Textarea
            name="revision_reason"
            label="Revision Reason"
            defaultValue={event.revision_reason}
            placeholder="Briefly explain what changed and why."
          />
        </FormSection>

        <button
          type="submit"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-6 py-4 font-semibold text-white hover:border-accent/40"
        >
          Save Revision Draft
        </button>
      </form>

      <form
        action={submitEventRevision}
        className="rounded-[2rem] border border-accent/20 bg-accent/10 p-8"
      >
        <input type="hidden" name="event_id" value={event.id} />

        <label className="block">
          <span className="text-sm text-white/60">Final Revision Note</span>
          <textarea
            name="revision_reason"
            rows={4}
            defaultValue={event.revision_reason || ''}
            placeholder="Tell HypeKnight what was changed."
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
          />
        </label>

        <button
          type="submit"
          className="mt-6 w-full rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90"
        >
          Submit Revision for Approval
        </button>
      </form>
    </section>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Input({
  name,
  label,
  defaultValue,
  type = 'text',
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  type?: string;
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

function Textarea({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <label className="mt-4 block">
      <span className="text-sm text-white/60">{label}</span>
      <textarea
        name={name}
        rows={5}
        defaultValue={defaultValue || ''}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />
    </label>
  );
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return date.toISOString().slice(0, 16);
}