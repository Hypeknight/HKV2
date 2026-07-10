import PreferenceInput from './PreferenceInput';

type Props = {
  preferredCity?: string | null;
  preferredState?: string | null;
  maxDistanceMiles?: number | null;
};

export default function HomeLocationSection({
  preferredCity,
  preferredState,
  maxDistanceMiles,
}: Props) {
  return (
    <section>
      <h3 className="text-xl font-black text-white">Home Area</h3>

      <p className="mt-2 text-sm leading-6 text-white/60">
        Tell HypeKnight where to focus your discovery feed first.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <PreferenceInput
          name="preferred_city"
          label="Preferred City"
          defaultValue={preferredCity}
          placeholder="Kansas City"
        />

        <PreferenceInput
          name="preferred_state"
          label="State"
          defaultValue={preferredState}
          placeholder="MO"
        />

        <PreferenceInput
          name="max_distance_miles"
          label="Travel Radius"
          type="number"
          min="1"
          max="250"
          defaultValue={maxDistanceMiles ?? 25}
          helper="Maximum distance HypeKnight should search."
        />
      </div>
    </section>
  );
}