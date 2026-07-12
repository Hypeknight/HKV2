import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

import LookupStats from './components/LookupStats';
import LookupSidebar, {
  type LookupCategorySummary,
} from './components/LookupSidebar';
import LookupCategoryHeader from './components/LookupCategoryHeader';
import LookupToolbar from './components/LookupToolbar';
import LookupCreateForm from './components/LookupCreateForm';
import LookupValueList from './components/LookupValueList';
import type { LookupValueRecord } from './components/LookupValueCard';

type Props = {
  searchParams?: Promise<{
    category?: string;
    q?: string;
    status?: string;
    saved?: string;
    created?: string;
    updated?: string;
    toggled?: string;
  }>;
};

type LookupCategoryRow = {
  id: string;
  category_key: string;
  name?: string | null;
  display_name?: string | null;
  description?: string | null;
  icon?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

type LookupValueRow = {
  id: string;
  category_key: string;
  value: string;
  display_name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

export default async function AdminLookupsPage({
  searchParams,
}: Props) {
  const query = searchParams ? await searchParams : {};

  const search = String(query.q || '').trim().toLowerCase();
  const status = String(query.status || '').trim().toLowerCase();

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) redirect('/auth/login');

  const { data: profile, error: profileError } = await supabase
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
        display_name,
        description,
        icon,
        sort_order,
        is_active
      `)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),

    supabase
      .from('lookup_values')
      .select(`
        id,
        category_key,
        value,
        display_name,
        description,
        icon,
        color,
        sort_order,
        is_active
      `)
      .order('category_key', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('display_name', { ascending: true }),
  ]);

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  if (valuesError) {
    throw new Error(valuesError.message);
  }

  const categories = (categoryRows ?? []) as LookupCategoryRow[];
  const allValues = (valueRows ?? []) as LookupValueRow[];

  const categorySummaries: LookupCategorySummary[] = categories.map(
    (category) => {
      const categoryValues = allValues.filter(
        (value) => value.category_key === category.category_key
      );

      return {
        id: category.id,
        category_key: category.category_key,
        name: category.name,
        display_name: category.display_name,
        description: category.description,
        icon: category.icon,
        is_active: category.is_active,
        value_count: categoryValues.length,
        active_value_count: categoryValues.filter(
          (value) => value.is_active
        ).length,
      };
    }
  );

  const requestedCategory = String(query.category || '').trim();

  const activeCategory =
    categorySummaries.find(
      (category) => category.category_key === requestedCategory
    )?.category_key ||
    categorySummaries.find((category) => category.is_active)
      ?.category_key ||
    categorySummaries[0]?.category_key ||
    'event_types';

  const selectedCategory = categorySummaries.find(
    (category) => category.category_key === activeCategory
  );

  const categoryValues = allValues.filter(
    (value) => value.category_key === activeCategory
  );

  const filteredValues = categoryValues.filter((value) => {
    const haystack = [
      value.display_name,
      value.value,
      value.description,
      value.icon,
      value.color,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = search
      ? haystack.includes(search)
      : true;

    const matchesStatus =
      status === 'active'
        ? value.is_active === true
        : status === 'disabled'
          ? value.is_active !== true
          : true;

    return matchesSearch && matchesStatus;
  });

  const lookupValues: LookupValueRecord[] = filteredValues.map(
    (value) => ({
      id: value.id,
      category_key: value.category_key,
      value: value.value,
      display_name: value.display_name,
      description: value.description,
      icon: value.icon,
      color: value.color,
      sort_order: value.sort_order,
      is_active: value.is_active,
    })
  );

  const totalValueCount = allValues.length;
  const activeValueCount = allValues.filter(
    (value) => value.is_active
  ).length;
  const inactiveValueCount =
    totalValueCount - activeValueCount;

  const activeCategoryLabel =
    selectedCategory?.display_name ||
    selectedCategory?.name ||
    selectedCategory?.category_key ||
    'Lookup Values';

  const notice = getNotice(query);

  return (
    <section className="mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/configuration"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Platform Configuration
        </Link>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/settings"
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
          >
            Platform Settings
          </Link>

          <Link
            href="/admin"
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
          >
            Admin Dashboard
          </Link>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_330px] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Configuration Registry
            </p>

            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              Control every selectable HypeKnight value.
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Manage the categories and values used by event creation,
              user preferences, public discovery, revisions, moderation,
              filters, and future recommendation systems.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <HeroChip
                label={`${categorySummaries.length} categories`}
              />

              <HeroChip
                label={`${activeValueCount} active values`}
              />

              <HeroChip
                label={`${inactiveValueCount} disabled values`}
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">
              Selected Registry
            </p>

            <p className="mt-3 text-3xl font-black text-white">
              {activeCategoryLabel}
            </p>

            <p className="mt-3 text-sm leading-6 text-white/60">
              {selectedCategory?.description ||
                'Manage the values available in this lookup category.'}
            </p>

            <a
              href="#add-lookup-value"
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              Add New Value
            </a>
          </div>
        </div>
      </section>

      <LookupStats
        categoryCount={categorySummaries.length}
        valueCount={totalValueCount}
        activeCount={activeValueCount}
        inactiveCount={inactiveValueCount}
      />

      {notice ? (
        <div
          className={`rounded-2xl border p-4 ${
            notice.tone === 'green'
              ? 'border-green-500/20 bg-green-500/10 text-green-100'
              : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-100'
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      {!categorySummaries.length ? (
        <section className="rounded-[2rem] border border-yellow-500/20 bg-yellow-500/10 p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-200/70">
            Configuration Required
          </p>

          <h2 className="mt-3 text-3xl font-black text-white">
            No lookup categories exist.
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-yellow-100/75">
            Create or seed lookup categories before adding selectable
            HypeKnight values.
          </p>
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <div className="xl:sticky xl:top-6 xl:self-start">
            <LookupSidebar
              categories={categorySummaries}
              activeCategory={activeCategory}
            />
          </div>

          <main className="min-w-0 space-y-6">
            <LookupCategoryHeader
              category={selectedCategory}
              filteredCount={lookupValues.length}
              search={search}
            />

            <LookupToolbar
              activeCategory={activeCategory}
              search={query.q || ''}
              status={status}
              totalCount={categoryValues.length}
            />

            <LookupCreateForm
              activeCategory={activeCategory}
              activeCategoryLabel={activeCategoryLabel}
            />

            <LookupValueList
              values={lookupValues}
              activeCategory={activeCategory}
            />
          </main>
        </section>
      )}
    </section>
  );
}

function HeroChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/65">
      {label}
    </span>
  );
}

function getNotice(query: {
  saved?: string;
  created?: string;
  updated?: string;
  toggled?: string;
}) {
  if (query.created) {
    return {
      tone: 'green' as const,
      text: 'Lookup value created successfully.',
    };
  }

  if (query.updated) {
    return {
      tone: 'green' as const,
      text: 'Lookup value updated successfully.',
    };
  }

  if (query.toggled) {
    return {
      tone: 'green' as const,
      text: 'Lookup visibility updated successfully.',
    };
  }

  if (query.saved) {
    return {
      tone: 'green' as const,
      text: 'Lookup configuration saved.',
    };
  }

  return null;
}