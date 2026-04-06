export function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">{description}</p>
    </div>
  );
}
