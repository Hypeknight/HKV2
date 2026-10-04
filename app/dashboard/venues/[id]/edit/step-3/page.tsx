import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VenueStep3Page({ params }: Props) {
  const { id } = await params;

  // Legacy venue plan/payment configuration is no longer part of Venue Core.
  // Keep this route as a compatibility redirect for old bookmarks and links.
  redirect(`/dashboard/venues/${id}/edit/hours`);
}
