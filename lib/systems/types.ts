export type PlatformSystemSlug =
  | 'patron-pulse'
  | 'linkdn';

export type VenueRelationship =
  | 'venue_owned'
  | 'venue_produced'
  | 'outside_promoter'
  | 'outside_artist'
  | 'outside_dj'
  | 'outside_organizer'
  | 'co_produced';

export type EntitlementSource =
  | 'venue'
  | 'event_purchase'
  | 'admin_grant'
  | 'none';

export type EffectiveSystemCapability = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  publicLabel: string | null;
  requiresReadiness: boolean;
  limits: Record<string, unknown>;
  configuration: Record<string, unknown>;
};

export type EffectiveSystemTier = {
  eventId: string;
  systemId: string;
  systemSlug: PlatformSystemSlug;
  effectiveTierId: string | null;
  effectiveTierSlug: string | null;
  effectiveTierName: string | null;
  effectiveTierRank: number | null;
  entitlementSource: EntitlementSource;
  venueTierId: string | null;
  venueTierRank: number | null;
  purchasedTierId: string | null;
  purchasedTierRank: number | null;
  purchaseQualified: boolean;
  capabilities: EffectiveSystemCapability[];
};