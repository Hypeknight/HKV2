'use server';

import { revalidatePath } from 'next/cache';
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
  return supabase;
}

/** Create a new canonical metro/market and its primary city area. */
export async function createMarket(formData: FormData) {
  const supabase = await requireAdmin();
  const name = String(formData.get('name') || '').trim();
  const city = String(formData.get('primary_city') || '').trim();
  const state = String(formData.get('primary_state') || '').trim();
  const status = String(formData.get('status') || 'observed').trim();

  if (!name || !city || !state) throw new Error('Market name, primary city, and state are required.');

  const { error } = await supabase.rpc('create_hypeknight_market', {
    p_name: name,
    p_primary_city: city,
    p_primary_state: state,
    p_status: status,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/admin/intelligence/markets');
}

export async function setMarketTimezone(formData: FormData) {
  const supabase = await requireAdmin();
  const marketKey = String(formData.get('market_key') || '').trim();
  const timezone = String(formData.get('timezone') || '').trim();

  if (!marketKey) {
    throw new Error('Market is required.');
  }

  const { error } = await supabase.rpc('set_hypeknight_market_timezone', {
    p_market_key: marketKey,
    p_timezone: timezone,
  });

  if (error) throw new Error(error.message);

  revalidatePath('/admin/intelligence/markets');
  revalidatePath('/admin/intelligence');
}

/** Add a new municipality to a metro, or move an existing municipality into it. */
export async function linkMarketArea(formData: FormData) {
  const supabase = await requireAdmin();
  const marketKey = String(formData.get('market_key') || '').trim();
  const city = String(formData.get('city') || '').trim();
  const state = String(formData.get('state') || '').trim();
  const areaType = String(formData.get('area_type') || 'city').trim();

  if (!marketKey || !city || !state) throw new Error('Market, city, and state are required.');

  const { error } = await supabase.rpc('link_hypeknight_market_area', {
    p_market_key: marketKey,
    p_city: city,
    p_state: state,
    p_area_type: areaType,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/admin/intelligence/markets');
  revalidatePath('/admin/intelligence');
  revalidatePath('/events');
}

/** Override a single venue/event when its market differs from the city-wide mapping. */
export async function overrideRecordMarket(formData: FormData) {
  const supabase = await requireAdmin();
  const recordType = String(formData.get('record_type') || '').trim();
  const recordId = String(formData.get('record_id') || '').trim();
  const marketKey = String(formData.get('market_key') || '').trim();

  if (!recordId || !marketKey || !['event', 'venue'].includes(recordType)) {
    throw new Error('Record type, record, and market are required.');
  }

  const { error } = await supabase.rpc('override_hypeknight_record_market', {
    p_record_type: recordType,
    p_record_id: recordId,
    p_market_key: marketKey,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/admin/intelligence/markets');
  revalidatePath('/admin/intelligence');
}

/** Create or update Featured inventory for one market/date. */
export async function saveFeaturedInventory(formData: FormData) {
  const supabase = await requireAdmin();

  const marketId = String(formData.get('market_id') || '').trim();
  const featureDate = String(formData.get('feature_date') || '').trim();
  const capacity = Number(formData.get('capacity'));
  const unitPrice = Number(formData.get('unit_price'));

  if (!marketId || !featureDate) {
    throw new Error('Market and Featured date are required.');
  }

  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new Error('Featured capacity must be at least 1.');
  }

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error('Featured price must be zero or greater.');
  }

  const { error } = await supabase
    .from('featured_inventory')
    .upsert(
      {
        market_id: marketId,
        feature_date: featureDate,
        capacity,
        unit_price: unitPrice,
        enabled: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'market_id,feature_date',
      }
    );

  if (error) throw new Error(error.message);

  revalidatePath('/admin/intelligence/markets');
}

/** Enable or disable an existing Featured inventory date without deleting history. */
export async function setFeaturedInventoryEnabled(formData: FormData) {
  const supabase = await requireAdmin();

  const inventoryId = String(formData.get('inventory_id') || '').trim();
  const enabled = String(formData.get('enabled') || '').trim() === 'true';

  if (!inventoryId) {
    throw new Error('Featured inventory is required.');
  }

  const { error } = await supabase
    .from('featured_inventory')
    .update({
      enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inventoryId);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/intelligence/markets');
}
