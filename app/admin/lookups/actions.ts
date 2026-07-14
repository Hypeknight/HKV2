'use server';

import {
  revalidatePath,
  revalidateTag,
} from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) redirect('/auth/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  return { supabase, user };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function nullableText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function intValue(
  formData: FormData,
  key: string,
  fallback = 100
) {
  const raw = formData.get(key);

  if (raw === null || raw === '') {
    return fallback;
  }

  const value = Number(raw);

  return Number.isFinite(value)
    ? Math.max(Math.round(value), 0)
    : fallback;
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === 'on';
}

function normalizeStoredValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function normalizeColor(value: string) {
  const color = value.trim();

  if (!color) return null;

  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color.toUpperCase();
  }

  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const short = color.slice(1);

    return `#${short
      .split('')
      .map((character) => character.repeat(2))
      .join('')
      .toUpperCase()}`;
  }

  throw new Error(
    'Color must be a valid hexadecimal value such as #FFAA00.'
  );
}

async function requireCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryKey: string
) {
  const { data: category, error } = await supabase
    .from('lookup_categories')
    .select('id, category_key, is_active')
    .eq('category_key', categoryKey)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!category) {
    throw new Error(
      `Lookup category "${categoryKey}" does not exist.`
    );
  }

  return category;
}

async function ensureUniqueValue({
  supabase,
  categoryKey,
  storedValue,
  displayName,
  excludeId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  categoryKey: string;
  storedValue: string;
  displayName: string;
  excludeId?: string;
}) {
  let valueQuery = supabase
    .from('lookup_values')
    .select('id, value, display_name')
    .eq('category_key', categoryKey)
    .eq('value', storedValue);

  if (excludeId) {
    valueQuery = valueQuery.neq('id', excludeId);
  }

  const { data: valueMatch, error: valueError } =
    await valueQuery.maybeSingle();

  if (valueError) {
    throw new Error(valueError.message);
  }

  if (valueMatch) {
    throw new Error(
      `The stored value "${storedValue}" already exists in this category.`
    );
  }

  let nameQuery = supabase
    .from('lookup_values')
    .select('id, value, display_name')
    .eq('category_key', categoryKey)
    .ilike('display_name', displayName);

  if (excludeId) {
    nameQuery = nameQuery.neq('id', excludeId);
  }

  const { data: nameMatch, error: nameError } =
    await nameQuery.maybeSingle();

  if (nameError) {
    throw new Error(nameError.message);
  }

  if (nameMatch) {
    throw new Error(
      `The display name "${displayName}" already exists in this category.`
    );
  }
}

function refreshLookupPaths(categoryKey?: string) {
  revalidateTag('lookups');
  revalidatePath('/admin');
  revalidatePath('/admin/configuration');
  revalidatePath('/admin/lookups');

  revalidatePath('/events');
  revalidatePath('/dashboard/preferences');
  revalidatePath('/dashboard/events/new/step-1');
  revalidatePath('/dashboard/events/new/step-2');

  if (categoryKey) {
    revalidatePath(
      `/admin/lookups?category=${encodeURIComponent(
        categoryKey
      )}`
    );
  }
}

function lookupRedirect(
  categoryKey: string,
  result: 'created' | 'updated' | 'toggled'
) {
  redirect(
    `/admin/lookups?category=${encodeURIComponent(
      categoryKey
    )}&${result}=1`
  );
}

export async function createLookupValue(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const categoryKey = text(
    formData,
    'category_key'
  );

  const displayName = text(
    formData,
    'display_name'
  );

  if (!categoryKey) {
    throw new Error('Lookup category is required.');
  }

  if (!displayName) {
    throw new Error('Display name is required.');
  }

  await requireCategory(supabase, categoryKey);

  const requestedValue =
    text(formData, 'value') || displayName;

  const storedValue =
    normalizeStoredValue(requestedValue);

  if (!storedValue) {
    throw new Error(
      'The stored value could not be generated. Use letters or numbers.'
    );
  }

  await ensureUniqueValue({
    supabase,
    categoryKey,
    storedValue,
    displayName,
  });

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('lookup_values')
    .insert({
      category_key: categoryKey,
      value: storedValue,
      display_name: displayName,
      description: nullableText(
        formData,
        'description'
      ),
      icon: nullableText(formData, 'icon'),
      color: normalizeColor(
        text(formData, 'color')
      ),
      sort_order: intValue(
        formData,
        'sort_order',
        100
      ),
      is_active: bool(formData, 'is_active'),

      created_at: nowIso,
      updated_at: nowIso,

      created_by: user.id,
      updated_by: user.id,
    });

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'A lookup value with this category and stored value already exists.'
      );
    }

    throw new Error(error.message);
  }

  refreshLookupPaths(categoryKey);
  lookupRedirect(categoryKey, 'created');
}

