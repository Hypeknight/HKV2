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

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logAdminActivity } from '@/lib/admin/activity-log';

type UserModerationRecord = {
  id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
  app_role: string | null;
  account_status: string | null;
  moderation_status: string | null;
  is_disabled: boolean | null;
  flagged_at: string | null;
  flagged_reason: string | null;
  disabled_at: string | null;
  disabled_reason: string | null;
  deleted_by_admin_at: string | null;
  admin_notes: string | null;
};

const MODERATION_ACTIONS = [
  'flag',
  'suspected_spam',
  'pause',
  'suspend',
  'ban',
  'soft_delete',
  'reactivate',
] as const;

type ModerationAction =
  (typeof MODERATION_ACTIONS)[number];

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('app_role, display_name, username')
      .eq('id', user.id)
      .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  return {
    supabase,
    user,
    adminProfile: profile,
  };
}

async function getUserModerationRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<UserModerationRecord> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      username,
      email,
      app_role,
      account_status,
      moderation_status,
      is_disabled,
      flagged_at,
      flagged_reason,
      disabled_at,
      disabled_reason,
      deleted_by_admin_at,
      admin_notes
    `)
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new Error(
      error?.message || 'User profile not found.'
    );
  }

  return data as UserModerationRecord;
}

function textValue(
  formData: FormData,
  key: string
) {
  return String(formData.get(key) || '').trim();
}

function isModerationAction(
  value: string
): value is ModerationAction {
  return MODERATION_ACTIONS.includes(
    value as ModerationAction
  );
}

function requiresReason(action: ModerationAction) {
  return [
    'suspected_spam',
    'suspend',
    'ban',
    'soft_delete',
  ].includes(action);
}

function refreshUserPaths(userId: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath('/admin/activity');
}

function getUserLabel(
  profile: UserModerationRecord
) {
  return (
    profile.display_name ||
    profile.username ||
    profile.email ||
    'Unnamed User'
  );
}

export async function updateUserModeration(
  formData: FormData
) {
  const {
    supabase,
    user,
    adminProfile,
  } = await requireAdmin();

  const userId = textValue(formData, 'user_id');
  const actionValue = textValue(
    formData,
    'action'
  );
  const reason = textValue(
    formData,
    'reason'
  );

  if (!userId) {
    throw new Error('Missing user id.');
  }

  if (userId === user.id) {
    throw new Error(
      'You cannot moderate your own administrator account.'
    );
  }

  if (!isModerationAction(actionValue)) {
    throw new Error('Invalid moderation action.');
  }

  if (
    requiresReason(actionValue) &&
    !reason
  ) {
    throw new Error(
      'A reason is required for this moderation action.'
    );
  }

  const target = await getUserModerationRecord(
    supabase,
    userId
  );

  if (
    target.app_role === 'admin' &&
    actionValue !== 'flag'
  ) {
    throw new Error(
      'Administrator accounts cannot be disabled, suspended, banned, deleted, or reactivated from this control.'
    );
  }

  const nowIso = new Date().toISOString();

  let payload: Record<string, unknown> = {
    updated_at: nowIso,
  };

  switch (actionValue) {
    case 'flag':
      payload = {
        ...payload,
        moderation_status: 'flagged',
        flagged_at: nowIso,
        flagged_reason:
          reason || 'Flagged by administrator.',
      };
      break;

    case 'suspected_spam':
      payload = {
        ...payload,
        moderation_status: 'suspected_spam',
        account_status: 'paused',
        is_disabled: true,
        disabled_at: nowIso,
        disabled_reason:
          reason || 'Suspected spam account.',
        flagged_at: nowIso,
        flagged_reason:
          reason || 'Suspected spam account.',
      };
      break;

    case 'pause':
      payload = {
        ...payload,
        account_status: 'paused',
        is_disabled: true,
        disabled_at: nowIso,
        disabled_reason:
          reason || 'Paused by administrator.',
      };
      break;

    case 'suspend':
      payload = {
        ...payload,
        account_status: 'suspended',
        is_disabled: true,
        disabled_at: nowIso,
        disabled_reason:
          reason || 'Suspended by administrator.',
      };
      break;

    case 'ban':
      payload = {
        ...payload,
        account_status: 'banned',
        moderation_status: 'reviewed',
        is_disabled: true,
        disabled_at: nowIso,
        disabled_reason:
          reason || 'Banned by administrator.',
      };
      break;

    case 'soft_delete':
      payload = {
        ...payload,
        account_status: 'deleted',
        moderation_status: 'reviewed',
        is_disabled: true,
        disabled_at: nowIso,
        disabled_reason:
          reason ||
          'Soft deleted by administrator.',
        deleted_by_admin_at: nowIso,
      };
      break;

    case 'reactivate':
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
      break;
  }

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminActivity({
    supabase,
    actorId: user.id,
    actorRole: 'admin',
    actorName:
      adminProfile.display_name ||
      adminProfile.username ||
      null,

    category: 'support',
    action: `user_${actionValue}`,

    entityType: 'user',
    entityId: userId,
    entityName: getUserLabel(target),

    previousState: {
      account_status:
        target.account_status || 'active',
      moderation_status:
        target.moderation_status || 'clear',
      is_disabled:
        target.is_disabled === true,
      flagged_at: target.flagged_at,
      flagged_reason:
        target.flagged_reason,
      disabled_at: target.disabled_at,
      disabled_reason:
        target.disabled_reason,
      deleted_by_admin_at:
        target.deleted_by_admin_at,
    },

    newState: payload,

    reason:
      reason ||
      defaultModerationReason(actionValue),

    source: 'admin_user_action',

    metadata: {
      target_role: target.app_role || 'user',
      moderation_action: actionValue,
    },
  });

  refreshUserPaths(userId);

  redirect(
    `/admin/users/${userId}?moderation=${encodeURIComponent(
      actionValue
    )}`
  );
}

export async function updateUserAdminNotes(
  formData: FormData
) {
  const {
    supabase,
    user,
    adminProfile,
  } = await requireAdmin();

  const userId = textValue(
    formData,
    'user_id'
  );
  const adminNotes = textValue(
    formData,
    'admin_notes'
  );

  if (!userId) {
    throw new Error('Missing user id.');
  }

  const target = await getUserModerationRecord(
    supabase,
    userId
  );

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('profiles')
    .update({
      admin_notes:
        adminNotes || null,
      updated_at: nowIso,
    })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminActivity({
    supabase,
    actorId: user.id,
    actorRole: 'admin',
    actorName:
      adminProfile.display_name ||
      adminProfile.username ||
      null,

    category: 'support',
    action: 'update_user_admin_notes',

    entityType: 'user',
    entityId: userId,
    entityName: getUserLabel(target),

    previousState: {
      admin_notes_present:
        Boolean(target.admin_notes),
    },

    newState: {
      admin_notes_present:
        Boolean(adminNotes),
      updated_at: nowIso,
    },

    reason:
      'Internal user notes updated.',

    note:
      adminNotes || null,

    source: 'admin_user_action',
  });

  refreshUserPaths(userId);

  redirect(
    `/admin/users/${userId}?notes=updated`
  );
}

function defaultModerationReason(
  action: ModerationAction
) {
  switch (action) {
    case 'flag':
      return 'Account flagged by administrator.';

    case 'suspected_spam':
      return 'Account marked as suspected spam.';

    case 'pause':
      return 'Account paused by administrator.';

    case 'suspend':
      return 'Account suspended by administrator.';

    case 'ban':
      return 'Account banned by administrator.';

    case 'soft_delete':
      return 'Account soft deleted by administrator.';

    case 'reactivate':
      return 'Account reactivated by administrator.';
  }
}