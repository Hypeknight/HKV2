import type { EventStatus } from './workflow';

export function canEditEvent(input: {
  ownerId: string;
  currentUserId: string;
  status: EventStatus;
}) {
  if (input.ownerId !== input.currentUserId) return false;

  return ['draft', 'building', 'rejected'].includes(input.status);
}

export function canSubmitEvent(status: EventStatus) {
  return ['draft', 'building', 'rejected'].includes(status);
}

export function canRequestRemoval(status: EventStatus) {
  return ['scheduled', 'live'].includes(status);
}