import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { updateEventStep3 } from '@/app/dashboard/events/actions';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/settings';
import EventEnhanceForm from '@/components/events/EventEnhanceForm';

type Props = { params: Promise<{ id:string }> };

export default async function EnhanceEventPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const [{ data:event, error }, settings, { data: products }] = await Promise.all([
    supabase.from('events').select('id,name,extra_promo_days,end_time_is_explicit,status').eq('id', id).eq('owner_id', user.id).single(),
    getPlatformSettings(),
    supabase.from('platform_products').select('code,name,description,price,requires_event_end,sort_order').eq('enabled', true).eq('product_type','event_addon').order('sort_order'),
  ]);
  if (error || !event) notFound();
  const addons = (products || []).map((p:any) => ({ ...p, price:Number(p.price||0) }));
  return <section className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
    <Link href={`/dashboard/events/${event.id}/edit/step-2`} className="text-sm text-white/60 hover:text-accent">← Back to Experience</Link>
    <header className="rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 sm:p-10"><p className="text-xs uppercase tracking-[0.3em] text-accent">3 of 4 · Enhance</p><h1 className="mt-4 text-4xl font-black text-white sm:text-6xl">Build the event package.</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-white/65">Promotion, Patron Pulse, Linkd’N, and future LEI event products live here. Admin controls which products are available and what they cost.</p></header>
    <EventEnhanceForm eventId={event.id} action={updateEventStep3} basePrice={Number(settings.event_base_price||19.99)} includedDays={Number(settings.included_promo_days||14)} extraDayPrice={Number(settings.extra_promo_day_price||2.5)} currentExtraDays={Number(event.extra_promo_days||0)} addons={addons} hasExplicitEnd={Boolean(event.end_time_is_explicit)} />
  </section>;
}
