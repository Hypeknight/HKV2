import type { ReactNode } from 'react';
import UserExperienceShell from '@/components/user/UserExperienceShell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <UserExperienceShell>{children}</UserExperienceShell>;
}
