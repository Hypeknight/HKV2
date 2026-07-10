type StaticOption = {
  value: string;
  label: string;
  description?: string;
  icon?: string;
};

type Props = {
  title: string;
  description?: string;
  name: string;
  options: StaticOption[];
  selected?: string[];
  columns?: 2 | 3 | 4;
};

export default function PreferenceStaticCheckboxGroup({
  title,
  description,
  name,
  options,
  selected = [],
  columns = 3,
}: Props) {
  const gridClass =
    columns === 2
      ? 'sm:grid-cols-2'
      : columns === 4
      ? 'sm:grid-cols-2 xl:grid-cols-4'
      : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section>
      <h3 className="text-xl font-black text-white">{title}</h3>

      {description ? (
        <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>
      ) : null}

      <div className={`mt-5 grid gap-3 ${gridClass}`}>
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white transition hover:border-accent/40"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selected.includes(option.value)}
              className="mt-1 h-4 w-4 shrink-0"
            />

            <span>
              <span className="block font-semibold">
                {option.icon ? `${option.icon} ` : ''}
                {option.label}
              </span>

              {option.description ? (
                <span className="mt-1 block text-sm leading-5 text-white/50">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}