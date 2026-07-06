import Link from 'next/link';
import { ReactNode } from 'react';

export default function ButtonLink({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  const classes = {
    primary: 'bg-accent text-black hover:opacity-90',
    secondary: 'border border-white/10 bg-white/5 text-white hover:border-accent/40',
    danger: 'border border-red-500/20 bg-red-500/10 text-red-200 hover:border-red-500/40',
    ghost: 'text-white/60 hover:text-accent',
  };

  return (
    <Link
      href={href}
      className={`inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-center font-semibold transition sm:w-auto ${classes[variant]}`}
    >
      {children}
    </Link>
  );
}