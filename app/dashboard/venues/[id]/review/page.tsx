import { redirect } from 'next/navigation';
import { requireVenueManagement } from '@/lib/venues/require-management';

export default async function LegacyVenueReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireVenueManagement(id);
  redirect('/dashboard/venues/' + id + '/profile');
}
