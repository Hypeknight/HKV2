import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'UX-C1 responsive review', robots: { index:false, follow:false } };
export default async function Review({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const params=await searchParams;
 const sizes={compact:320,small:360,mobile:390,tablet:768,desktop:1280};
 const size=typeof params.size==='string' && Object.hasOwn(sizes, params.size) ? params.size as keyof typeof sizes : 'desktop';
 const homepage=params.view==='homepage';
 const demo=!homepage && typeof params.demo==='string' && ['empty','loading','unavailable','partial','insufficient'].includes(params.demo) ? params.demo : '';
 const context=new URLSearchParams();
 for(const key of ['city','state'])if(typeof params[key]==='string')context.set(key,params[key] as string);
 if(demo)context.set('demo',demo);
 const src=(homepage?'/':'/preview/simply-complex')+(context.size?'?'+context:'');
 return <section><h1 className="text-2xl font-bold">Simply Complex · Responsive review</h1><p className="mt-3 text-sm text-white/70">The real preview in a fixed-width viewport. Resize options do not change production or device settings.</p>
 <nav aria-label="Review surface" className="my-3 flex gap-6 text-sm text-accent"><Link href="?view=homepage&amp;size=mobile">Actual homepage</Link><Link href="?size=mobile">Design sandbox</Link></nav>
 <nav aria-label="Review viewport" className="my-5 flex flex-wrap gap-5">{Object.entries(sizes).map(([label,width])=><Link key={label} aria-current={label===size?'page':undefined} href={'?'+new URLSearchParams({...Object.fromEntries(context),...(homepage?{view:'homepage'}:{}),size:label})} className="min-h-11 py-3 text-accent">{label} · {width}px</Link>)}</nav>
 <div style={{overflowX:'auto',padding:8,background:'#24242a'}}><iframe title={'Homepage preview · '+size} src={src} style={{display:'block',width:sizes[size],height:1100,maxWidth:'none',border:0,margin:'auto',background:'#0c0c0f'}} /></div>
 <p className="mt-4 text-sm text-white/70">Review with keyboard and scroll inside the frame. State examples are also available at the bottom of the preview.</p><Link className="inline-block py-4 text-accent" href={src}>Open full preview ↗</Link></section>;
}
