'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyOrderDiscount } from '@/lib/commerce/event-order';
import { getPlatformSettings } from '@/lib/settings';

export async function applyEventCoupon(formData: FormData) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const settings = await getPlatformSettings();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  if (settings.coupons_enabled === false) throw new Error('Coupons are currently disabled.');

  const eventId = String(formData.get('event_id')||'').trim();
  const code = String(formData.get('coupon_code')||'').trim().toUpperCase();
  if (!eventId || !code) throw new Error('Enter a coupon code.');

  const { data:event } = await supabase.from('events').select('id,owner_id,total_price').eq('id',eventId).eq('owner_id',user.id).single();
  if (!event) throw new Error('Event not found.');
  const { data:order } = await admin.from('event_orders').select('*').eq('event_id',eventId).eq('user_id',user.id).eq('order_kind','event_initial').single();
  if (!order) throw new Error('Event order not found. Return to Enhance and rebuild the package.');
  const { data:coupon } = await admin.from('event_coupons').select('*').eq('code',code).maybeSingle();
  if (!coupon || !coupon.is_active) throw new Error('Invalid coupon code.');
  const now = new Date();
  if (coupon.starts_at && new Date(coupon.starts_at)>now) throw new Error('This coupon is not active yet.');
  if (coupon.expires_at && new Date(coupon.expires_at)<now) throw new Error('This coupon has expired.');
  if (coupon.max_redemptions && Number(coupon.redemption_count||0)>=Number(coupon.max_redemptions)) throw new Error('This coupon has reached its redemption limit.');

  const { discount,total } = applyOrderDiscount({subtotal:Number(order.subtotal||0),discountType:coupon.discount_type,discountAmount:Number(coupon.discount_amount||0),discountPercent:Number(coupon.discount_percent||0)});
  const nowIso = now.toISOString();
  await admin.from('event_orders').update({coupon_id:coupon.id,coupon_code:coupon.code,discount_type:coupon.discount_type,discount_value:coupon.discount_type==='percent'?Number(coupon.discount_percent||0):Number(coupon.discount_amount||0),discount_amount:discount,total,status:total<=0?'paid':'draft',paid_at:total<=0?nowIso:null,updated_at:nowIso}).eq('id',order.id);
  await admin.from('events').update({coupon_code:coupon.code,discount_type:coupon.discount_type,discount_amount:discount,discount_percent:coupon.discount_percent,discounted_total:total,payment_amount:total,payment_status:total<=0?'paid':'pending',is_paid:total<=0,paid_at:total<=0?nowIso:null,status:total<=0?'paid_awaiting_approval':'NPNA',updated_at:nowIso}).eq('id',eventId);
  await admin.from('event_coupon_redemptions').upsert({coupon_id:coupon.id,event_id:eventId,user_id:user.id,code:coupon.code,discount_amount:discount,redeemed_at:nowIso},{onConflict:'coupon_id,event_id'});
  await admin.from('event_coupons').update({redemption_count:Number(coupon.redemption_count||0)+1,updated_at:nowIso}).eq('id',coupon.id);
  redirect(`/dashboard/events/${eventId}/payment?coupon=applied`);
}
