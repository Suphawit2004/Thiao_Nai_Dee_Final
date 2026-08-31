export default function StatsCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[#eee3d2] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-sand text-xl" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-espresso/50">
            {label}
          </p>
          <p className="text-2xl font-extrabold text-espresso">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
