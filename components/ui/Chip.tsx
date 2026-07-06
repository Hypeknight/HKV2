import { ReactNode } from 'react';

export default function Chip({ children }: { children: ReactNode }) {
  if (!children) return null;

  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/65">
      {children}
    </span>
  );
}