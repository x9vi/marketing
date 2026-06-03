export function StatCard({
  label,
  value,
  hint,
  accent,
  trend
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="admin-panel p-4 transition hover:border-white/15">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
        </div>
        {accent ? (
          <span
            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
              trend === 'down' ? 'bg-amber-500/20 text-amber-300' : 'bg-mint-500/15 text-mint-300'
            }`}
          >
            {accent}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-2.5 text-sm text-slate-400">{hint}</p> : null}
    </div>
  );
}
