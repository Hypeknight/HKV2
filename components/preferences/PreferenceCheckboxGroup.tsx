import type { LookupValue } from '@/lib/config/lookups';

type Props = {
  title: string;
  description: string;
  name: string;
  options: LookupValue[];
  selected: string[];
};

export default function PreferenceCheckboxGroup({
  title,
  description,
  name,
  options = [],
  selected = [],
}: Props) {
  return (
    <section>
      <h3 className="text-xl font-black text-white">{title}</h3>

      {description ? (
        <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>
      ) : null}

      {options.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white transition hover:border-accent/40"
            >
              <input
                type="checkbox"
                name={name}
                value={option.value}
                defaultChecked={selected.includes(option.value)}
                className="h-4 w-4 shrink-0"
              />

              <span className="font-semibold">
                {option.icon ? `${option.icon} ` : ''}
                {option.display_name}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          No active options found. Add them in Admin Lookups.
        </div>
      )}
    </section>
  );
}