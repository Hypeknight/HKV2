'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') redirect('/dashboard');

  return user;
}

function cleanCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 20);
}

export async function approveAmbassadorApplication(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const applicationId = String(formData.get('application_id') || '');
  const adminNotes = String(formData.get('admin_notes') || '').trim();

  if (!applicationId) throw new Error('Missing application id.');

  const { data: application, error: fetchError } = await supabase
    .from('ambassador_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (fetchError || !application) {
    throw new Error(fetchError?.message || 'Application not found.');
  }

  const nowIso = new Date().toISOString();

  const { error: appError } = await supabase
    .from('ambassador_applications')
    .update({
      status: 'approved',
      admin_notes: adminNotes || null,
      reviewed_at: nowIso,
      reviewed_by: admin.id,
      updated_at: nowIso,
    })
    .eq('id', applicationId);

  if (appError) throw new Error(appError.message);

  const { error: profileError } = await supabase
    .from('ambassador_profiles')
    .upsert(
      {
        user_id: application.user_id,
        application_id: application.id,
        status: 'active',
        commission_rate: 30,
        approved_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: 'user_id' }
    );

  if (profileError) throw new Error(profileError.message);

  const { error: roleError } = await supabase
    .from('profiles')
    .update({
      app_role: 'ambassador',
      updated_at: nowIso,
    })
    .eq('id', application.user_id);

  if (roleError) throw new Error(roleError.message);

  redirect('/admin/ambassadors?application=approved');
}

