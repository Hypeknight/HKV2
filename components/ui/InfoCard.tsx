import { ReactNode } from 'react';

export default function InfoCard({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value?: ReactNode;
  icon?: ReactNode;
  accent?: boolean;
}) {
  if (!value) return null;

  return (
    <div
      className={`rounded-3xl border p-5 transition-all ${
        accent
          ? 'border-accent/30 bg-accent/10'
          : 'border-white/10 bg-black/20'
      }`}
    >
      <div className="flex items-center gap-2">
        {icon ? <div className="text-lg">{icon}</div> : null}

        <p className="text-xs uppercase tracking-[0.25em] text-white/50">
          {label}
        </p>
      </div>

      <div className="mt-3 break-words text-white">{value}</div>
    </div>
  );
}