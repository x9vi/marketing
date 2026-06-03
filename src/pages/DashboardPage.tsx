import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import type { DashboardSummary } from '../api/types.js';
import { useAuth } from '../context/AuthContext.js';
import { StatCard } from '../components/StatCard.js';
import { SectionCard } from '../components/SectionCard.js';
import { PageHeader } from '../components/PageHeader.js';
import { QuickActionCard } from '../components/QuickActionCard.js';
import { formatCurrency } from '../lib/format.js';
import { defaultAppPath } from '../config/nav.js';

function aggregateRevenue(entries: DashboardSummary['revenueLast7Days']) {
  const map = new Map<string, number>();
  for (const entry of entries) {
    map.set(entry.date, (map.get(entry.date) ?? 0) + entry.total);
  }
  return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
}

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    setLoading(true);
    void apiFetch<DashboardSummary>('/dashboard/summary')
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [user?.role]);

  const chartData = useMemo(() => (summary ? aggregateRevenue(summary.revenueLast7Days) : []), [summary]);
  const maxRevenue = Math.max(...chartData.map((e) => e.total), 1);

  if (user?.role !== 'ADMIN') {
    return <Navigate to={defaultAppPath(user?.role ?? 'CASHIER')} replace />;
  }

  if (loading) {
    return (
      <div className="admin-panel p-8 text-center text-slate-300">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-mint-400 border-t-transparent" />
        Loading command center…
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="admin-panel p-8 text-center text-red-300">
        Could not load dashboard. Check your connection and try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin command center"
        title="Store performance at a glance"
        description="Everything you need to run FreshMart — sales, stock, team, and live checkout."
        action={
          <Link to="/app/reports" className="admin-btn admin-btn--primary">
            View reports
          </Link>
        }
      />

      {summary.lowStockProducts.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
          <p className="text-sm text-amber-50">
            <strong>{summary.lowStockProducts.length}</strong> products need restocking
          </p>
          <Link to="/app/inventory" className="text-sm font-semibold text-amber-200 hover:text-white">
            Go to inventory →
          </Link>
        </div>
      ) : null}

      <div className="admin-stat-grid">
        <StatCard label="Today's receipts" value={String(summary.todaySales.count)} hint={formatCurrency(summary.todaySales.revenue)} accent="Sales" trend="up" />
        <StatCard label="Low stock alerts" value={String(summary.lowStockProducts.length)} hint="Below reorder threshold" accent="Alert" trend={summary.lowStockProducts.length ? 'down' : undefined} />
        <StatCard label="Active checkouts" value={String(summary.activeCashiers)} hint="Cashiers signed in now" accent="Live" />
        <StatCard label="Top sellers today" value={String(summary.topProducts.length)} hint="By units sold" accent="Today" />
      </div>

      <SectionCard title="Quick actions" subtitle="Jump to the tools you use most">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickActionCard to="/app/pos" label="Open POS" description="Start a sale" icon="pos" accent="gold" />
          <QuickActionCard to="/app/products" label="Products" description="Edit catalog & prices" icon="products" accent="mint" />
          <QuickActionCard to="/app/inventory" label="Stock in" description="Receive deliveries" icon="inventory" accent="sky" />
          <QuickActionCard to="/app/employees" label="Team" description="Manage staff access" icon="employees" accent="amber" />
          <QuickActionCard to="/app/sales" label="Sales" description="Browse receipts" icon="sales" accent="sky" />
          <QuickActionCard to="/app/suppliers" label="Suppliers" description="Vendor contacts" icon="suppliers" accent="mint" />
          <QuickActionCard to="/app/customers" label="Customers" description="Loyalty & history" icon="customers" accent="gold" />
          <QuickActionCard to="/app/activity" label="Activity" description="Audit & sessions" icon="activity" accent="amber" />
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <SectionCard title="Revenue · last 7 days" subtitle="Daily totals from completed sales">
          {chartData.length === 0 ? (
            <p className="text-sm text-slate-400">No sales in the last week yet.</p>
          ) : (
            <div className="grid grid-cols-7 items-end gap-2 sm:gap-3">
              {chartData.map((entry) => (
                <div key={entry.date} className="flex min-h-[160px] flex-col items-center justify-end gap-2">
                  <div className="flex w-full items-end justify-center rounded-xl bg-black/20 p-1.5 sm:p-2">
                    <div
                      className="w-full max-w-[48px] rounded-xl bg-gradient-to-t from-gold-500 to-mint-400 transition-all duration-500"
                      style={{ height: `${Math.max((entry.total / maxRevenue) * 140, 6)}px` }}
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs text-slate-400">{entry.date}</span>
                  <span className="text-[10px] text-slate-500">{formatCurrency(entry.total)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Top products today" subtitle="Best sellers by quantity">
          <div className="space-y-2">
            {summary.topProducts.length === 0 ? (
              <p className="text-sm text-slate-400">No sales recorded today.</p>
            ) : (
              summary.topProducts.map((item, index) => (
                <div key={item.productId} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gold-500/20 text-xs font-bold text-gold-300">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{item.name}</p>
                      <p className="text-xs text-slate-500">SKU {item.sku}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium text-white">{item.quantity} sold</p>
                    <p className="text-xs text-slate-400">{formatCurrency(item.revenue)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Low stock alerts"
        subtitle="Reorder before shelves run empty"
        action={
          <Link to="/app/inventory" className="admin-btn admin-btn--ghost text-sm">
            Manage stock
          </Link>
        }
      >
        {summary.lowStockProducts.length === 0 ? (
          <p className="text-sm text-mint-300">All products are above their thresholds.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summary.lowStockProducts.map((product) => (
              <div key={product.id} className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4">
                <p className="font-semibold text-amber-50">{product.name}</p>
                <p className="mt-0.5 text-sm text-amber-100/70">{product.category?.name}</p>
                <p className="mt-2 text-sm text-amber-100">
                  <span className="font-bold">{product.stockQuantity}</span> in stock · threshold {product.lowStockThreshold}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