export async function updateLookupValue(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const id = text(formData, 'id');

  const categoryKey = text(
    formData,
    'category_key'
  );

  const displayName = text(
    formData,
    'display_name'
  );

  if (!id) {
    throw new Error('Missing lookup value ID.');
  }

  if (!categoryKey) {
    throw new Error('Missing lookup category.');
  }

  if (!displayName) {
    throw new Error('Display name is required.');
  }

  await requireCategory(supabase, categoryKey);

  const requestedValue =
    text(formData, 'value') || displayName;

  const storedValue =
    normalizeStoredValue(requestedValue);

  if (!storedValue) {
    throw new Error(
      'The stored value could not be generated.'
    );
  }

  const { data: existing, error: existingError } =
    await supabase
      .from('lookup_values')
      .select('id, category_key')
      .eq('id', id)
      .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existing) {
    throw new Error('Lookup value not found.');
  }

  if (existing.category_key !== categoryKey) {
    throw new Error(
      'The lookup value does not belong to the selected category.'
    );
  }

  await ensureUniqueValue({
    supabase,
    categoryKey,
    storedValue,
    displayName,
    excludeId: id,
  });

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('lookup_values')
    .update({
      value: storedValue,
      display_name: displayName,
      description: nullableText(
        formData,
        'description'
      ),
      icon: nullableText(formData, 'icon'),
      color: normalizeColor(
        text(formData, 'color')
      ),
      sort_order: intValue(
        formData,
        'sort_order',
        100
      ),
      is_active: bool(formData, 'is_active'),

      updated_at: nowIso,
      updated_by: user.id,
    })
    .eq('id', id)
    .eq('category_key', categoryKey);

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'A lookup value with this category and stored value already exists.'
      );
    }

    throw new Error(error.message);
  }

  refreshLookupPaths(categoryKey);
  lookupRedirect(categoryKey, 'updated');
}

export async function toggleLookupValue(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const id = text(formData, 'id');

  const categoryKey = text(
    formData,
    'category_key'
  );

  const currentIsActive =
    text(formData, 'is_active') === 'true';

  if (!id) {
    throw new Error('Missing lookup value ID.');
  }

  if (!categoryKey) {
    throw new Error('Missing lookup category.');
  }

  await requireCategory(supabase, categoryKey);

  const { data: existing, error: existingError } =
    await supabase
      .from('lookup_values')
      .select('id, category_key, is_active')
      .eq('id', id)
      .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existing) {
    throw new Error('Lookup value not found.');
  }

  if (existing.category_key !== categoryKey) {
    throw new Error(
      'The lookup value does not belong to the selected category.'
    );
  }

  const nextActiveState =
    typeof existing.is_active === 'boolean'
      ? !existing.is_active
      : !currentIsActive;

  const { error } = await supabase
    .from('lookup_values')
    .update({
      is_active: nextActiveState,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', id)
    .eq('category_key', categoryKey);

  if (error) {
    throw new Error(error.message);
  }

  refreshLookupPaths(categoryKey);
  lookupRedirect(categoryKey, 'toggled');
}

export async function createLookupCategory(
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const name = text(formData, 'name');

  if (!name) {
    throw new Error('Category name is required.');
  }

  const requestedKey =
    text(formData, 'category_key') || name;

  const categoryKey =
    normalizeStoredValue(requestedKey);

  if (!categoryKey) {
    throw new Error(
      'The category key could not be generated. Use letters or numbers.'
    );
  }

  const { data: existingCategory, error: existingError } =
    await supabase
      .from('lookup_categories')
      .select('id, category_key, name')
      .or(
        `category_key.eq.${categoryKey},name.ilike.${escapePostgrestValue(
          name
        )}`
      )
      .limit(1)
      .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingCategory) {
    if (existingCategory.category_key === categoryKey) {
      throw new Error(
        `The category key "${categoryKey}" already exists.`
      );
    }

    throw new Error(
      `A category named "${name}" already exists.`
    );
  }

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('lookup_categories')
    .insert({
      category_key: categoryKey,
      name,
      description:
        nullableText(formData, 'description'),
      is_active: bool(formData, 'is_active'),
      sort_order: intValue(
        formData,
        'sort_order',
        100
      ),
      created_at: nowIso,
      updated_at: nowIso,
    });

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'A lookup category with this name or key already exists.'
      );
    }

    throw new Error(error.message);
  }

  refreshLookupPaths(categoryKey);
  revalidatePath('/admin/lookups/categories');

  redirect(
    `/admin/lookups/categories?created=1`
  );
}

