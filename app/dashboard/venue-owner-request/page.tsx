import { redirect } from 'next/navigation';
export default function LegacyVenueOwnerRequestPage() {
  redirect('/dashboard/venues/claims');
}
