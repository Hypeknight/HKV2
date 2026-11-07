import Link from 'next/link';
import AdminMeasurement from './AdminMeasurement';
import type { getAdminOperationCounts } from '@/lib/admin/control-center';
export default function AdminOverview({ measures }: { measures: Awaited<ReturnType<typeof getAdminOperationCounts>> }) {
  const partial = measures.some(item => item.value === null);
  return <div className="hk-admin-page">
    <header className="hk-admin-heading"><p className="hk-admin-eyebrow">HypeKnight · Control Center</p><h1>Clear signals. Considered decisions.</h1><p>Review the work that needs a decision, then move into the right workspace. Publication is free; optional promotion and paid interpretation stay separate.</p><div className="hk-admin-actions"><Link href="/admin/events">Manage events →</Link><Link href="/admin/signals">Inspect signal evidence →</Link></div></header>
    {partial ? <p role="status" className="hk-admin-notice">Some measurements are unavailable. Successful sections remain visible. <a href="/admin">Retry overview</a></p> : null}
    <section aria-labelledby="admin-queues"><h2 id="admin-queues">Decision queues</h2><p className="hk-admin-detail">Separate record counts, not a combined workload score. A zero means the count query succeeded.</p><div className="hk-admin-grid">{measures.slice(0,3).map(item => <AdminMeasurement key={item.key} label={item.label} detail={item.detail} value={item.value} href={item.href} />)}</div></section>
    <section aria-labelledby="admin-inventory"><h2 id="admin-inventory">Operational records</h2><div className="hk-admin-grid">{measures.slice(3,6).map(item => <AdminMeasurement key={item.key} label={item.label} detail={item.detail} value={item.value} href={item.href} />)}</div></section>
    <section aria-labelledby="admin-lifecycle"><h2 id="admin-lifecycle">Current lifecycle states</h2><p className="hk-admin-detail">Status counts do not establish public visibility, Discovery eligibility, delivery or attendance.</p><div className="hk-admin-grid">{measures.slice(6).map(item => <AdminMeasurement key={item.key} label={item.label} detail={item.detail} value={item.value} href={item.href} />)}</div></section>
    <section className="hk-admin-panel"><p className="hk-admin-eyebrow">Evidence discipline</p><h2>Fact → Indicator → Comparison → Inference → Recommendation</h2><p>Canonical signals record actions. Current saves and Going belong to operational event reporting. Pulse results use the authorized effective-response snapshot, not response-action totals.</p><div className="hk-admin-actions"><Link href="/admin/patron-pulse">Patron Pulse operations →</Link><Link href="/admin/activity">Administrative audit trail →</Link><Link href="/admin/payments">Payment and refund operations →</Link></div></section>
  </div>;
}
