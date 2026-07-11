import type { LookupCategorySummary } from './LookupSidebar';

type Props = {
  category?: LookupCategorySummary;
  filteredCount: number;
  search?: string;
};

export default function LookupCategoryHeader({
  category,
  filteredCount,
  search,
}: Props) {
  if (!category) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
        <h2 className="text-2xl font-black text-white">
          Select a lookup category
        </h2>

        <p className="mt-3 text-white/60">
          Choose a category to manage its available values.
        </p>
      </section>
    );
  }

  const label =
    category.display_name ||
    category.name ||
    category.category_key;

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">
            Selected Category
          </p>

          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-2xl">
              {category.icon || '🧩'}
            </span>

            <div>
              <h2 className="text-3xl font-black text-white">
                {label}
              </h2>

              <p className="mt-1 font-mono text-xs text-white/40">
                {category.category_key}
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/60">
            {category.description ||
              'No category description has been provided.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
          <MiniMetric
            label="Active"
            value={category.active_value_count}
          />

          <MiniMetric
            label="Total"
            value={category.value_count}
          />

          <MiniMetric
            label={search ? 'Matches' : 'Showing'}
            value={filteredCount}
          />

          <MiniMetric
            label="Status"
            value={category.is_active ? 'Active' : 'Disabled'}
            text
          />
        </div>
      </div>
    </section>
  );
}

function MiniMetric({
  label,
  value,
  text = false,
}: {
  label: string;
  value: number | string;
  text?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/40">
        {label}
      </p>

      <p
        className={`mt-2 font-black text-white ${
          text ? 'text-base' : 'text-2xl'
        }`}
      >
        {value}
      </p>
    </div>
  );
}