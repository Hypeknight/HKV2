'use client';

export default function ReceiptActions({ stripeReceiptUrl, invoicePdf }: { stripeReceiptUrl?:string|null; invoicePdf?:string|null }) {
  return <div className="flex flex-wrap gap-3 print:hidden"><button type="button" onClick={() => window.print()} className="rounded-2xl bg-white px-5 py-3 font-black text-black">Print / Save HypeKnight Receipt</button>{stripeReceiptUrl?<a href={stripeReceiptUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 px-5 py-3 font-bold text-white">Stripe Receipt ↗</a>:null}{invoicePdf?<a href={invoicePdf} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 px-5 py-3 font-bold text-white">Download Stripe Invoice PDF</a>:null}</div>;
}
