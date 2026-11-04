import { requireAdministrator, getAdminOperationCounts } from '@/lib/admin/control-center';
import AdminOverview from '@/components/admin/AdminOverview';
export default async function AdminPage() {
  const client = await requireAdministrator();
  const measures = await getAdminOperationCounts(client);
  return <AdminOverview measures={measures} />;
}
