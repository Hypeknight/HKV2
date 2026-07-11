type Props = {
  categoryCount: number;
  valueCount: number;
  activeCount: number;
  inactiveCount: number;
};

export default function LookupStats({
  categoryCount,
  valueCount,
  activeCount,
  inactiveCount,
}: Props) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Categories"
        value={categoryCount}
        description="Lookup groups"
      />

      <StatCard
        label="Total Values"
        value={valueCount}
        description="Registered options"
      />

      <StatCard
        label="Active"
        value={activeCount}
        description="Visible across HypeKnight"
        tone="green"
      />

      <StatCard
        label="Disabled"
        value={inactiveCount}
        description="Currently hidden"
        tone={inactiveCount ? 'yellow' : 'neutral'}
      />
    </section>
  );
}

function StatCard({
  label,
  value,
  description,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  description: string;
  tone?: 'green' | 'yellow' | 'neutral';
}) {
  const classes = {
    green: 'border-green-500/20 bg-green-500/10',
    yellow: 'border-yellow-500/20 bg-yellow-500/10',
    neutral: 'border-white/10 bg-white/5',
  };

  return (
    <div
      className={`rounded-[1.5rem] border p-4 sm:p-5 ${classes[tone]}`}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-white/45">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black text-white sm:text-4xl">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-white/45">
        {description}
      </p>
    </div>
  );
}