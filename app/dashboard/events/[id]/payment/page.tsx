import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProceedToEventPaymentButton from '@/components/events/ProceedToEventPaymentButton';

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ canceled?: string }>;
};

export default async function EventPaymentPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};

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
    .single();

  if (error || !event) notFound();

  const amount = Number(event.payment_amount || event.total_price || event.price || 0);
  const isPaid = event.payment_status === 'paid' || event.is_paid === true;

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Event Payment
        </p>

        <h1 className="mt-3 text-4xl font-bold text-white">{event.name}</h1>

        <p className="mt-3 text-white/70">
          Complete payment to submit this event for promotion on HypeKnight.
        </p>

        {query.canceled ? (
          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-100">
            Checkout was canceled. You can restart payment whenever you are ready.
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Info label="Event Status" value={event.status} />
          <Info label="Payment Status" value={event.payment_status || 'pending'} />
          <Info label="Amount Due" value={`$${amount.toFixed(2)}`} />
          <Info
            label="Event Date"
            value={
              event.event_start_at
                ? new Date(event.event_start_at).toLocaleString()
                : '—'
            }
          />
        </div>

        <div className="mt-8 space-y-3">
          {isPaid ? (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-green-100">
              This event payment is complete.
            </div>
          ) : (
            <ProceedToEventPaymentButton eventId={event.id} />
          )}

          <Link
            href={`/dashboard/events/${event.id}/review`}
            className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
          >
            Back to Event Review
          </Link>
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
    </div>
  );
}