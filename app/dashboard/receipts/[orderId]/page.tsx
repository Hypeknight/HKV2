import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReceiptActions from '@/components/commerce/ReceiptActions';

type Props={params:Promise<{orderId:string}>};
export default async function ReceiptPage({params}:Props){
 const {orderId}=await params; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect('/auth/login');
 const {data:order,error}=await supabase.from('event_orders').select('*, event:events(id,name,slug,venue_name,address,city,state,event_start_at)').eq('id',orderId).eq('user_id',user.id).single(); if(error||!order)notFound();
 const {data:items}=await supabase.from('event_order_items').select('*').eq('order_id',order.id).order('created_at');
 return <section className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 print:max-w-none print:bg-white print:text-black">
  <div className="print:hidden"><Link href="/dashboard/billing" className="text-sm text-white/60 hover:text-accent">← Billing & Receipts</Link></div>
  <article className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-10 print:border-black/20 print:bg-white">
   <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[.28em] text-accent print:text-black">HypeKnight · Link Entertainment Industries</p><h1 className="mt-3 text-4xl font-black text-white print:text-black">Payment Receipt</h1></div><div className="text-sm text-white/55 print:text-black"><p><strong>Receipt:</strong> {order.order_number}</p><p><strong>Status:</strong> {order.status}</p><p><strong>Paid:</strong> {order.paid_at?new Date(order.paid_at).toLocaleString():'—'}</p></div></div>
   <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5 print:border-black/20 print:bg-white"><h2 className="text-xl font-black text-white print:text-black">{order.event?.name||'Event'}</h2><p className="mt-2 text-sm text-white/55 print:text-black">{order.event?.venue_name}<br/>{order.event?.address}, {order.event?.city}, {order.event?.state}</p></div>
   <div className="mt-8 space-y-4">{(items||[]).map((item:any)=><div key={item.id} className="flex justify-between gap-6 border-b border-white/10 pb-4 print:border-black/20"><div><p className="font-bold text-white print:text-black">{item.label}</p><p className="text-xs text-white/40 print:text-black">{item.quantity} × ${Number(item.unit_price).toFixed(2)}</p></div><p className="font-black text-white print:text-black">${Number(item.line_total).toFixed(2)}</p></div>)}</div>
   <div className="ml-auto mt-8 max-w-sm space-y-2"><Row label="Subtotal" value={Number(order.subtotal)}/>{Number(order.discount_amount)>0?<Row label={`Discount${order.coupon_code?` (${order.coupon_code})`:''}`} value={-Number(order.discount_amount)}/>:null}<div className="flex justify-between border-t border-white/10 pt-3 text-xl print:border-black/20"><span className="font-black text-white print:text-black">Total</span><span className="font-black text-white print:text-black">${Number(order.total).toFixed(2)}</span></div></div>
   <div className="mt-8 grid gap-3 text-xs text-white/40 print:text-black"><p>Stripe Payment Intent: {order.stripe_payment_intent_id||'—'}</p><p>Stripe Charge: {order.stripe_charge_id||'—'}</p></div>
  </article>
  <ReceiptActions stripeReceiptUrl={order.stripe_receipt_url} invoicePdf={order.stripe_invoice_pdf}/>
 </section>;
}
function Row({label,value}:{label:string;value:number}){return <div className="flex justify-between text-sm"><span className="text-white/50 print:text-black">{label}</span><span className="text-white print:text-black">{value<0?'-':''}${Math.abs(value).toFixed(2)}</span></div>}
