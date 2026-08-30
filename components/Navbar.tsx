'use client';

import HypeKnightNavigation from '@/components/navigation/HypeKnightNavigation';

type NavbarUser = {
  id: string;
  email: string;
} | null;

// Compatibility wrapper: legacy imports can continue using <Navbar /> while the
// V3 public/user navigation is developed in a dedicated component.
export default function Navbar({
  initialUser,
  initialRole,
}: {
  initialUser: NavbarUser;
  initialRole: string | null;
}) {
  return (
    <HypeKnightNavigation
      initialUser={initialUser}
      initialRole={initialRole}
    />
  );
}
