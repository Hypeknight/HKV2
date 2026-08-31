'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function resolveRequest(formData:FormData,status:'approved'|'declined'){
 const supabase=await createClient();const admin=createAdminClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/auth/login');
 const requestId=String(formData.get('request_id')||'');const {data:req}=await admin.from('venue_event_connection_requests').select('*').eq('id',requestId).eq('venue_owner_id',user.id).single();if(!req)throw new Error('Connection request not found.');
 const now=new Date().toISOString();await admin.from('venue_event_connection_requests').update({status,reviewed_at:now,updated_at:now}).eq('id',requestId);
 if(status==='approved')await admin.from('events').update({venue_id:req.venue_id,venue_connection_status:'approved',updated_at:now}).eq('id',req.event_id);
 else await admin.from('events').update({venue_connection_status:'declined',updated_at:now}).eq('id',req.event_id);
 revalidatePath('/dashboard/venues/connections');revalidatePath(`/dashboard/events/${req.event_id}/review`);
}
export async function approveVenueConnection(formData:FormData){return resolveRequest(formData,'approved')}
export async function declineVenueConnection(formData:FormData){return resolveRequest(formData,'declined')}
