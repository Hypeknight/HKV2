import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  createLookupValue,
  toggleLookupValue,
  updateLookupValue,
} from './actions';

type Props = {
  searchParams?: Promise<{
    category?: string;
    saved?: string;
  }>;
};

export default async function AdminLookupsPage({ searchParams }: Props) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') redirect('/dashboard');

  const { data: categories, error: categoryError } = await supabase
    .from('lookup_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (categoryError) throw new Error(categoryError.message);

  const activeCategory =
    query.category ||
    categories?.[0]?.category_key ||
    'event_types';

  const { data: values, error: valuesError } = await supabase
    .from('lookup_values')
    .select('*')
    .eq('category_key', activeCategory)
    .order('sort_order', { ascending: true });

  if (valuesError) throw new Error(valuesError.message);

  const activeCategoryLabel =
    categories?.find((category) => category.category_key === activeCategory)
      ?.name || activeCategory;

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:px-8">
      <Link href="/admin" className="text-sm text-white/60 hover:text-accent">
        ← Back to Admin
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 sm:rounded-[3rem] sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            Admin Lookups
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
            Manage HypeKnight dropdowns and tags.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            Control the values used across event creation, discovery filters,
            user preferences, revision pages, and future admin tools.
          </p>
        </div>
      </section>

      {query.saved ? (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-green-100">
          Lookup settings saved.
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-4 sm:rounded-[2.5rem]">
          <p className="px-2 text-xs uppercase tracking-[0.25em] text-accent">
            Categories
          </p>

          <div className="mt-4 space-y-2">
            {(categories ?? []).map((category) => (
              <Link
                key={category.id}
                href={`/admin/lookups?category=${category.category_key}`}
                className={`block rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  activeCategory === category.category_key
                    ? 'border-accent/30 bg-accent/10 text-accent'
                    : 'border-white/10 bg-black/20 text-white/70 hover:border-accent/30'
                }`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </aside>

        <main className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">
              Add Value
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Add to {activeCategoryLabel}
            </h2>

            <form action={createLookupValue} className="mt-6 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="category_key" value={activeCategory} />

              <Input name="display_name" label="Display Name" required />
              <Input name="value" label="Stored Value" placeholder="Optional; defaults to display name" />
              <Input name="icon" label="Icon" placeholder="🔥" />
              <Input name="color" label="Color" placeholder="Optional" />
              <Input name="sort_order" label="Sort Order" type="number" defaultValue={100} />

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/75">
                <input name="is_active" type="checkbox" defaultChecked />
                <span>Active</span>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-white/70">
                  Description
                </span>
                <textarea
                  name="description"
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
                />
              </label>

              <button className="rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90 md:col-span-2">
                Add Lookup Value
              </button>
            </form>
          </section>

          <section className="space-y-4">
            {(values ?? []).length ? (
              values?.map((value) => (
                <article
                  key={value.id}
                  className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-6"
                >
                  <form action={updateLookupValue} className="grid gap-4 md:grid-cols-2">
                    <input type="hidden" name="id" value={value.id} />
                    <input type="hidden" name="category_key" value={activeCategory} />

                    <Input
                      name="display_name"
                      label="Display Name"
                      defaultValue={value.display_name}
                      required
                    />

                    <Input
                      name="value"
                      label="Stored Value"
                      defaultValue={value.value}
                      required
                    />

                    <Input name="icon" label="Icon" defaultValue={value.icon} />
                    <Input name="color" label="Color" defaultValue={value.color} />

                    <Input
                      name="sort_order"
                      label="Sort Order"
                      type="number"
                      defaultValue={value.sort_order}
                    />

                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/75">
                      <input
                        name="is_active"
                        type="checkbox"
                        defaultChecked={Boolean(value.is_active)}
                      />
                      <span>Active</span>
                    </label>

                    <label className="block md:col-span-2">
                      <span className="text-sm font-semibold text-white/70">
                        Description
                      </span>
                      <textarea
                        name="description"
                        rows={3}
                        defaultValue={value.description || ''}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
                      />
                    </label>

                    <div className="flex flex-col gap-3 md:col-span-2 md:flex-row">
                      <button className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90">
                        Save
                      </button>
                    </div>
                  </form>

                  <form action={toggleLookupValue} className="mt-3">
                    <input type="hidden" name="id" value={value.id} />
                    <input type="hidden" name="category_key" value={activeCategory} />
                    <input
                      type="hidden"
                      name="is_active"
                      value={String(Boolean(value.is_active))}
                    />

                    <button className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:border-accent/40">
                      {value.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </form>
                </article>
              ))
            ) : (
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/60">
                No lookup values found for this category.
              </div>
            )}
          </section>
        </main>
      </section>
    </section>
  );
}

function Input({
  name,
  label,
  defaultValue,
  placeholder,
  type = 'text',
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/70">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />
    </label>
  );
}