export async function updateLookupCategory(
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const id = text(formData, 'id');

  const originalCategoryKey = text(
    formData,
    'original_category_key'
  );

  const name = text(formData, 'name');

  const requestedCategoryKey = text(
    formData,
    'category_key'
  );

  if (!id) {
    throw new Error('Missing category ID.');
  }

  if (!originalCategoryKey) {
    throw new Error(
      'Missing original category key.'
    );
  }

  if (!name) {
    throw new Error('Category name is required.');
  }

  const categoryKey = normalizeStoredValue(
    requestedCategoryKey || name
  );

  if (!categoryKey) {
    throw new Error(
      'The category key could not be generated.'
    );
  }

  const { data: existingCategory, error: fetchError } =
    await supabase
      .from('lookup_categories')
      .select(`
        id,
        category_key,
        name,
        is_active
      `)
      .eq('id', id)
      .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!existingCategory) {
    throw new Error(
      'Lookup category not found.'
    );
  }

  if (
    existingCategory.category_key !==
    originalCategoryKey
  ) {
    throw new Error(
      'The category key no longer matches the stored category.'
    );
  }

  const categoryKeyChanged =
    categoryKey !== originalCategoryKey;

  if (categoryKeyChanged) {
    const { count, error: countError } =
      await supabase
        .from('lookup_values')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq(
          'category_key',
          originalCategoryKey
        );

    if (countError) {
      throw new Error(countError.message);
    }

    if ((count || 0) > 0) {
      throw new Error(
        'This category key cannot be changed because lookup values already use it. Create a new category or remove the connected values first.'
      );
    }
  }

  const { data: conflictingKey, error: keyError } =
    await supabase
      .from('lookup_categories')
      .select('id')
      .eq('category_key', categoryKey)
      .neq('id', id)
      .limit(1)
      .maybeSingle();

  if (keyError) {
    throw new Error(keyError.message);
  }

  if (conflictingKey) {
    throw new Error(
      `The category key "${categoryKey}" already exists.`
    );
  }

  const { data: conflictingName, error: nameError } =
    await supabase
      .from('lookup_categories')
      .select('id')
      .ilike('name', name)
      .neq('id', id)
      .limit(1)
      .maybeSingle();

  if (nameError) {
    throw new Error(nameError.message);
  }

  if (conflictingName) {
    throw new Error(
      `A category named "${name}" already exists.`
    );
  }

  const { error } = await supabase
    .from('lookup_categories')
    .update({
      category_key: categoryKey,
      name,
      description:
        nullableText(formData, 'description'),
      is_active: bool(formData, 'is_active'),
      sort_order: intValue(
        formData,
        'sort_order',
        100
      ),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq(
      'category_key',
      originalCategoryKey
    );

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'A lookup category with this name or key already exists.'
      );
    }

    throw new Error(error.message);
  }

  refreshLookupPaths(categoryKey);
  revalidatePath('/admin/lookups/categories');

  redirect(
    `/admin/lookups/categories?updated=1`
  );
}

export async function toggleLookupCategory(
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const id = text(formData, 'id');

  const categoryKey = text(
    formData,
    'category_key'
  );

  if (!id) {
    throw new Error('Missing category ID.');
  }

  if (!categoryKey) {
    throw new Error(
      'Missing category key.'
    );
  }

  const { data: category, error: fetchError } =
    await supabase
      .from('lookup_categories')
      .select(`
        id,
        category_key,
        is_active
      `)
      .eq('id', id)
      .eq('category_key', categoryKey)
      .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!category) {
    throw new Error(
      'Lookup category not found.'
    );
  }

  const { error } = await supabase
    .from('lookup_categories')
    .update({
      is_active: !category.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('category_key', categoryKey);

  if (error) {
    throw new Error(error.message);
  }

  refreshLookupPaths(categoryKey);
  revalidatePath('/admin/lookups/categories');

  redirect(
    `/admin/lookups/categories?toggled=1`
  );
}

function escapePostgrestValue(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(',', '\\,')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

export async function duplicateLookupValue(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const id = text(formData, 'id');
  const categoryKey = text(formData, 'category_key');

  if (!id) {
    throw new Error('Missing lookup value ID.');
  }

  if (!categoryKey) {
    throw new Error('Missing lookup category.');
  }

  await requireCategory(supabase, categoryKey);

  const { data: sourceValue, error: sourceError } =
    await supabase
      .from('lookup_values')
      .select(`
        id,
        category_key,
        value,
        display_name,
        description,
        icon,
        color,
        sort_order
      `)
      .eq('id', id)
      .eq('category_key', categoryKey)
      .maybeSingle();

  if (sourceError) {
    throw new Error(sourceError.message);
  }

  if (!sourceValue) {
    throw new Error('Lookup value not found.');
  }

  const duplicateValue = await createAvailableStoredValue({
    supabase,
    categoryKey,
    baseValue: `${sourceValue.value}_copy`,
  });

  const duplicateDisplayName =
    await createAvailableDisplayName({
      supabase,
      categoryKey,
      baseName: `${sourceValue.display_name} Copy`,
    });

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('lookup_values')
    .insert({
      category_key: categoryKey,
      value: duplicateValue,
      display_name: duplicateDisplayName,
      description: sourceValue.description,
      icon: sourceValue.icon,
      color: sourceValue.color,
      sort_order:
        Number(sourceValue.sort_order || 100) + 1,

      // Duplicates begin disabled so admins can review them.
      is_active: false,
      archived_at: null,

      created_at: nowIso,
      updated_at: nowIso,
      created_by: user.id,
      updated_by: user.id,
    });

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'Unable to generate a unique duplicate value.'
      );
    }

    throw new Error(error.message);
  }

  refreshLookupPaths(categoryKey);

  redirect(
    `/admin/lookups?category=${encodeURIComponent(
      categoryKey
    )}&duplicated=1`
  );
}

