import { useEffect, useState } from 'react';
import { apiFetch, apiUrl } from '../api/client.js';
import type { ReportSummary, TopProduct } from '../api/types.js';
import { SectionCard } from '../components/SectionCard.js';
import { formatCurrency, formatDate } from '../lib/format.js';

export function ReportsPage() {
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  const refresh = async () => {
    const [summaryResult, topProductsResult] = await Promise.all([
      apiFetch<ReportSummary>(`/reports/sales?range=${range}`),
      apiFetch<{ topProducts: TopProduct[] }>(`/reports/top-products?range=${range}`)
    ]);
    setSummary(summaryResult);
    setTopProducts(topProductsResult.topProducts);
  };

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [range]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gold-400">Sales analytics</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Reports and export</h1>
        </div>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((value) => (
            <button key={value} onClick={() => setRange(value)} className={`rounded-2xl px-4 py-2 text-sm font-medium ${range === value ? 'bg-gold-500 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-200'}`}>
              {value}
            </button>
          ))}
        </div>
      </div>

      {summary ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SectionCard title="Revenue"><p className="text-2xl font-semibold text-white">{formatCurrency(summary.summary.revenue)}</p></SectionCard>
          <SectionCard title="Cost"><p className="text-2xl font-semibold text-white">{formatCurrency(summary.summary.cost)}</p></SectionCard>
          <SectionCard title="Profit"><p className="text-2xl font-semibold text-white">{formatCurrency(summary.summary.profit)}</p></SectionCard>
          <SectionCard title="Items sold"><p className="text-2xl font-semibold text-white">{summary.itemCount}</p></SectionCard>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Export reports" subtitle="Download the current report set">
          <div className="flex flex-wrap gap-3">
            <a className="rounded-2xl bg-gold-500 px-4 py-2 font-semibold text-slate-950" href={apiUrl(`/reports/export?format=excel`)} target="_blank" rel="noreferrer">Export Excel</a>
            <a className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-medium text-slate-200" href={apiUrl(`/reports/export?format=pdf`)} target="_blank" rel="noreferrer">Export PDF</a>
          </div>
          {summary ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
              Range {summary.range} · generated {formatDate(new Date())}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="Top products" subtitle="Highest selling items in the selected period">
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.productId} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{index + 1}. {product.name}</p>
                    <p className="text-sm text-slate-400">SKU {product.sku}</p>
                  </div>
                  <div className="text-right text-sm text-slate-300">
                    <p>{product.quantity} units</p>
                    <p>{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Sales trend" subtitle="Daily totals in the selected range">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400"><tr><th className="py-3 pr-4">Date</th><th className="py-3 pr-4">Total</th></tr></thead>
            <tbody>
              {summary?.salesByDay.map((row: ReportSummary['salesByDay'][number]) => (
                <tr key={row.date} className="border-t border-white/10 text-slate-200">
                  <td className="py-3 pr-4">{row.date}</td>
                  <td className="py-3 pr-4">{formatCurrency(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
