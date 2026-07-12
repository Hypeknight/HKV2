import Link from 'next/link';

export type LookupCategorySummary = {
  id: string;
  category_key: string;
  name: string;
  description?: string | null;
  is_active?: boolean | null;
  value_count: number;
  active_value_count: number;
};

type Props = {
  categories: LookupCategorySummary[];
  activeCategory: string;
};

export default function LookupSidebar({
  categories,
  activeCategory,
}: Props) {
  return (
    <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-4 sm:rounded-[2.5rem]">
      <div className="flex items-center justify-between gap-3 px-2">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">
            Categories
          </p>

          <p className="mt-1 text-sm text-white/45">
            {categories.length} lookup groups
          </p>
        </div>

        <Link
          href="/admin/lookups?view=categories"
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/65 hover:border-accent/40 hover:text-accent"
        >
          Manage
        </Link>
      </div>

      <div className="mt-5 space-y-2">
        {categories.map((category) => {
          const selected =
            activeCategory === category.category_key;

          return (
            <Link
              key={category.id}
              href={`/admin/lookups?category=${encodeURIComponent(
                category.category_key
              )}`}
              className={`block rounded-2xl border p-4 transition ${
                selected
                  ? 'border-accent/30 bg-accent/10'
                  : 'border-white/10 bg-black/20 hover:border-accent/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-xl">
                  🧩
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className={`truncate font-black ${
                        selected
                          ? 'text-accent'
                          : 'text-white'
                      }`}
                    >
                      {category.name}
                    </p>

                    {!category.is_active ? (
                      <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-200">
                        Disabled
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-xs text-white/45">
                    {category.active_value_count} active ·{' '}
                    {category.value_count} total
                  </p>

                  {category.description ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/40">
                      {category.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}

        {!categories.length ? (
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            No lookup categories have been created.
          </div>
        ) : null}
      </div>
    </aside>
  );
}