/**
 * Anonymous browser-session identifier used to connect a sequence of public
 * actions without requiring login. This is NOT a person identity and should
 * not contain PII. It persists in localStorage so repeat public interactions
 * can be recognized as the same browser until storage is cleared.
 */
const STORAGE_KEY = 'hk_anon_session_v1';

export function getAnonymousSessionId() {
  if (typeof window === 'undefined') return null;

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const value =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    window.localStorage.setItem(STORAGE_KEY, value);
    return value;
  } catch {
    // Browsers can block localStorage in privacy modes. Signal capture should
    // still work; it will simply be anonymous without cross-request continuity.
    return null;
  }
}
