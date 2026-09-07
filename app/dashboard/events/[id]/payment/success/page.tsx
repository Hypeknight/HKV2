import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { reconcileEventCheckoutSession } from '@/lib/stripe/reconcile-event-checkout';

type Props={params:Promise<{id:string}>;searchParams?:Promise<{session_id?:string}>};
export default async function EventPaymentSuccessPage({params,searchParams}:Props){
 const {id}=await params; const query=searchParams?await searchParams:{}; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect('/auth/login');
 const {data:event,error}=await supabase.from('events').select('id,name,owner_id').eq('id',id).eq('owner_id',user.id).single(); if(error||!event)notFound();
 let orderId:string|null=null; let message='Payment returned from Stripe.';
 if(query.session_id){try{const result=await reconcileEventCheckoutSession(query.session_id);orderId=result.orderId;message='Payment verified. Your order receipt is ready and the event can continue through HypeKnight review.';}catch(error){message=error instanceof Error?`Payment returned, but verification failed: ${error.message}`:'Payment returned, but verification failed.';}}
 if(!orderId){const {data:order}=await supabase.from('event_orders').select('id').eq('event_id',id).eq('user_id',user.id).eq('order_kind','event_initial').maybeSingle();orderId=order?.id||null;}
 return <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8"><div className="rounded-[2rem] border border-green-500/20 bg-green-500/10 p-8"><p className="text-sm uppercase tracking-[.35em] text-green-300">Payment complete</p><h1 className="mt-3 text-4xl font-black text-white">{event.name}</h1><p className="mt-4 leading-7 text-white/75">{message}</p><div className="mt-8 flex flex-wrap gap-3">{orderId?<Link href={`/dashboard/receipts/${orderId}`} className="rounded-2xl bg-white px-5 py-3 font-black text-black">View Receipt</Link>:null}<Link href={`/dashboard/events/${id}/review`} className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 font-bold text-white">Return to Review</Link><Link href="/dashboard/billing" className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 font-bold text-white">Billing & Receipts</Link></div></div></section>;
}
