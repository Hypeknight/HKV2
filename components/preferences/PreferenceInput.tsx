type Props = {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  helper?: string;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
  required?: boolean;
};

export default function PreferenceInput({
  name,
  label,
  defaultValue,
  placeholder,
  helper,
  type = 'text',
  min,
  max,
  step,
  required = false,
}: Props) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/70">{label}</span>

      <input
        name={name}
        type={type}
        min={min}
        max={max}
        step={step}
        required={required}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
      />

      {helper ? (
        <span className="mt-2 block text-xs leading-5 text-white/45">
          {helper}
        </span>
      ) : null}
    </label>
  );
}