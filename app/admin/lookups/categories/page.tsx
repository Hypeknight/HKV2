import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  createLookupCategory,
  toggleLookupCategory,
  updateLookupCategory,
} from '../actions';

type Props = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    toggled?: string;
  }>;
};

type CategoryRow = {
  id: string;
  category_key: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ValueCountRow = {
  category_key: string;
  is_active: boolean;
};

export default async function LookupCategoriesPage({
  searchParams,
}: Props) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) redirect('/auth/login');

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  const [
    { data: categoryRows, error: categoryError },
    { data: valueRows, error: valuesError },
  ] = await Promise.all([
    supabase
      .from('lookup_categories')
      .select(`
        id,
        category_key,
        name,
        description,
        is_active,
        sort_order,
        created_at,
        updated_at
      `)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),

    supabase
      .from('lookup_values')
      .select(`
        category_key,
        is_active
      `),
  ]);

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  if (valuesError) {
    throw new Error(valuesError.message);
  }

  const categories = (categoryRows ?? []) as CategoryRow[];
  const values = (valueRows ?? []) as ValueCountRow[];

  const categorySummaries = categories.map((category) => {
    const categoryValues = values.filter(
      (value) =>
        value.category_key === category.category_key
    );

    return {
      ...category,
      value_count: categoryValues.length,
      active_value_count: categoryValues.filter(
        (value) => value.is_active
      ).length,
    };
  });

  const activeCategoryCount = categorySummaries.filter(
    (category) => category.is_active
  ).length;

  const disabledCategoryCount =
    categorySummaries.length - activeCategoryCount;

  const totalValueCount = values.length;

  const notice = getNotice(query);

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/lookups"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Lookup Manager
        </Link>

        <Link
          href="/admin/configuration"
          className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
        >
          Platform Configuration
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Lookup Categories
            </p>

            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-6xl">
              Organize the HypeKnight configuration registry.
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Create and manage the category groups that power event
              forms, discovery filters, user preferences, moderation,
              and future recommendation systems.
            </p>
          </div>

          <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">
              Registry Overview
            </p>

            <p className="mt-3 text-5xl font-black text-white">
              {categorySummaries.length}
            </p>

            <p className="mt-3 text-sm leading-6 text-white/60">
              Lookup categories currently registered across HypeKnight.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label="Categories"
          value={categorySummaries.length}
        />

        <Metric
          label="Active"
          value={activeCategoryCount}
          tone="green"
        />

        <Metric
          label="Disabled"
          value={disabledCategoryCount}
          tone={disabledCategoryCount ? 'yellow' : 'neutral'}
        />

        <Metric
          label="Lookup Values"
          value={totalValueCount}
        />
      </section>

      {notice ? (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-green-100">
          {notice}
        </div>
      ) : null}

      <section
        id="create-category"
        className="rounded-[2rem] border border-accent/20 bg-accent/10 p-5 sm:rounded-[2.5rem] sm:p-8"
      >
        <p className="text-xs uppercase tracking-[0.25em] text-accent">
          New Category
        </p>

        <h2 className="mt-2 text-3xl font-black text-white">
          Create a lookup category
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
          The category key is used by HypeKnight code and should remain
          stable after the category is connected to forms or filters.
        </p>

        <form
          action={createLookupCategory}
          className="mt-6 grid gap-4 md:grid-cols-2"
        >
          <Input
            name="name"
            label="Category Name"
            placeholder="Music Genres"
            required
          />

          <Input
            name="category_key"
            label="Category Key"
            placeholder="music_genres"
            helper="Leave blank to generate it from the category name."
          />

          <Input
            name="sort_order"
            label="Sort Order"
            type="number"
            defaultValue={100}
          />

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked
              className="h-4 w-4"
            />

            <span>
              <span className="block font-semibold text-white">
                Active Category
              </span>

              <span className="mt-1 block text-xs text-white/45">
                Active categories can be used throughout HypeKnight.
              </span>
            </span>
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-white/70">
              Description
            </span>

            <textarea
              name="description"
              rows={4}
              placeholder="Explain what this category controls and where it is used."
              className={fieldClass}
            />
          </label>

          <button className="rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90 md:col-span-2">
            Create Lookup Category
          </button>
        </form>
      </section>

      <section>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">
            Category Registry
          </p>

          <h2 className="mt-2 text-3xl font-black text-white">
            Manage existing categories
          </h2>

          <p className="mt-3 text-sm text-white/60">
            Disable categories instead of deleting them so existing
            lookup values and saved event data remain intact.
          </p>
        </div>

        {categorySummaries.length ? (
          <div className="mt-6 space-y-4">
            {categorySummaries.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/60">
            No lookup categories have been created.
          </div>
        )}
      </section>
    </section>
  );
}

