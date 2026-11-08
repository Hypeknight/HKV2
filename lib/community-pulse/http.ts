export const COMMUNITY_PULSE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Vary': 'Cookie',
  'X-Content-Type-Options': 'nosniff',
};

export function sameOriginJson(request: Request) {
  // Render can present an internal Next origin. Compare against the configured
  // public site, never against an arbitrary client-supplied forwarded host.
  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV === 'production' ? '' : request.url);
    const expected = new URL(site);
    const origin = request.headers.get('origin');
    const localReviewOrigin = process.env.NODE_ENV === 'development' &&
      process.env.HYPEKNIGHT_COMMUNITY_PULSE_LOCAL_REVIEW === '1' &&
      /^[a-z0-9-]+$/.test(process.env.CODESPACE_NAME || '') &&
      process.env.NEXT_PUBLIC_SITE_URL === `https://${process.env.CODESPACE_NAME}-3234.app.github.dev` &&
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'http://127.0.0.1:55471' &&
      origin === 'http://localhost:3234' &&
      request.headers.get('x-forwarded-host') === expected.host &&
      request.headers.get('sec-fetch-site') === 'same-origin';
    return ['https:', 'http:'].includes(expected.protocol) && (origin === expected.origin || localReviewOrigin) &&
      (!request.headers.has('sec-fetch-site') || request.headers.get('sec-fetch-site') === 'same-origin') &&
      /^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '');
  } catch { return false; }
}

/** Read the actual stream so a missing or false Content-Length cannot bypass the limit. */
export async function readCommunityPulseBody(request: Request): Promise<unknown> {
  if (!request.body) throw new Error('empty_body');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) throw new Error('body_too_large');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) {
    body.set(chunk, position);
    position += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
}
