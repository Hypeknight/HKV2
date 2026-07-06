import { ReactNode } from 'react';

export default function Panel({
  title,
  children,
  eyebrow,
}: {
  title: string;
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:rounded-[2.5rem] sm:p-8">
      {eyebrow ? (
        <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
          {eyebrow}
        </p>
      ) : null}

      <h2 className={eyebrow ? 'mt-3 text-2xl font-bold text-white' : 'text-2xl font-bold text-white'}>
        {title}
      </h2>

      <div className="mt-6">{children}</div>
    </section>
  );
}