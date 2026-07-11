import {
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
};

type Props = {
  value: LookupValueRecord;
  activeCategory: string;
};

export default function LookupValueCard({
  value,
  activeCategory,
}: Props) {
  return (
    <article
      className={`rounded-[2rem] border p-5 sm:rounded-[2.5rem] sm:p-6 ${
        value.is_active
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

              <StatusBadge active={Boolean(value.is_active)} />
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
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 xl:min-w-[220px]">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            User Preview
          </p>

          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
            {value.icon ? <span>{value.icon}</span> : null}
            <span>{value.display_name}</span>
          </div>
        </div>
      </div>

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

          <Input
            name="color"
            label="Color"
            defaultValue={value.color}
          />

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
              className={fieldClass}
            />
          </label>

          <button className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90 md:col-span-2">
            Save Value
          </button>
        </form>
      </details>

      <form
        action={toggleLookupValue}
        className="mt-3"
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
        className={fieldClass}
      />
    </label>
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

const fieldClass =
  'mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50';