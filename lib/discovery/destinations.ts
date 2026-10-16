function safeSegment(value: unknown): string | null {
  return typeof value === 'string' && /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i.test(value) ? value : null;
}
export function nativeEventDestination(slug: unknown): string | null {
  const segment = safeSegment(slug);
  return segment ? '/events/' + segment : null;
}
/** Keep supplemental detail/provenance and existing view/click attribution. */
export function externalEventDestination(id: unknown): string | null {
  const segment = safeSegment(id);
  return segment ? '/events/external/' + segment : null;
}
/** No script/data/relative URLs, credentials or control-character obfuscation. */
export function officialProviderDestination(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || /[\u0000-\u001f\u007f]/.test(candidate)) continue;
    const value = candidate.trim();
    if (!/^https?:\/\//i.test(value) || value.includes('\\')) continue;
    try {
      const url = new URL(value);
      if (['http:', 'https:'].includes(url.protocol) && url.hostname && !url.username && !url.password) return url.href;
    } catch { /* Try the next provider field. */ }
  }
  return null;
}
