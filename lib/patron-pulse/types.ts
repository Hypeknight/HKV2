export type PatronPulseSessionStatus =
  | 'scheduled'
  | 'open'
  | 'paused'
  | 'closed'
  | 'cancelled';

export type PatronPulseType =
  | 'poll'
  | 'announcement'
  | 'rating'
  | 'yes_no'
  | 'dj_request'
  | 'challenge'
  | 'feedback';

export type PatronPulseStatus =
  | 'draft'
  | 'scheduled'
  | 'open'
  | 'closed'
  | 'cancelled';

export type PatronPulseOption = {
  id: string;
  pulseId: string;
  label: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
};

export type PatronPulse = {
  id: string;
  sessionId: string;
  eventId: string;
  pulseType: PatronPulseType;
  title: string;
  prompt: string | null;
  description: string | null;
  status: PatronPulseStatus;
  resultsVisibility:
    | 'hidden'
    | 'live'
    | 'after_response'
    | 'after_close';
  allowMultipleResponses: boolean;
  opensAt: string | null;
  closesAt: string | null;
  options: PatronPulseOption[];
};

export type PatronPulseSession = {
  id: string;
  eventId: string;
  activationId: string | null;
  title: string;
  status: PatronPulseSessionStatus;
  opensAt: string | null;
  closesAt: string | null;
  checkInEnabled: boolean;
  announcementsEnabled: boolean;
  responsesVisible: boolean;
};