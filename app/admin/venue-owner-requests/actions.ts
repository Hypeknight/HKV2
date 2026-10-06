'use server';
import { requireClaimUser } from '@/lib/venues/claims';
export async function approveVenueOwnerRequest(_formData: FormData) {
  await requireClaimUser(true);
  throw new Error('Legacy global-role requests are retired. Review a claim against an existing venue.');
}
export async function denyVenueOwnerRequest(_formData: FormData) {
  await requireClaimUser(true);
  throw new Error('Legacy global-role requests are retained as history. Use Venue Claims for new reviews.');
}
