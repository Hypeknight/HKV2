import { createLookupValue } from '../actions';

type Props = {
  activeCategory: string;
  activeCategoryLabel: string;
};

export default function LookupCreateForm({
  activeCategory,
  activeCategoryLabel,
}: Props) {
  return (
    <section
      id="add-lookup-value"
      className="scroll-mt-24 rounded-[2rem] border border-accent/20 bg-accent/10 p-5 sm:rounded-[2.5rem] sm:p-8"
    >
      <p className="text-xs uppercase tracking-[0.25em] text-accent">
        Add Value
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        Add to {activeCategoryLabel}
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
        Add a new selectable option. Once active, it can appear anywhere this
        lookup category is used.
      </p>

      <form
        action={createLookupValue}
        className="mt-6 grid gap-4 md:grid-cols-2"
      >
        <input
          type="hidden"
          name="category_key"
          value={activeCategory}
        />

        <Input
          name="display_name"
          label="Display Name"
          placeholder="Hip Hop"
          required
        />

        <Input
          name="value"
          label="Stored Value"
          placeholder="hip_hop"
          helper="Leave blank to generate from the display name."
        />

        <Input
          name="icon"
          label="Icon"
          placeholder="🎵"
        />

        <label className="block">
          <span className="text-sm font-semibold text-white/70">
            Color
          </span>

          <div className="mt-2 grid grid-cols-[72px_1fr] gap-3">
            <input
              name="color_picker"
              type="color"
              defaultValue="#ffffff"
              className="h-12 w-full cursor-pointer rounded-2xl border border-white/10 bg-black/20 p-2"
            />

            <input
              name="color"
              placeholder="#ffffff"
              className={fieldClass}
            />
          </div>

          <span className="mt-2 block text-xs text-white/40">
            The typed color value is saved. The picker is a visual reference.
          </span>
        </label>

        <Input
          name="sort_order"
          label="Sort Order"
          type="number"
          defaultValue={100}
        />

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/75">
          <input
            name="is_active"
            type="checkbox"
            defaultChecked
            className="h-4 w-4"
          />

          <span>
            <span className="block font-semibold text-white">
              Active
            </span>

            <span className="mt-1 block text-xs text-white/45">
              Active values can appear in HypeKnight forms and filters.
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
            placeholder="Explain what this value represents and when it should be used."
            className={fieldClass}
          />
        </label>

        <button className="rounded-2xl bg-accent px-6 py-4 font-semibold text-black hover:opacity-90 md:col-span-2">
          Add Lookup Value
        </button>
      </form>
    </section>
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
        <span className="mt-2 block text-xs text-white/40">
          {helper}
        </span>
      ) : null}
    </label>
  );
}

const fieldClass =
  'mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50';