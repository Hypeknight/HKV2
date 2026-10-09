// Opaque bearer identity stays in an HttpOnly cookie, never in response forms.
export const PRESENCE_PARTICIPANT_COOKIE = 'hk_presence_participant';
export function parseParticipantToken(value?: string | null) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value : null;
}
