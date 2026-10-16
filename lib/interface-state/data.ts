/** Presentation availability only; authorization, eligibility and metric definitions stay at their existing boundaries. */
export type DataResult<T> = { status: 'success'; data: T } | { status: 'unavailable'; data: null };
export const isRecord = (value: unknown): value is Record<string, any> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
export const hasIdentity = (value: unknown) => isRecord(value) && typeof value.id === 'string' && Boolean(value.id);

export const isEventRecord = (value: unknown) => hasIdentity(value) && isRecord(value) && typeof value.name === 'string' && typeof value.status === 'string';

export async function readValue<T>(operation: string, request: () => PromiseLike<unknown>, valid: (value: unknown) => boolean): Promise<DataResult<T>> {
  try {
    const result = await request();
    if (!valid(result)) throw new Error('invalid-result');
    return { status: 'success', data: result as T };
  } catch {
    // Never log query text, parameters, identities, returned rows or raw errors.
    console.error('[interface-data]', { operation, kind: 'unavailable' });
    return { status: 'unavailable', data: null };
  }
}

export async function readRows<T = Record<string, any>>(operation: string, request: () => PromiseLike<unknown>, validRow: (value: unknown) => boolean = isRecord): Promise<DataResult<T[]>> {
  const result = await readValue<{ data: T[] }>(operation, request, value => isRecord(value) && !value.error && Array.isArray(value.data) && value.data.every(validRow));
  return result.status === 'success' ? { status: 'success', data: result.data.data } : result;
}

export function combinedState(results: DataResult<unknown>[]): 'success' | 'partial' | 'unavailable' {
  const successes = results.filter(result => result.status === 'success').length;
  return successes === results.length ? 'success' : successes ? 'partial' : 'unavailable';
}
export function countLabel(complete: boolean, count: number): number | 'Unavailable' {
  return complete && Number.isSafeInteger(count) && count >= 0 ? count : 'Unavailable';
}
