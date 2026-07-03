/*
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

export async function updateUserRole(formData: FormData) {
  await requireAdmin();

  const supabase = createAdminClient();

  const userId = String(formData.get('user_id') || '');
  const role = String(formData.get('app_role') || 'user');

  if (!userId) throw new Error('Missing user id.');

  if (!['user', 'venue_owner', 'admin'].includes(role)) {
    throw new Error('Invalid role.');
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      app_role: role,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  redirect('/admin/users?role=updated');
}
  */
 'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

  return { supabase, user };
}

export async function updateUserModeration(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const userId = String(formData.get('user_id') || '');
  const action = String(formData.get('action') || '');
  const reason = String(formData.get('reason') || '').trim();

  if (!userId) throw new Error('Missing user id.');
  if (userId === user.id) throw new Error('You cannot moderate your own admin account.');

  const nowIso = new Date().toISOString();

  let payload: Record<string, any> = {
    admin_notes: reason || null,
    updated_at: nowIso,
  };

  if (action === 'flag') {
    payload = {
      ...payload,
      moderation_status: 'flagged',
      flagged_at: nowIso,
      flagged_reason: reason || 'Flagged by admin.',
    };
  } else if (action === 'suspected_spam') {
    payload = {
      ...payload,
      moderation_status: 'suspected_spam',
      account_status: 'paused',
      is_disabled: true,
      disabled_at: nowIso,
      disabled_reason: reason || 'Suspected spam account.',
      flagged_at: nowIso,
      flagged_reason: reason || 'Suspected spam account.',
    };
  } else if (action === 'pause') {
    payload = {
      ...payload,
      account_status: 'paused',
      is_disabled: true,
      disabled_at: nowIso,
      disabled_reason: reason || 'Paused by admin.',
    };
  } else if (action === 'suspend') {
    payload = {
      ...payload,
      account_status: 'suspended',
      is_disabled: true,
      disabled_at: nowIso,
      disabled_reason: reason || 'Suspended by admin.',
    };
  } else if (action === 'ban') {
    payload = {
      ...payload,
      account_status: 'banned',
      moderation_status: 'reviewed',
      is_disabled: true,
      disabled_at: nowIso,
      disabled_reason: reason || 'Banned by admin.',
    };
  } else if (action === 'soft_delete') {
    payload = {
      ...payload,
      account_status: 'deleted',
      moderation_status: 'reviewed',
      is_disabled: true,
      disabled_at: nowIso,
      disabled_reason: reason || 'Soft deleted by admin.',
      deleted_by_admin_at: nowIso,
    };
  } else if (action === 'reactivate') {
    payload = {
      ...payload,
      account_status: 'active',
      moderation_status: 'clear',
      is_disabled: false,
      disabled_at: null,
      disabled_reason: null,
      flagged_at: null,
      flagged_reason: null,
      deleted_by_admin_at: null,
    };
  } else {
    throw new Error('Invalid moderation action.');
  }

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId);

  if (error) throw new Error(error.message);

  redirect(`/admin/users/${userId}?updated=1`);
}

export async function updateUserAdminNotes(formData: FormData) {
  const { supabase } = await requireAdmin();

  const userId = String(formData.get('user_id') || '');
  const adminNotes = String(formData.get('admin_notes') || '').trim();

  if (!userId) throw new Error('Missing user id.');

  const { error } = await supabase
    .from('profiles')
    .update({
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  redirect(`/admin/users/${userId}?notes=updated`);
}