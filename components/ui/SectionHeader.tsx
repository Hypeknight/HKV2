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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
          {title}
        </h2>

        {text ? (
          <p className="mt-3 text-sm text-white/70 sm:text-base">{text}</p>
        ) : null}
      </div>

      {href && action ? (
        <Link href={href} className="text-sm text-white/55 hover:text-accent">
          {action} →
        </Link>
      ) : null}
    </div>
  );
}