export async function archiveLookupValue(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const id = text(formData, 'id');
  const categoryKey = text(formData, 'category_key');

  if (!id) {
    throw new Error('Missing lookup value ID.');
  }

  if (!categoryKey) {
    throw new Error('Missing lookup category.');
  }

  await requireCategory(supabase, categoryKey);

  const { data: existing, error: existingError } =
    await supabase
      .from('lookup_values')
      .select(`
        id,
        category_key,
        archived_at
      `)
      .eq('id', id)
      .eq('category_key', categoryKey)
      .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existing) {
    throw new Error('Lookup value not found.');
  }

  if (existing.archived_at) {
    throw new Error('This lookup value is already archived.');
  }

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('lookup_values')
    .update({
      is_active: false,
      archived_at: nowIso,
      updated_at: nowIso,
      updated_by: user.id,
    })
    .eq('id', id)
    .eq('category_key', categoryKey);

  if (error) {
    throw new Error(error.message);
  }

  refreshLookupPaths(categoryKey);

  redirect(
    `/admin/lookups?category=${encodeURIComponent(
      categoryKey
    )}&archived=1`
  );
}

export async function restoreLookupValue(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const id = text(formData, 'id');
  const categoryKey = text(formData, 'category_key');

  if (!id) {
    throw new Error('Missing lookup value ID.');
  }

  if (!categoryKey) {
    throw new Error('Missing lookup category.');
  }

  await requireCategory(supabase, categoryKey);

  const { data: existing, error: existingError } =
    await supabase
      .from('lookup_values')
      .select(`
        id,
        category_key,
        archived_at
      `)
      .eq('id', id)
      .eq('category_key', categoryKey)
      .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existing) {
    throw new Error('Lookup value not found.');
  }

  if (!existing.archived_at) {
    throw new Error('This lookup value is not archived.');
  }

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('lookup_values')
    .update({
      archived_at: null,

      // Restore disabled so the admin can review it first.
      is_active: false,

      updated_at: nowIso,
      updated_by: user.id,
    })
    .eq('id', id)
    .eq('category_key', categoryKey);

  if (error) {
    throw new Error(error.message);
  }

  refreshLookupPaths(categoryKey);

  redirect(
    `/admin/lookups?category=${encodeURIComponent(
      categoryKey
    )}&restored=1`
  );
}

async function createAvailableStoredValue({
  supabase,
  categoryKey,
  baseValue,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  categoryKey: string;
  baseValue: string;
}) {
  const normalizedBase =
    normalizeStoredValue(baseValue) || 'lookup_copy';

  for (let index = 0; index < 100; index += 1) {
    const candidate =
      index === 0
        ? normalizedBase
        : `${normalizedBase}_${index + 1}`;

    const { data, error } = await supabase
      .from('lookup_values')
      .select('id')
      .eq('category_key', categoryKey)
      .eq('value', candidate)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return candidate;
    }
  }

  throw new Error(
    'Unable to generate a unique stored value for the duplicate.'
  );
}

async function createAvailableDisplayName({
  supabase,
  categoryKey,
  baseName,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  categoryKey: string;
  baseName: string;
}) {
  for (let index = 0; index < 100; index += 1) {
    const candidate =
      index === 0
        ? baseName
        : `${baseName} ${index + 1}`;

    const { data, error } = await supabase
      .from('lookup_values')
      .select('id')
      .eq('category_key', categoryKey)
      .ilike('display_name', candidate)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return candidate;
    }
  }

  throw new Error(
    'Unable to generate a unique display name for the duplicate.'
  );
}