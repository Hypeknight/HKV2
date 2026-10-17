const DEFAULT_RETURN = '/dashboard';
const BASE = 'https://return.invalid';

/** Navigation intent only; destination pages still enforce authorization. */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/')) return DEFAULT_RETURN;
  if (/%(?![0-9a-f]{2})/i.test(value) || /[\u0000-\u001f\u007f]/.test(value)) return DEFAULT_RETURN;
  try {
    // Decode path evidence only: a valid search value such as 100%25 is not a path.
    let decoded = value.split(/[?#]/, 1)[0];
    for (let i = 0; i < 5; i++) {
      const pathOnly = decoded.split(/[?#]/, 1)[0];
      if (/^\s*\/\//.test(pathOnly) || /[\\\u0000-\u0020\u007f]/.test(pathOnly) || /[\u0000-\u001f\u007f]/.test(decoded)) return DEFAULT_RETURN;
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
      if (i === 4) return DEFAULT_RETURN;
    }
    const parsed = new URL(value, BASE);
    const decodedPath = new URL(decoded, BASE);
    if (parsed.origin !== BASE || decodedPath.origin !== BASE) return DEFAULT_RETURN;
    if ([parsed.pathname, decodedPath.pathname].some(path => /^\/(?:auth|api)(?:\/|$)/i.test(path))) return DEFAULT_RETURN;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch { return DEFAULT_RETURN; }
}

export function authHref(flow: 'login' | 'sign-up', destination: unknown) {
  return '/auth/' + flow + '?' + new URLSearchParams({ next: safeReturnPath(destination) });
}
