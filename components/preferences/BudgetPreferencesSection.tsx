import PreferenceInput from './PreferenceInput';

type Props = {
  maxCoverPrice?: number | null;
};

export default function BudgetPreferencesSection({
  maxCoverPrice,
}: Props) {
  return (
    <section>
      <h3 className="text-xl font-black text-white">Budget</h3>

      <p className="mt-2 text-sm leading-6 text-white/60">
        Set the highest cover or ticket price you usually want to see.
      </p>

      <div className="mt-5 max-w-md">
        <PreferenceInput
          name="max_cover_price"
          label="Maximum Cover Price"
          type="number"
          min="0"
          max="1000"
          step="0.01"
          defaultValue={maxCoverPrice ?? 50}
          placeholder="50"
        />
      </div>
    </section>
  );
}