import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import type { DashboardSummary } from '../api/types.js';
import { StatCard } from '../components/StatCard.js';
import { SectionCard } from '../components/SectionCard.js';
import { formatCurrency } from '../lib/format.js';

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    void apiFetch<DashboardSummary>('/dashboard/summary').then(setSummary).catch(() => setSummary(null));
  }, []);

  if (!summary) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">Loading dashboard...</div>;
  }

  const maxRevenue = Math.max(...summary.revenueLast7Days.map((entry: DashboardSummary['revenueLast7Days'][number]) => entry.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-gold-400">Admin dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Store performance</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today’s sales" value={String(summary.todaySales.count)} hint={formatCurrency(summary.todaySales.revenue)} accent="Completed" />
        <StatCard label="Low stock" value={String(summary.lowStockProducts.length)} hint="Products below their thresholds" accent="Alerts" />
        <StatCard label="Top performers" value={String(summary.topProducts.length)} hint="Best-selling products today" accent="Today" />
        <StatCard label="Active cashiers" value={String(summary.activeCashiers)} hint="Open checkout sessions" accent="Live" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <SectionCard title="Revenue last 7 days" subtitle="Rolling daily totals">
          <div className="grid grid-cols-7 items-end gap-3">
            {summary.revenueLast7Days.map((entry: DashboardSummary['revenueLast7Days'][number]) => (
              <div key={entry.date} className="flex min-h-[180px] flex-col items-center justify-end gap-2">
                <div className="flex w-full items-end justify-center rounded-2xl bg-white/5 p-2">
                  <div className="w-full rounded-2xl bg-gradient-to-t from-gold-500 to-mint-400 transition-all" style={{ height: `${Math.max((entry.total / maxRevenue) * 160, 8)}px` }} />
                </div>
                <span className="text-xs text-slate-400">{entry.date}</span>
                <span className="text-[11px] text-slate-500">{formatCurrency(entry.total)}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Top 5 products" subtitle="Highest unit volume today">
          <div className="space-y-3">
            {summary.topProducts.map((item: DashboardSummary['topProducts'][number], index: number) => (
              <div key={item.productId} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">
                      {index + 1}. {item.name}
                    </p>
                    <p className="text-sm text-slate-400">SKU {item.sku}</p>
                  </div>
                  <p className="text-right text-sm text-slate-300">
                    {item.quantity} units
                    <br />
                    {formatCurrency(item.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Low stock alerts" subtitle="Products approaching reorder levels">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {summary.lowStockProducts.map((product: DashboardSummary['lowStockProducts'][number]) => (
            <div key={product.id} className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
              <p className="font-medium text-amber-50">{product.name}</p>
              <p className="mt-1 text-sm text-amber-100/80">{product.category?.name}</p>
              <p className="mt-2 text-sm text-amber-100/90">
                Stock {product.stockQuantity} / threshold {product.lowStockThreshold}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
