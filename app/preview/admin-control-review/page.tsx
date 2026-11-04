import { notFound } from 'next/navigation';
import AdminControlShell from '@/components/admin/AdminControlShell';
import AdminOverview from '@/components/admin/AdminOverview';
import { OPERATION_MEASURES } from '@/lib/admin/control-center';
import '../../admin/admin.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin design review', robots: { index: false, follow: false } };
export default async function AdminReview({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  if (process.env.HYPEKNIGHT_HOMEPAGE_PREVIEW !== '1') notFound();
  const params = await searchParams;
  const width = ['320','360','390','768'].includes(params.width || '') ? params.width : '1280';
  if (params.frame !== '1') return <section><h1>Admin Control Center · Design review</h1><p className="my-4 text-white/70">Local presentation fixture only. No production measurements, user records or administrative access are loaded.</p><nav className="my-4 flex flex-wrap gap-5">{['320','360','390','768','1280'].map(size => <a key={size} href={'?width='+size}>{size}px</a>)}</nav><div style={{overflowX:'auto'}}><iframe title="Admin design fixture" src="?frame=1" style={{width:Number(width),height:1200,border:0,maxWidth:'none'}} /></div></section>;
  const measures = OPERATION_MEASURES.map(item => ({ ...item, value: null }));
  return <><p role="note" className="my-4 border border-yellow-200/30 p-3 text-yellow-100">DESIGN FIXTURE · All measurements intentionally unavailable. This is not an authenticated admin session.</p><AdminControlShell displayName="Design review"><AdminOverview measures={measures} /></AdminControlShell></>;
}
