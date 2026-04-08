import { notFound, redirect } from 'next/navigation';
import { updateEventStep3, submitEventForModeration } from '@/app/dashboard/events/actions';
import { createClient } from '@/lib/supabase/server';
import EventStep3Form from '@/components/events/EventStep3Form';

type Step3PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const EXTRA_DAY_PRICE = 2.5;
const LITE_PRICE = 9.99;
const FULL_PRICE = 49.99;

export default async function EditEventStep3Page({ params }: Step3PageProps) {
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
      status,
      event_start_at,
      event_end_at,
      included_promo_days,
      extra_promo_days,
      base_price,
      extra_promo_price,
      linkdn_mode,
      linkdn_price,
      total_price
    `)
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error || !event) notFound();

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Create Event
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">
          Step 3: Promotion + Upgrades
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Choose your promotion window, review pricing, and add optional features.
        </p>
      </div>

      <EventStep3Form
        event={event}
        extraDayPrice={EXTRA_DAY_PRICE}
        litePrice={LITE_PRICE}
        fullPrice={FULL_PRICE}
        updateAction={updateEventStep3}
        submitAction={submitEventForModeration}
      />
    </section>
  );
}