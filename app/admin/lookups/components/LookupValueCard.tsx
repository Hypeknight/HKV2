import {
  archiveLookupValue,
  duplicateLookupValue,
  restoreLookupValue,
  toggleLookupValue,
  updateLookupValue,
} from '../actions';

export type LookupValueRecord = {
  id: string;
  category_key: string;
  value: string;
  display_name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  archived_at?: string | null;
};

type Props = {
  value: LookupValueRecord;
  activeCategory: string;
};

export default function LookupValueCard({
  value,
  activeCategory,
}: Props) {
  const isArchived = Boolean(value.archived_at);
  const isActive = Boolean(value.is_active) && !isArchived;

  return (
    <article
      className={`rounded-[2rem] border p-5 sm:rounded-[2.5rem] sm:p-6 ${
        isArchived
          ? 'border-purple-500/20 bg-purple-500/10'
          : isActive
            ? 'border-white/10 bg-white/5'
            : 'border-yellow-500/20 bg-yellow-500/10'
      }`}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-2xl"
            style={
              value.color
                ? {
                    borderColor: value.color,
                  }
                : undefined
            }
          >
            {value.icon || '🧩'}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-black text-white">
                {value.display_name}
              </h3>

              <StatusBadge
                active={isActive}
                archived={isArchived}
              />
            </div>

            <p className="mt-2 break-all font-mono text-xs text-white/40">
              {value.value}
            </p>

            {value.description ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
                {value.description}
              </p>
            ) : (
              <p className="mt-3 text-sm text-white/35">
                No description provided.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <MetaChip
                label={`Sort ${value.sort_order ?? 100}`}
              />

              {value.color ? (
                <MetaChip label={`Color ${value.color}`} />
              ) : null}

              <MetaChip label={activeCategory} />

              {isArchived && value.archived_at ? (
                <MetaChip
                  label={`Archived ${formatDate(
                    value.archived_at
                  )}`}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 xl:min-w-[220px]">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            User Preview
          </p>

          <div
            className={`mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
              isArchived
                ? 'border-purple-500/20 bg-purple-500/10 text-purple-200'
                : isActive
                  ? 'border-white/10 bg-white/5 text-white'
                  : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
            }`}
          >
            {value.icon ? <span>{value.icon}</span> : null}
            <span>{value.display_name}</span>
          </div>

          <p className="mt-3 text-xs leading-5 text-white/40">
            {isArchived
              ? 'Archived values remain stored but do not appear in active forms.'
              : isActive
                ? 'This value can appear in HypeKnight forms and filters.'
                : 'This value is stored but currently disabled.'}
          </p>
        </div>
      </div>

      {!isArchived ? (
        <details className="mt-6 rounded-2xl border border-white/10 bg-black/20">
          <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-white">
            Edit Value
          </summary>

          <form
            action={updateLookupValue}
            className="grid gap-4 border-t border-white/10 p-5 md:grid-cols-2"
          >
            <input
              type="hidden"
              name="id"
              value={value.id}
            />

            <input
              type="hidden"
              name="category_key"
              value={activeCategory}
            />

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

            <Input
              name="icon"
              label="Icon"
              defaultValue={value.icon}
            />

            <label className="block">
              <span className="text-sm font-semibold text-white/70">
                Color
              </span>

              <div className="mt-2 grid grid-cols-[72px_1fr] gap-3">
                <input
                  type="color"
                  defaultValue={getColorValue(value.color)}
                  className="h-12 w-full cursor-pointer rounded-2xl border border-white/10 bg-black/20 p-2"
                  aria-label="Color preview"
                />

                <input
                  name="color"
                  defaultValue={value.color || ''}
                  placeholder="#FFFFFF"
                  className={inputClass}
                />
              </div>

              <span className="mt-2 block text-xs text-white/40">
                The text value is saved. The picker is a visual reference.
              </span>
            </label>

            <Input
              name="sort_order"
              label="Sort Order"
              type="number"
              defaultValue={value.sort_order ?? 100}
            />

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/75">
              <input
                name="is_active"
                type="checkbox"
                defaultChecked={Boolean(value.is_active)}
                className="h-4 w-4"
              />

              <span>
                <span className="block font-semibold text-white">
                  Active
                </span>

                <span className="mt-1 block text-xs text-white/45">
                  Allow this value to appear across HypeKnight.
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
                defaultValue={value.description || ''}
                className={inputClass}
              />
            </label>

            <button className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90 md:col-span-2">
              Save Value
            </button>
          </form>
        </details>
      ) : (
        <div className="mt-6 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 text-sm text-purple-100/70">
          Restore this value before editing or enabling it.
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {!isArchived ? (
          <>
            <form action={toggleLookupValue}>
              <input
                type="hidden"
                name="id"
                value={value.id}
              />

              <input
                type="hidden"
                name="category_key"
                value={activeCategory}
              />

              <input
                type="hidden"
                name="is_active"
                value={String(Boolean(value.is_active))}
              />

              <button
                className={`w-full rounded-2xl border px-5 py-3 text-sm font-semibold ${
                  value.is_active
                    ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200 hover:border-yellow-500/40'
                    : 'border-green-500/20 bg-green-500/10 text-green-200 hover:border-green-500/40'
                }`}
              >
                {value.is_active
                  ? 'Disable Value'
                  : 'Enable Value'}
              </button>
            </form>

            <form action={duplicateLookupValue}>
              <input
                type="hidden"
                name="id"
                value={value.id}
              />

              <input
                type="hidden"
                name="category_key"
                value={activeCategory}
              />

              <button className="w-full rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-3 text-sm font-semibold text-blue-200 hover:border-blue-500/40">
                Duplicate Value
              </button>
            </form>

            <form action={archiveLookupValue}>
              <input
                type="hidden"
                name="id"
                value={value.id}
              />

              <input
                type="hidden"
                name="category_key"
                value={activeCategory}
              />

              <button className="w-full rounded-2xl border border-purple-500/20 bg-purple-500/10 px-5 py-3 text-sm font-semibold text-purple-200 hover:border-purple-500/40">
                Archive Value
              </button>
            </form>
          </>
        ) : (
          <form
            action={restoreLookupValue}
            className="sm:col-span-2 xl:col-span-3"
          >
            <input
              type="hidden"
              name="id"
              value={value.id}
            />

            <input
              type="hidden"
              name="category_key"
              value={activeCategory}
            />

            <button className="w-full rounded-2xl border border-green-500/20 bg-green-500/10 px-5 py-3 text-sm font-semibold text-green-200 hover:border-green-500/40">
              Restore Value
            </button>
          </form>
        )}
      </div>
    </article>
  );
}

function Input({
  name,
  label,
  defaultValue,
  type = 'text',
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
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
        className={inputClass}
      />
    </label>
  );
}

function StatusBadge({
  active,
  archived,
}: {
  active: boolean;
  archived: boolean;
}) {
  if (archived) {
    return (
      <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-200">
        Archived
      </span>
    );
  }

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

function getColorValue(value?: string | null) {
  if (value && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }

  return '#FFFFFF';
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const inputClass =
  'mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50';