export async function rejectAmbassadorApplication(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const applicationId = String(formData.get('application_id') || '');
  const adminNotes = String(formData.get('admin_notes') || '').trim();

  if (!applicationId) throw new Error('Missing application id.');

  const { error } = await supabase
    .from('ambassador_applications')
    .update({
      status: 'rejected',
      admin_notes: adminNotes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (error) throw new Error(error.message);

  redirect('/admin/ambassadors?application=rejected');
}

export async function suspendAmbassador(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const ambassadorId = String(formData.get('ambassador_id') || '');
  const adminNotes = String(formData.get('admin_notes') || '').trim();

  if (!ambassadorId) throw new Error('Missing ambassador id.');

  const nowIso = new Date().toISOString();

  const { data: ambassador, error: fetchError } = await supabase
    .from('ambassador_profiles')
    .select('id, user_id')
    .eq('id', ambassadorId)
    .single();

  if (fetchError || !ambassador) {
    throw new Error(fetchError?.message || 'Ambassador not found.');
  }

  const { error: ambassadorError } = await supabase
    .from('ambassador_profiles')
    .update({
      status: 'suspended',
      suspended_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', ambassadorId);

  if (ambassadorError) throw new Error(ambassadorError.message);

  await supabase
    .from('ambassador_applications')
    .update({
      status: 'suspended',
      admin_notes: adminNotes || null,
      updated_at: nowIso,
    })
    .eq('user_id', ambassador.user_id);

  await supabase
    .from('ambassador_coupon_requests')
    .update({
      status: 'disabled',
      admin_notes: adminNotes || null,
      updated_at: nowIso,
    })
    .eq('ambassador_id', ambassadorId)
    .in('status', ['pending', 'approved', 'active']);

  redirect('/admin/ambassadors?ambassador=suspended');
}

export async function reactivateAmbassador(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const ambassadorId = String(formData.get('ambassador_id') || '');

  if (!ambassadorId) throw new Error('Missing ambassador id.');

  const { data: ambassador, error: fetchError } = await supabase
    .from('ambassador_profiles')
    .select('id, user_id')
    .eq('id', ambassadorId)
    .single();

  if (fetchError || !ambassador) {
    throw new Error(fetchError?.message || 'Ambassador not found.');
  }

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('ambassador_profiles')
    .update({
      status: 'active',
      suspended_at: null,
      updated_at: nowIso,
    })
    .eq('id', ambassadorId);

  if (error) throw new Error(error.message);

  await supabase
    .from('ambassador_applications')
    .update({
      status: 'approved',
      updated_at: nowIso,
    })
    .eq('user_id', ambassador.user_id);

  await supabase
    .from('profiles')
    .update({
      app_role: 'ambassador',
      updated_at: nowIso,
    })
    .eq('id', ambassador.user_id);

  redirect('/admin/ambassadors?ambassador=reactivated');
}

export async function removeAmbassador(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const ambassadorId = String(formData.get('ambassador_id') || '');
  const adminNotes = String(formData.get('admin_notes') || '').trim();

  if (!ambassadorId) throw new Error('Missing ambassador id.');

  const { data: ambassador, error: fetchError } = await supabase
    .from('ambassador_profiles')
    .select('id, user_id')
    .eq('id', ambassadorId)
    .single();

  if (fetchError || !ambassador) {
    throw new Error(fetchError?.message || 'Ambassador not found.');
  }

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('ambassador_profiles')
    .update({
      status: 'removed',
      removed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', ambassadorId);

  if (error) throw new Error(error.message);

  await supabase
    .from('profiles')
    .update({
      app_role: 'user',
      updated_at: nowIso,
    })
    .eq('id', ambassador.user_id);

  await supabase
    .from('ambassador_applications')
    .update({
      status: 'rejected',
      admin_notes: adminNotes || 'Ambassador account removed.',
      updated_at: nowIso,
    })
    .eq('user_id', ambassador.user_id);

  await supabase
    .from('ambassador_coupon_requests')
    .update({
      status: 'disabled',
      admin_notes: adminNotes || 'Ambassador account removed.',
      updated_at: nowIso,
    })
    .eq('ambassador_id', ambassadorId);

  redirect('/admin/ambassadors?ambassador=removed');
}

export async function approveCouponRequest(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const requestId = String(formData.get('request_id') || '');
  const adminNotes = String(formData.get('admin_notes') || '').trim();

  if (!requestId) throw new Error('Missing request id.');

  const { data: request, error: requestError } = await supabase
    .from('ambassador_coupon_requests')
    .select(`
      *,
      ambassador:ambassador_profiles(id, user_id, status, commission_rate)
    `)
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message || 'Coupon request not found.');
  }

  if (request.ambassador?.status !== 'active') {
    throw new Error('Ambassador is not active.');
  }

  const code = cleanCode(request.requested_code);

  const { data: existingCoupon } = await supabase
    .from('event_coupons')
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (existingCoupon) {
    throw new Error('A coupon with this code already exists.');
  }

  const nowIso = new Date().toISOString();

  const { data: coupon, error: couponError } = await supabase
    .from('event_coupons')
    .insert({
      code,
      discount_type: 'percent',
      discount_value: request.discount_percent,
      max_uses: request.usage_limit,
      times_used: 0,
      is_active: true,
      applies_to: 'events',
      source: 'ambassador',
      created_by: admin.id,
      starts_at: nowIso,
      metadata: {
        ambassador_id: request.ambassador_id,
        ambassador_user_id: request.user_id,
        commission_rate: request.ambassador.commission_rate || 30,
      },
    })
    .select('id')
    .single();

  if (couponError) throw new Error(couponError.message);

  const { error: updateRequestError } = await supabase
    .from('ambassador_coupon_requests')
    .update({
      status: 'active',
      created_coupon_id: coupon.id,
      admin_notes: adminNotes || null,
      reviewed_at: nowIso,
      reviewed_by: admin.id,
      updated_at: nowIso,
    })
    .eq('id', requestId);

  if (updateRequestError) throw new Error(updateRequestError.message);

  redirect('/admin/ambassadors?coupon=approved');
}

export async function rejectCouponRequest(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const requestId = String(formData.get('request_id') || '');
  const adminNotes = String(formData.get('admin_notes') || '').trim();

  if (!requestId) throw new Error('Missing request id.');

  const { error } = await supabase
    .from('ambassador_coupon_requests')
    .update({
      status: 'rejected',
      admin_notes: adminNotes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) throw new Error(error.message);

  redirect('/admin/ambassadors?coupon=rejected');
}

export async function disableCouponRequest(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const requestId = String(formData.get('request_id') || '');

  if (!requestId) throw new Error('Missing request id.');

  const { data: request, error: requestError } = await supabase
    .from('ambassador_coupon_requests')
    .select('id, created_coupon_id')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message || 'Request not found.');
  }

  const nowIso = new Date().toISOString();

  await supabase
    .from('event_coupons')
    .update({
      is_active: false,
      updated_at: nowIso,
    })
    .eq('id', request.created_coupon_id);

  const { error } = await supabase
    .from('ambassador_coupon_requests')
    .update({
      status: 'disabled',
      updated_at: nowIso,
    })
    .eq('id', requestId);

  if (error) throw new Error(error.message);

  redirect('/admin/ambassadors?coupon=disabled');
}