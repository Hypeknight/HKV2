import LookupValueCard, {
  type LookupValueRecord,
} from './LookupValueCard';

type Props = {
  values: LookupValueRecord[];
  activeCategory: string;
};

export default function LookupValueList({
  values,
  activeCategory,
}: Props) {
  if (!values.length) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/60">
        No lookup values match the current category and filters.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {values.map((value) => (
        <LookupValueCard
          key={value.id}
          value={value}
          activeCategory={activeCategory}
        />
      ))}
    </section>
  );
}