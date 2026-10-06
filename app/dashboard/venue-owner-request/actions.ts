'use server';
import { redirect } from 'next/navigation';
export async function submitVenueOwnerRequest(_formData: FormData) {
  redirect('/dashboard/venues/claims');
}
