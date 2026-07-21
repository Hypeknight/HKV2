export type LinkdNRoomStatus =
  | 'draft'
  | 'scheduled'
  | 'setup_required'
  | 'preparing'
  | 'waiting_for_readiness'
  | 'connection_eligible'
  | 'inviting'
  | 'ready'
  | 'live'
  | 'paused'
  | 'ended'
  | 'cancelled'
  | 'archived';

export type LinkdNParticipationStatus =
  | 'candidate'
  | 'invited'
  | 'accepted'
  | 'setup_pending'
  | 'testing'
  | 'pulse_building'
  | 'connection_ready'
  | 'waiting'
  | 'connected'
  | 'participating'
  | 'disconnected'
  | 'completed'
  | 'declined'
  | 'removed';

export type LinkdNConnectionStatus =
  | 'reserved'
  | 'waiting'
  | 'testing'
  | 'ready'
  | 'live'
  | 'paused'
  | 'reconnecting'
  | 'ended'
  | 'failed'
  | 'cancelled';

export type LinkdNReadiness = {
  commercialReady: boolean;
  technicalReady: boolean;
  audienceReady: boolean;
  checkedInCount: number;
  activeUserCount: number;
  uniqueResponderCount: number;
  responseRate: number;
  responseVelocity: number;
  recentActivityScore: number;
  pulseScore: number;
};

export type LinkdNTierLimits = {
  minimumSetupDays: number;
  minimumPulseScore: number;
  retentionPulseScore: number;
  maximumConnectionsPerNight: number | null;
  maximumConnectionMinutes: number | null;
  maximumRoomMinutes: number | null;
  maximumConnectedVenues: number;
  wholeNightAllowed: boolean;
  audienceVotingAllowed: boolean;
  multiRoundAllowed: boolean;
  judgesAllowed: boolean;
  recordingAllowed: boolean;
  requiresConnectionTest: boolean;
  requiresStaffOperator: boolean;
  requiresAdminApproval: boolean;
};