import Link from 'next/link';

type Props = {
  activeCategory: string;
  search?: string;
  status?: string;
  totalCount: number;
};

export default function LookupToolbar({
  activeCategory,
  search = '',
  status = '',
  totalCount,
}: Props) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">
            Value Manager
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Search and manage values
          </h2>

          <p className="mt-2 text-sm text-white/50">
            {totalCount} value{totalCount === 1 ? '' : 's'} in this category.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/lookups?category=${encodeURIComponent(
              activeCategory
            )}`}
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
          >
            Clear Filters
          </Link>

          <a
            href="#add-lookup-value"
            className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-black hover:opacity-90"
          >
            Add Value
          </a>
        </div>
      </div>

      <form className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <input
          type="hidden"
          name="category"
          value={activeCategory}
        />

        <input
          name="q"
          defaultValue={search}
          placeholder="Search display name, stored value, description..."
          className={fieldClass}
        />

        <select
          name="status"
          defaultValue={status}
          className={fieldClass}
        >
          <option value="">Active and Disabled</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="archived">Archived</option>
        </select>

        <button className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90">
          Apply
        </button>
      </form>
    </section>
  );
}

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50';