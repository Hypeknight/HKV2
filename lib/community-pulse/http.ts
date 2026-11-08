export const COMMUNITY_PULSE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Vary': 'Cookie',
  'X-Content-Type-Options': 'nosniff',
};

export function sameOriginJson(request: Request) {
  const origin = request.headers.get('origin');
  return origin === new URL(request.url).origin &&
    (!request.headers.has('sec-fetch-site') || request.headers.get('sec-fetch-site') === 'same-origin') &&
    /^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '');
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
