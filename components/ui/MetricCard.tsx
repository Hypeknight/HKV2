import Link from 'next/link';
import { ReactNode } from 'react';

export default function MetricCard({
  label,
  value,
  text,
  href,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  text?: string;
  href?: string;
  accent?: boolean;
}) {
  const className = `rounded-[1.75rem] border p-5 transition sm:rounded-[2rem] sm:p-6 ${
    accent
      ? 'border-accent/30 bg-accent/10'
      : 'border-white/10 bg-white/5'
  }`;

  const content = (
    <>
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/45 sm:text-xs">
        {label}
      </p>
      <div className="mt-3 text-3xl font-black text-white sm:text-4xl">
        {value}
      </div>
      {text ? <p className="mt-2 text-xs text-white/60 sm:text-sm">{text}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${className} block hover:border-accent/40`}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}