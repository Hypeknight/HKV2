import Link from 'next/link';

export default function SectionHeader({
  eyebrow,
  title,
  text,
  href,
  action,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <p className="hk-kicker">{eyebrow}</p> : null}
        <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.025em] text-white sm:text-4xl">{title}</h2>
        {text ? <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45 sm:text-base sm:leading-7">{text}</p> : null}
      </div>

      {href && action ? (
        <Link href={href} className="shrink-0 text-sm font-black text-accent hover:brightness-125">
          {action} →
        </Link>
      ) : null}
    </div>
  );
}
