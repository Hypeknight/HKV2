import Link from 'next/link';
export function adminCount(value: number | null) {
  return value === null ? 'Unavailable' : new Intl.NumberFormat('en-US').format(value);
}
export default function AdminMeasurement({ label, value, detail, href }: { label: string; value: number | null; detail: string; href?: string }) {
  const content = <><p className="hk-admin-label">{label}</p><p className="hk-admin-value">{adminCount(value)}</p><p className="hk-admin-detail">{detail}</p>{href ? <span className="hk-admin-link">Open workspace →</span> : null}</>;
  return href ? <Link className="hk-admin-measure" href={href}>{content}</Link> : <article className="hk-admin-measure">{content}</article>;
}
