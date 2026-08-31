'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/auth/login');const {data:profile}=await supabase.from('profiles').select('app_role').eq('id',user.id).single();if(profile?.app_role!=='admin')redirect('/dashboard');return createAdminClient();}
const bool=(f:FormData,k:string)=>f.get(k)==='on';
const num=(f:FormData,k:string,d=0)=>{const v=Number(f.get(k));return Number.isFinite(v)?v:d};
export async function updateCommerceSettings(formData:FormData){const admin=await requireAdmin();const {error}=await admin.from('platform_settings').update({event_builder_enabled:bool(formData,'event_builder_enabled'),venue_matching_enabled:bool(formData,'venue_matching_enabled'),venue_approval_required:bool(formData,'venue_approval_required'),default_discovery_buffer_minutes:Math.max(1,Math.round(num(formData,'default_discovery_buffer_minutes',30))),commerce_receipts_enabled:bool(formData,'commerce_receipts_enabled'),coupons_enabled:bool(formData,'coupons_enabled'),updated_at:new Date().toISOString()}).eq('id','global');if(error)throw new Error(error.message);redirect('/admin/commerce?saved=settings');}
export async function updateProduct(formData:FormData){const admin=await requireAdmin();const id=String(formData.get('product_id')||'');if(!id)throw new Error('Missing product id.');const {error}=await admin.from('platform_products').update({enabled:bool(formData,'enabled'),price:Math.max(0,num(formData,'price',0)),requires_event_end:bool(formData,'requires_event_end'),description:String(formData.get('description')||'').trim()||null,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw new Error(error.message);redirect('/admin/commerce?saved=product');}
