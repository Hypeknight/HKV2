import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { submitEventForModeration, discardDraftEvent } from '@/app/dashboard/events/actions';

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    submitted?: string;
    paid?: string;
    revision?: string;
  }>;
};

export default async function EventReviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data:event, error } = await supabase.from('events').select('*').eq('id',id).eq('owner_id',user.id).single();
  if (error || !event) notFound();

  const { data: revision, error: revisionError } = await supabase
    .from('event_revisions')
    .select('id,status,revision_reason,admin_note,submitted_at,reviewed_at')
    .eq('event_id', id)
    .eq('created_by', user.id)
    .in('status', ['draft', 'submitted', 'rejected'])
    .maybeSingle();

  if (revisionError) throw new Error(revisionError.message);

  const hasOpenRevision = Boolean(revision);
  const revisionEditable =
    revision?.status === 'draft' || revision?.status === 'rejected';
  const revisionSubmitted = revision?.status === 'submitted';

  const { data:order } = await supabase.from('event_orders').select('id,order_number,status,subtotal,discount_amount,total,coupon_code').eq('event_id',id).maybeSingle();
  const { data:items } = order ? await supabase.from('event_order_items').select('id,label,quantity,unit_price,line_total,product_code').eq('order_id',order.id).order('created_at') : { data: [] as any[] };
  const paid = event.is_paid || event.payment_status === 'paid' || event.payment_override || Number(order?.total ?? event.payment_amount ?? 0) <= 0;

  return <section className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
    <Link href={`/dashboard/events/${id}/edit/step-3`} className="text-sm text-white/60 hover:text-accent">← Back to Enhance</Link>
    <header className="rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 sm:p-10"><p className="text-xs uppercase tracking-[0.3em] text-accent">4 of 4 · Review</p><h1 className="mt-4 text-4xl font-black text-white sm:text-6xl">See the night before you submit it.</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-white/65">Review the public event identity, discovery timing, and order. Payment and coupon handling happen from this order, while admin moderation remains intact.</p></header>
    {query.submitted ? <Notice>Event submitted successfully.</Notice> : null}
    {query.paid ? <Notice>Payment reconciled successfully.</Notice> : null}
    {revisionSubmitted ? (
      <Notice>
        Your revision is awaiting HypeKnight review. The currently approved event remains public and unchanged while the proposed update is reviewed.
      </Notice>
    ) : null}
    {revision?.status === 'rejected' ? (
      <Notice>
        Your proposed revision needs changes before it can be approved. The currently approved event remains public and unchanged.
        {revision.admin_note ? ` Admin note: ${revision.admin_note}` : ''}
      </Notice>
    ) : null}
    <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
        {event.flyer_url ? <div className="aspect-[16/8] bg-cover bg-center" style={{backgroundImage:`url(${event.flyer_url})`}} /> : <div className="flex aspect-[16/6] items-center justify-center bg-black/30 text-white/30">Event image preview</div>}
        <div className="p-6 sm:p-8"><p className="text-xs uppercase tracking-[.25em] text-accent">HypeKnight Event</p><h2 className="mt-3 text-3xl font-black text-white">{event.name}</h2><p className="mt-3 text-white/65">{event.venue_name}<br />{event.address}, {event.city}, {event.state}</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Starts" value={formatDate(event.event_start_at)} /><Info label="Ends" value={event.event_end_at ? formatDate(event.event_end_at) : 'Not specified'} /><Info label="Discoverable until" value={formatDate(event.discovery_end_at || event.promotion_end_at)} /><Info label="Venue connection" value={event.venue_connection_status || 'unmatched'} /></div><div className="mt-5 flex flex-wrap gap-2">{split(event.event_type).map((v)=><Tag key={v}>{v}</Tag>)}{(event.vibe_tags||[]).map((v:string)=><Tag key={v}>{v}</Tag>)}{(event.music_selection||[]).map((v:string)=><Tag key={v}>{v}</Tag>)}</div>{event.description ? <p className="mt-6 leading-7 text-white/60">{event.description}</p> : null}</div>
      </section>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.25em] text-white/40">Order</p><h2 className="mt-2 text-xl font-black text-white">{order?.order_number || 'Event package'}</h2></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">{paid ? 'Paid / ready' : 'Payment due'}</span></div><div className="mt-6 space-y-3">{(items||[]).map((item:any)=><div key={item.id} className="flex justify-between gap-4 text-sm"><span className="text-white/60">{item.label}{Number(item.quantity)>1 ? ` × ${item.quantity}`:''}</span><span className="font-bold text-white">${Number(item.line_total||0).toFixed(2)}</span></div>)}</div><div className="mt-5 border-t border-white/10 pt-4"><Row label="Subtotal" value={Number(order?.subtotal ?? event.total_price ?? 0)} />{Number(order?.discount_amount||0)>0 ? <Row label={`Discount${order?.coupon_code ? ` (${order.coupon_code})`:''}`} value={-Number(order?.discount_amount||0)} />:null}<div className="mt-3 flex items-center justify-between text-lg"><span className="font-bold text-white">Total</span><span className="text-2xl font-black text-white">${Number(order?.total ?? event.payment_amount ?? 0).toFixed(2)}</span></div></div>{!paid ? <Link href={`/dashboard/events/${id}/payment`} className="mt-6 block rounded-2xl bg-accent px-5 py-4 text-center font-black text-black">Coupons & Payment →</Link> : null}</section>
        {hasOpenRevision ? (
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[.25em] text-accent">Event Revision</p>
            <h2 className="mt-2 text-xl font-black text-white">
              {revisionSubmitted
                ? 'Revision awaiting review'
                : revision?.status === 'rejected'
                  ? 'Revision needs changes'
                  : 'Revision draft in progress'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Your approved event remains public while proposed changes are handled separately.
            </p>

            {revision?.revision_reason ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[.18em] text-white/35">Revision Note</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {revision.revision_reason}
                </p>
              </div>
            ) : null}

            {revisionEditable ? (
              <Link
                href={`/dashboard/events/${id}/edit`}
                className="mt-5 block rounded-2xl bg-white px-5 py-4 text-center font-black text-black"
              >
                Continue Revision
              </Link>
            ) : null}
          </section>
        ) : (
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-black text-white">Ready?</h2>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Submitting preserves the existing HypeKnight moderation workflow.
            </p>

            {['building', 'draft', 'rejected'].includes(event.status) ? (
              <>
                <form action={submitEventForModeration} className="mt-5">
                  <input type="hidden" name="event_id" value={id}/>
                  <button className="w-full rounded-2xl bg-white px-5 py-4 font-black text-black">
                    Submit event
                  </button>
                </form>

                <form action={discardDraftEvent} className="mt-3">
                  <input type="hidden" name="event_id" value={id}/>
                  <button className="w-full rounded-2xl border border-red-500/20 px-5 py-3 text-sm font-bold text-red-200">
                    Discard draft
                  </button>
                </form>
              </>
            ) : (
              <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                This event has already completed its submission workflow.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  </section>;
}
function formatDate(v:string|null){if(!v)return '—';return new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v));}
function split(v:string|null){return String(v||'').split(',').map(x=>x.trim()).filter(Boolean)}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[.18em] text-white/35">{label}</p><p className="mt-2 font-bold text-white">{value}</p></div>}
function Tag({children}:{children:React.ReactNode}){return <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">{children}</span>}
function Row({label,value}:{label:string;value:number}){return <div className="mt-2 flex justify-between text-sm"><span className="text-white/50">{label}</span><span className="text-white">{value<0?'-':''}${Math.abs(value).toFixed(2)}</span></div>}
function Notice({children}:{children:React.ReactNode}){return <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-green-100">{children}</div>}
