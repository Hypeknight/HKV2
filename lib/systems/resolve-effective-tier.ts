import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EffectiveSystemCapability,
  EffectiveSystemTier,
  PlatformSystemSlug,
} from '@/lib/systems/types';

type ResolutionRow = {
  effective_tier_id: string | null;
  effective_tier_rank: number | null;
  entitlement_source:
    | 'venue'
    | 'event_purchase'
    | 'admin_grant'
    | 'none';
  venue_tier_id: string | null;
  venue_tier_rank: number | null;
  purchased_tier_id: string | null;
  purchased_tier_rank: number | null;
  purchase_qualified: boolean;
};

export async function resolveEffectiveSystemTier({
  supabase,
  eventId,
  systemSlug,
}: {
  supabase: SupabaseClient;
  eventId: string;
  systemSlug: PlatformSystemSlug;
}): Promise<EffectiveSystemTier> {
  const { data: system, error: systemError } =
    await supabase
      .from('platform_systems')
      .select('id, slug')
      .eq('slug', systemSlug)
      .single();

  if (systemError || !system) {
    throw new Error(
      systemError?.message ||
        `System not found: ${systemSlug}`
    );
  }

  const { data: rows, error: rpcError } =
    await supabase.rpc(
      'resolve_event_system_tier',
      {
        target_event_id: eventId,
        target_system_id: system.id,
      }
    );

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  const resolution =
    (rows?.[0] || null) as ResolutionRow | null;

  if (!resolution?.effective_tier_id) {
    return {
      eventId,
      systemId: system.id,
      systemSlug,
      effectiveTierId: null,
      effectiveTierSlug: null,
      effectiveTierName: null,
      effectiveTierRank: null,
      entitlementSource: 'none',
      venueTierId:
        resolution?.venue_tier_id || null,
      venueTierRank:
        resolution?.venue_tier_rank || null,
      purchasedTierId:
        resolution?.purchased_tier_id || null,
      purchasedTierRank:
        resolution?.purchased_tier_rank || null,
      purchaseQualified:
        resolution?.purchase_qualified || false,
      capabilities: [],
    };
  }

  const { data: tier, error: tierError } =
    await supabase
      .from('system_tiers')
      .select('id, slug, name, rank')
      .eq('id', resolution.effective_tier_id)
      .single();

  if (tierError || !tier) {
    throw new Error(
      tierError?.message ||
        'Effective system tier not found.'
    );
  }

  const { data: rowsWithCapabilities, error: capabilityError } =
    await supabase
      .from('system_tier_capabilities')
      .select(`
        limits,
        configuration_overrides,
        capability:system_capabilities(
          id,
          slug,
          name,
          description,
          category,
          public_label,
          requires_readiness
        )
      `)
      .eq('tier_id', tier.id)
      .eq('enabled', true);

  if (capabilityError) {
    throw new Error(capabilityError.message);
  }

  const capabilities: EffectiveSystemCapability[] =
    (rowsWithCapabilities || [])
      .map((row: any) => {
        const capability = Array.isArray(
          row.capability
        )
          ? row.capability[0]
          : row.capability;

        if (!capability) return null;

        return {
          id: capability.id,
          slug: capability.slug,
          name: capability.name,
          description: capability.description || null,
          category: capability.category,
          publicLabel: capability.public_label || null,
          requiresReadiness:
            capability.requires_readiness === true,
          limits:
            (row.limits || {}) as Record<string, unknown>,
          configuration:
            (row.configuration_overrides ||
              {}) as Record<string, unknown>,
        };
      })
      .filter(
        (
          capability
        ): capability is EffectiveSystemCapability =>
          Boolean(capability)
      );

  return {
    eventId,
    systemId: system.id,
    systemSlug,
    effectiveTierId: tier.id,
    effectiveTierSlug: tier.slug,
    effectiveTierName: tier.name,
    effectiveTierRank: tier.rank,
    entitlementSource:
      resolution.entitlement_source,
    venueTierId: resolution.venue_tier_id,
    venueTierRank: resolution.venue_tier_rank,
    purchasedTierId:
      resolution.purchased_tier_id,
    purchasedTierRank:
      resolution.purchased_tier_rank,
    purchaseQualified:
      resolution.purchase_qualified,
    capabilities,
  };
}

export async function resolveEventSystems({
  supabase,
  eventId,
}: {
  supabase: SupabaseClient;
  eventId: string;
}) {
  const [patronPulse, linkdn] =
    await Promise.all([
      resolveEffectiveSystemTier({
        supabase,
        eventId,
        systemSlug: 'patron-pulse',
      }),

      resolveEffectiveSystemTier({
        supabase,
        eventId,
        systemSlug: 'linkdn',
      }),
    ]);

  return {
    patronPulse,
    linkdn,
  };
}