function CategoryCard({
  category,
}: {
  category: CategoryRow & {
    value_count: number;
    active_value_count: number;
  };
}) {
  return (
    <article
      className={`rounded-[2rem] border p-5 sm:rounded-[2.5rem] sm:p-6 ${
        category.is_active
          ? 'border-white/10 bg-white/5'
          : 'border-yellow-500/20 bg-yellow-500/10'
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-black text-white">
              {category.name}
            </h3>

            <StatusBadge active={category.is_active} />
          </div>

          <p className="mt-2 font-mono text-xs text-white/40">
            {category.category_key}
          </p>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/60">
            {category.description ||
              'No category description has been provided.'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <MetaChip
              label={`${category.active_value_count} active values`}
            />

            <MetaChip
              label={`${category.value_count} total values`}
            />

            <MetaChip
              label={`Sort ${category.sort_order}`}
            />
          </div>
        </div>

        <Link
          href={`/admin/lookups?category=${encodeURIComponent(
            category.category_key
          )}`}
          className="rounded-2xl bg-accent px-5 py-3 text-center text-sm font-semibold text-black hover:opacity-90"
        >
          Manage Values
        </Link>
      </div>

      <details className="mt-6 rounded-2xl border border-white/10 bg-black/20">
        <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-white">
          Edit Category
        </summary>

        <form
          action={updateLookupCategory}
          className="grid gap-4 border-t border-white/10 p-5 md:grid-cols-2"
        >
          <input
            type="hidden"
            name="id"
            value={category.id}
          />

          <input
            type="hidden"
            name="original_category_key"
            value={category.category_key}
          />

          <Input
            name="name"
            label="Category Name"
            defaultValue={category.name}
            required
          />

          <Input
            name="category_key"
            label="Category Key"
            defaultValue={category.category_key}
            required
            helper="Changing a connected key can break forms. Keep this stable whenever possible."
          />

          <Input
            name="sort_order"
            label="Sort Order"
            type="number"
            defaultValue={category.sort_order}
          />

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked={category.is_active}
              className="h-4 w-4"
            />

            <span>
              <span className="block font-semibold text-white">
                Active Category
              </span>

              <span className="mt-1 block text-xs text-white/45">
                Disabled categories remain stored but are hidden from use.
              </span>
            </span>
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-white/70">
              Description
            </span>

            <textarea
              name="description"
              rows={4}
              defaultValue={category.description || ''}
              className={fieldClass}
            />
          </label>

          <button className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90 md:col-span-2">
            Save Category
          </button>
        </form>
      </details>

      <form
        action={toggleLookupCategory}
        className="mt-3"
      >
        <input
          type="hidden"
          name="id"
          value={category.id}
        />

        <input
          type="hidden"
          name="category_key"
          value={category.category_key}
        />

        <button
          className={`w-full rounded-2xl border px-5 py-3 text-sm font-semibold ${
            category.is_active
              ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200 hover:border-yellow-500/40'
              : 'border-green-500/20 bg-green-500/10 text-green-200 hover:border-green-500/40'
          }`}
        >
          {category.is_active
            ? 'Disable Category'
            : 'Enable Category'}
        </button>
      </form>
    </article>
  );
}

function Input({
  name,
  label,
  defaultValue,
  placeholder,
  helper,
  type = 'text',
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  helper?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/70">
        {label}
      </span>

      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className={fieldClass}
      />

      {helper ? (
        <span className="mt-2 block text-xs leading-5 text-white/40">
          {helper}
        </span>
      ) : null}
    </label>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'green' | 'yellow' | 'neutral';
}) {
  const classes = {
    green: 'border-green-500/20 bg-green-500/10',
    yellow: 'border-yellow-500/20 bg-yellow-500/10',
    neutral: 'border-white/10 bg-white/5',
  };

  return (
    <div className={`rounded-[1.5rem] border p-5 ${classes[tone]}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-white/45">
        {label}
      </p>

      <p className="mt-3 text-4xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        active
          ? 'border-green-500/20 bg-green-500/10 text-green-200'
          : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
      }`}
    >
      {active ? 'Active' : 'Disabled'}
    </span>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/45">
      {label}
    </span>
  );
}

function getNotice(query: {
  created?: string;
  updated?: string;
  toggled?: string;
}) {
  if (query.created) {
    return 'Lookup category created successfully.';
  }

  if (query.updated) {
    return 'Lookup category updated successfully.';
  }

  if (query.toggled) {
    return 'Lookup category status updated successfully.';
  }

  return null;
}

const fieldClass =
  'mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50';