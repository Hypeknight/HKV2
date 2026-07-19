export type PatronPulseResultsVisibility =
  | 'hidden'
  | 'live'
  | 'after_response'
  | 'after_close';

export type EffectivePatronPulseSettings = {
  enabled: boolean;
  requireCheckin: boolean;
  allowAnonymousView: boolean;
  allowGuestResults: boolean;
  announcementsEnabled: boolean;
  djRequestsEnabled: boolean;
  challengesEnabled: boolean;
  rewardsEnabled: boolean;
  maxOpenPulses: number;
  defaultDurationMinutes: number;
  maxResponseLength: number;
  defaultResultsVisibility: PatronPulseResultsVisibility;
  ownerCanOpenSession: boolean;
  ownerCanCreatePulses: boolean;
  ownerCanPublishAnnouncements: boolean;
  adminApprovalRequired: boolean;
  publicLabel: string;
  publicDescription: string | null;
};