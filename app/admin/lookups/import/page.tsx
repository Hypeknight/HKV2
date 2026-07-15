import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LookupImportForm from '../components/LookupImportForm';

type Props = {
  searchParams?: Promise<{
    imported?: string;
    skipped?: string;
  }>;
};

export default async function LookupImportPage({
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

  if (!user) {
    redirect('/auth/login');
  }

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

  const { data: categories, error: categoryError } = await supabase
    .from('lookup_categories')
    .select(`
      id,
      category_key,
      name,
      is_active,
      sort_order
    `)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  const importedCount = safeCount(query.imported);
  const skippedCount = safeCount(query.skipped);

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/lookups"
          className="text-sm font-semibold text-white/60 hover:text-accent"
        >
          ← Back to Lookup Manager
        </Link>

        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/lookups/export"
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
          >
            Export Registry
          </a>

          <Link
            href="/admin/lookups/categories"
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
          >
            Manage Categories
          </Link>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Registry Import
            </p>

            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-6xl">
              Add lookup values in bulk.
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Upload a CSV containing music genres, event types, amenities,
              vibes, dress codes, or other HypeKnight lookup values. The file
              will be reviewed before any records are written.
            </p>
          </div>

          <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">
              Safe Import
            </p>

            <p className="mt-3 text-3xl font-black text-white">
              Preview first
            </p>

            <p className="mt-3 text-sm leading-6 text-white/60">
              Invalid categories, malformed values, duplicate records, and
              unsafe data will be identified before insertion.
            </p>
          </div>
        </div>
      </section>

      {query.imported ? (
        <section className="rounded-2xl border border-green-500/20 bg-green-500/10 p-5 text-green-100">
          <p className="font-semibold">
            Import completed successfully.
          </p>

          <p className="mt-1 text-sm text-green-100/70">
            {importedCount} value{importedCount === 1 ? '' : 's'} imported
            {skippedCount
              ? ` and ${skippedCount} duplicate or invalid row${
                  skippedCount === 1 ? '' : 's'
                } skipped.`
              : '.'}
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <LookupImportForm
          categories={(categories ?? []).map((category) => ({
            category_key: category.category_key,
            name: category.name,
            is_active: category.is_active === true,
          }))}
        />

        <aside className="space-y-6">
          <ImportHelp />

          <CsvColumns />

          <ImportRules />
        </aside>
      </section>
    </section>
  );
}

function ImportHelp() {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-accent">
        Recommended Workflow
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        Export before importing
      </h2>

      <p className="mt-3 text-sm leading-6 text-white/60">
        Export an existing category first and use that file as your template.
        This reduces formatting mistakes and preserves the expected column
        names.
      </p>

      <a
        href="/admin/lookups/export"
        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40"
      >
        Download CSV Template
      </a>
    </section>
  );
}

function CsvColumns() {
  const columns = [
    ['category_key', 'Required unless a category is selected on upload.'],
    ['value', 'Stored machine-readable value.'],
    ['display_name', 'Required public-facing label.'],
    ['description', 'Optional explanatory text.'],
    ['icon', 'Optional emoji or short icon text.'],
    ['color', 'Optional hexadecimal color such as #FFAA00.'],
    ['sort_order', 'Optional integer; defaults to 100.'],
    ['is_active', 'true or false; defaults to false for safety.'],
    ['archived_at', 'Leave blank for normal imported values.'],
  ];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-accent">
        CSV Columns
      </p>

      <div className="mt-5 space-y-3">
        {columns.map(([name, description]) => (
          <div
            key={name}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <p className="font-mono text-sm font-semibold text-white">
              {name}
            </p>

            <p className="mt-1 text-xs leading-5 text-white/45">
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ImportRules() {
  return (
    <section className="rounded-[2rem] border border-yellow-500/20 bg-yellow-500/10 p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-yellow-200">
        Import Rules
      </p>

      <div className="mt-4 space-y-3 text-sm leading-6 text-yellow-100/70">
        <p>
          Duplicate stored values inside the same category will be skipped.
        </p>

        <p>
          Unknown category keys will be rejected unless a valid category is
          selected as the import override.
        </p>

        <p>
          Imported records default to disabled unless the CSV explicitly
          contains a valid active value.
        </p>

        <p>
          Existing lookup records will not be overwritten by this first
          version of the importer.
        </p>
      </div>
    </section>
  );
}

function safeCount(value?: string) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? Math.round(number)
    : 0;
}