import { useEffect, useState } from 'react';
import { apiFetch, apiUrl } from '../api/client.js';
import type { Sale } from '../api/types.js';
import { PageHeader } from '../components/PageHeader.js';
import { SectionCard } from '../components/SectionCard.js';
import { formatCurrency, formatDate } from '../lib/format.js';

export function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    void apiFetch<{ sales: Sale[] }>('/sales')
      .then((result) => setSales(result.sales))
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = sales.filter((sale) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      sale.receiptNumber.toLowerCase().includes(q) ||
      sale.customer?.name.toLowerCase().includes(q) ||
      sale.user?.name.toLowerCase().includes(q)
    );
  });

  const todayTotal = sales
    .filter((s) => new Date(s.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + Number(s.total), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transactions"
        title="Sales history"
        description="Review completed receipts, cashiers, and download PDF copies."
      />

      <div className="admin-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="admin-panel p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Total receipts</p>
          <p className="mt-1 text-2xl font-bold text-white">{sales.length}</p>
        </div>
        <div className="admin-panel p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Today's revenue</p>
          <p className="mt-1 text-2xl font-bold text-mint-400">{formatCurrency(todayTotal)}</p>
        </div>
      </div>

      <SectionCard title="Recent sales" subtitle="Last 100 completed transactions">
        <div className="mb-4">
          <input
            className="admin-input max-w-md"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search receipt, cashier, or customer…"
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading sales…</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Date</th>
                  <th>Cashier</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => (
                  <tr key={sale.id}>
                    <td className="font-mono text-sm font-medium text-white">{sale.receiptNumber}</td>
                    <td className="text-sm text-slate-400">{formatDate(sale.createdAt)}</td>
                    <td>{sale.user?.name ?? '—'}</td>
                    <td>{sale.customer?.name ?? 'Walk-in'}</td>
                    <td>{sale.items.length}</td>
                    <td className="font-semibold text-mint-300">{formatCurrency(sale.total)}</td>
                    <td>
                      <a
                        href={apiUrl(`/sales/${sale.id}/receipt.pdf`)}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-btn admin-btn--ghost text-xs"
                      >
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? <p className="p-4 text-sm text-slate-400">No sales match your search.</p> : null}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
