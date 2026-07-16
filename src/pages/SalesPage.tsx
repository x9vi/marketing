import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, apiUrl } from '../api/client.js';
import type { Sale } from '../api/types.js';
import './SalesPage.css';

/* ─── SVG Icons ─── */
const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconPrint = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);
const IconRefund = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
    <path d="M12 7v5l4 2"/>
  </svg>
);
const IconVoid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="m4.9 4.9 14.2 14.2"/>
  </svg>
);
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconArrowRefund = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14 4 9l5-5"/>
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>
  </svg>
);

const money = (n: number | string | undefined) => {
  const v = typeof n === 'string' ? Number(n) : n ?? 0;
  return '$' + v.toFixed(2);
};

function formatSaleDate(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function paymentIcon(methods: string[]) {
  if (methods.length > 1) return { icon: '🔀', label: 'Split' };
  const m = methods[0] ?? 'CASH';
  return m === 'CARD' ? { icon: '💳', label: 'Card' } : { icon: '💵', label: 'Cash' };
}

type BadgeKey = 'COMPLETED' | 'REFUNDED' | 'VOIDED' | 'HELD';
const badgeClass: Record<BadgeKey, string> = {
  COMPLETED: 'sh-b-green',
  REFUNDED: 'sh-b-orange',
  VOIDED: 'sh-b-red',
  HELD: 'sh-b-blue',
};
const badgeLabel: Record<BadgeKey, string> = {
  COMPLETED: 'Completed',
  REFUNDED: 'Refunded',
  VOIDED: 'Voided',
  HELD: 'Held',
};

const PAGE_SIZE = 20;

/* ─── Toast ─── */
let _setToasts: React.Dispatch<React.SetStateAction<string[]>> | null = null;
function showToast(msg: string) {
  _setToasts?.((prev) => [...prev, msg]);
  setTimeout(() => _setToasts?.((prev) => prev.filter((m) => m !== msg)), 2000);
}

function ToastStack() {
  const [toasts, setToasts] = useState<string[]>([]);
  useEffect(() => { _setToasts = setToasts; return () => { _setToasts = null; }; }, []);
  return (
    <div className="sh-toast-container">
      {toasts.map((msg, i) => (
        <div key={i} className="sh-toast sh-toast-in">{msg}</div>
      ))}
    </div>
  );
}

/* ─── Main Component ─── */
export function SalesPage() {
  // ── Data
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── Filters
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [cashierFilter, setCashierFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // ── Cashier list (extracted from loaded sales)
  const [cashiers, setCashiers] = useState<string[]>([]);

  // ── Summary stats
  const [todaySales, setTodaySales] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [allRevenue, setAllRevenue] = useState(0);
  const [avgSale, setAvgSale] = useState(0);
  const [refundedTotal, setRefundedTotal] = useState(0);
  const [refundCount, setRefundCount] = useState(0);

  // ── Drawer
  const [drawerSale, setDrawerSale] = useState<Sale | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Menu
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) {
        params.set('from', dateFrom);
        // Set 'to' to same day end
        const d = new Date(dateFrom);
        d.setHours(23, 59, 59);
        params.set('to', d.toISOString());
      }
      if (cashierFilter) params.set('cashierId', cashierFilter);
      if (paymentFilter) params.set('paymentMethod', paymentFilter);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));

      // Use reports/sales-detail for filtering; fall back to /sales for basic load
      const qs = params.toString();
      const result = await apiFetch<{ sales: Sale[]; total: number }>(`/reports/sales-detail?${qs}`);
      setSales(result.sales ?? []);
      setTotal(result.total ?? 0);

      // Extract cashier names
      const names = Array.from(new Set((result.sales ?? []).map((s) => s.user?.name).filter(Boolean) as string[]));
      setCashiers((prev) => Array.from(new Set([...prev, ...names])));
    } catch {
      // Fallback: basic /sales endpoint
      try {
        const fallback = await apiFetch<{ sales: Sale[] }>('/sales');
        setSales(fallback.sales ?? []);
        setTotal(fallback.sales?.length ?? 0);
        const names = Array.from(new Set((fallback.sales ?? []).map((s) => s.user?.name).filter(Boolean) as string[]));
        setCashiers(names);
      } catch {
        setSales([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [dateFrom, cashierFilter, paymentFilter, page]);

  // Load summary stats once
  const loadStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [todayResult, allResult] = await Promise.allSettled([
        apiFetch<{ revenue: number; transactions: number; avgSale: number; refunds: number }>(
          `/reports/dashboard?from=${today}&to=${today}`
        ),
        apiFetch<{ revenue: number; transactions: number; avgSale: number; refunds: number }>(
          `/reports/dashboard?from=2000-01-01&to=${new Date().toISOString().slice(0, 10)}`
        ),
      ]);

      if (todayResult.status === 'fulfilled') {
        setTodaySales(todayResult.value.transactions ?? 0);
        setTodayRevenue(todayResult.value.revenue ?? 0);
      }
      if (allResult.status === 'fulfilled') {
        setAllRevenue(allResult.value.revenue ?? 0);
        setAvgSale(allResult.value.avgSale ?? 0);
        setRefundedTotal(allResult.value.refunds ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { void loadSales(); }, [loadSales]);
  useEffect(() => { void loadStats(); }, [loadStats]);

  // Count refunds from loaded sales
  useEffect(() => {
    setRefundCount(sales.filter((s) => s.status === 'REFUNDED').length);
  }, [sales]);

  // Close menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ESC closes drawer
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') closeDrawer(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Filters applied client-side on query (receipt/cashier/product name)
  const filtered = query.trim()
    ? sales.filter((s) => {
        const q = query.toLowerCase();
        return (
          s.receiptNumber.toLowerCase().includes(q) ||
          s.user?.name.toLowerCase().includes(q) ||
          s.customer?.name?.toLowerCase().includes(q) ||
          (s.items || []).some((item) => item.productName.toLowerCase().includes(q))
        );
      })
    : sales;

  // Status filter client-side
  const displayed = statusFilter
    ? filtered.filter((s) => s.status === statusFilter.toUpperCase())
    : filtered;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ─── Drawer ─── */
  function openDrawer(sale: Sale) {
    setDrawerSale(sale);
    setDrawerOpen(true);
    setOpenMenu(null);
    // Lock the page scroll so the main scrollbar disappears
    document.body.style.overflow = 'hidden';
    // Always scroll drawer body to top so receipt starts at the top
    requestAnimationFrame(() => {
      const body = document.querySelector('.drawer__body') as HTMLElement | null;
      if (body) body.scrollTop = 0;
    });
  }
  function closeDrawer() {
    setDrawerOpen(false);
    // Restore page scroll
    document.body.style.overflow = '';
    // Wait for 300ms close animation before unmounting content
    setTimeout(() => setDrawerSale(null), 320);
  }

  /* ─── Export ─── */
  function handleExport() {
    window.open(apiUrl('/reports/export?format=excel'), '_blank');
    showToast('Downloading Excel export…');
  }

  /* ─── Reset ─── */
  function resetFilters() {
    setDateFrom('');
    setCashierFilter('');
    setPaymentFilter('');
    setStatusFilter('');
    setQuery('');
    setPage(1);
  }

  /* ─── Render ─── */
  return (
    <>
      <div className="sh-root">
        {/* Page Header */}
      <div className="sh-page-head">
        <p className="sh-eyebrow">Transactions</p>
        <h1 className="sh-page-title">Sales History</h1>
        <p className="sh-page-sub">Browse, search, and manage completed sales.</p>
      </div>

      {/* Summary Cards */}
      <div className="sh-section-label">Overview</div>
      <div className="sh-cards">
        <StatCard icon="🛒" label="Today's Sales"   value={money(todayRevenue)} delta={`${todaySales} receipt${todaySales !== 1 ? 's' : ''} today`} up glowColor="#22a366" />
        <StatCard icon="💰" label="Total Revenue"   value={money(allRevenue)}   delta="All time"            up glowColor="#22a366" />
        <StatCard icon="🧾" label="Receipts Today"  value={String(todaySales)}  delta="Ready to sell"       up glowColor="#4a90d9" />
        <StatCard icon="📊" label="Average Sale"    value={money(avgSale)}      delta={avgSale > 0 ? '↑ per transaction' : '—'} up={avgSale > 0} glowColor="#a855f7" />
        <StatCard icon="↩️" label="Refunded Amount" value={money(refundedTotal)} delta={`${refundCount} refund${refundCount !== 1 ? 's' : ''}`} up={refundedTotal === 0} glowColor="#d9534f" />
      </div>

      {/* Transactions Panel */}
      <div className="sh-section-label">Transactions</div>
      <div className="sh-panel">
        {/* Toolbar */}
        <div className="sh-toolbar">
          <div className="sh-search">
            <span className="sh-search-mag">🔍</span>
            <input
              id="sh-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search receipt number, product, or cashier…"
            />
          </div>
          <div className="sh-filters">
            <div className="sh-field">
              <label>Date</label>
              <input
                id="sh-filter-date"
                className="sh-ctrl"
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              />
            </div>
            <div className="sh-field">
              <label>Cashier</label>
              <select
                id="sh-filter-cashier"
                className="sh-ctrl"
                value={cashierFilter}
                onChange={(e) => { setCashierFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Cashiers</option>
                {cashiers.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sh-field">
              <label>Payment Method</label>
              <select
                id="sh-filter-payment"
                className="sh-ctrl"
                value={paymentFilter}
                onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Methods</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
              </select>
            </div>
            <div className="sh-field">
              <label>Status</label>
              <select
                id="sh-filter-status"
                className="sh-ctrl"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="COMPLETED">Completed</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>
            <div className="sh-spacer" />
            <button id="sh-btn-reset" className="sh-btn sh-btn-ghost" onClick={resetFilters}>↺ Reset</button>
            <button id="sh-btn-export" className="sh-btn sh-btn-primary" onClick={handleExport}>⤓ Export</button>
          </div>
        </div>

        {/* Table */}
        <div className="sh-table-wrap">
          <table className="sh-table" id="sh-sales-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date &amp; Time</th>
                <th>Cashier</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th className="sh-th-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j}><div className="sh-skeleton" style={{ width: j === 7 ? 80 : undefined }} /></td>
                    ))}
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="sh-empty">
                      <div className="sh-empty-icon">🧾</div>
                      <div className="sh-empty-title">No sales found</div>
                      <div className="sh-empty-sub">Try adjusting your filters or search query.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map((sale) => {
                  const { date, time } = formatSaleDate(sale.createdAt);
                  const methods = (sale.payments ?? []).map((p) => p.method);
                  const pay = paymentIcon(methods);
                  const statusKey = (sale.status as BadgeKey) in badgeClass ? (sale.status as BadgeKey) : 'COMPLETED';
                  return (
                    <tr key={sale.id}>
                      <td className="sh-rcpt">{sale.receiptNumber}</td>
                      <td className="sh-cell-date">
                        <div className="sh-date-d">{date}</div>
                        <div className="sh-date-t">{time}</div>
                      </td>
                      <td>
                        <div className="sh-cashier">
                          <span className="sh-avatar">{initials(sale.user?.name ?? 'AU')}</span>
                          {sale.user?.name ?? '—'}
                        </div>
                      </td>
                      <td>{(sale.items || []).reduce((s, i) => s + i.quantity, 0)} items</td>
                      <td className="sh-total">{money(sale.total)}</td>
                      <td><span className="sh-pay">{pay.icon} {pay.label}</span></td>
                      <td>
                        <span className={`sh-badge ${badgeClass[statusKey]}`}>
                          <span className="sh-badge-dot" />
                          {badgeLabel[statusKey]}
                        </span>
                      </td>
                      <td>
                        <div className="sh-actions" style={{ zIndex: openMenu === sale.id ? 30 : 1 }} ref={openMenu === sale.id ? menuRef : null}>
                          <button
                            className="sh-icon-btn sh-view"
                            title="View Details"
                            id={`sh-view-${sale.id}`}
                            onClick={() => openDrawer(sale)}
                          ><IconEye /></button>
                          <a
                            href={apiUrl(`/sales/${sale.id}/receipt.pdf`)}
                            target="_blank"
                            rel="noreferrer"
                            title="Download PDF"
                          >
                            <button className="sh-icon-btn" id={`sh-pdf-${sale.id}`}><IconPrint /></button>
                          </a>
                          <button
                            className="sh-icon-btn sh-refund"
                            title="View / Refund"
                            id={`sh-refund-${sale.id}`}
                            onClick={() => { openDrawer(sale); showToast('Open the receipt to process a refund.'); }}
                          ><IconRefund /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="sh-tfoot">
          <div className="sh-tfoot-info">
            {!loading && (
              <>
                Showing <strong>{displayed.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</strong> of <strong>{total}</strong> receipt{total !== 1 ? 's' : ''}
              </>
            )}
          </div>
          <div className="sh-pager">
            <button id="sh-page-prev" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  id={`sh-page-${p}`}
                  className={page === p ? 'sh-pager-active' : ''}
                  onClick={() => setPage(p)}
                >{p}</button>
              );
            })}
            {totalPages > 5 && page < totalPages && <button disabled>…</button>}
            <button id="sh-page-next" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          </div>
        </div>
      </div>
    </div>

    {/* Detail Drawer */}
    <div className={`drawer-overlay${drawerOpen ? ' open' : ''}`} onClick={closeDrawer}>
      <aside 
        className={`drawer${drawerOpen ? ' drawer--open' : ''}${(!drawerOpen && drawerSale !== null) ? ' drawer--closing' : ''}`} 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="drawerTitle" 
        onClick={e => e.stopPropagation()}
      >
        {drawerSale && <ReceiptDrawer sale={drawerSale} onClose={closeDrawer} />}
      </aside>
    </div>

    <ToastStack />
  </>
  );
}

/* ─── Stat Card ─── */
function StatCard({ icon, label, value, delta, up, glowColor = '#22c55e' }: {
  icon: string; label: string; value: string; delta: string; up: boolean; glowColor?: string;
}) {
  return (
    <div className="sh-card">
      <div className="sh-card-glow" style={{ background: glowColor }} />
      <div className="sh-card-ic">{icon}</div>
      <div className="sh-card-label">{label}</div>
      <div className="sh-card-value">{value}</div>
      <div className={`sh-card-delta ${up ? 'sh-up' : 'sh-down'}`}>{delta}</div>
    </div>
  );
}

/* ─── Receipt Drawer ─── */
function ReceiptDrawer({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { date, time } = formatSaleDate(sale.createdAt);
  const subtotal = Number(sale.subtotal);
  const discount = Number(sale.discountAmount) + Number(sale.couponDiscount);
  const tax = Number(sale.taxAmount);
  const total = Number(sale.total);
  const change = Number(sale.changeAmount);
  const methods = (sale.payments ?? []).map((p) => p.method);
  const pay = paymentIcon(methods);
  const statusKey = (sale.status as BadgeKey) in badgeClass ? (sale.status as BadgeKey) : 'COMPLETED';

  return (
    <>
      {/* Header */}
      <div className="drawer__header">
        <div>
          <div className="drawer__title" id="drawerTitle">Receipt #{sale.receiptNumber}</div>
          <div className="drawer__subtitle">{date} · {time}</div>
        </div>
        <button className="drawer__close" onClick={onClose} aria-label="Close">&times;</button>
      </div>

      {/* Body */}
      <div className="drawer__body">
        {/* Compact 2-column info */}
        <div className="info-grid">
          <div className="info-item">
            <span className="label">Cashier</span>
            <span className="value">{sale.user?.name ?? '—'}</span>
          </div>
          <div className="info-item">
            <span className="label">Customer</span>
            <span className="value">{sale.customer?.name ?? 'Walk-in'}</span>
          </div>
          <div className="info-item">
            <span className="label">Payment Method</span>
            <span className="value">{pay.icon} {pay.label}</span>
          </div>
          <div className="info-item">
            <span className="label">Status</span>
            <span className={`status-badge ${statusKey.toLowerCase()}`}>{badgeLabel[statusKey]}</span>
          </div>
        </div>

        {/* Purchased items */}
        <div>
          <div className="section-title">Purchased Items</div>
          {(!sale.items || sale.items.length === 0) ? (
            <div className="no-items">No items</div>
          ) : (
            <table className="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Qty</th>
                  <th className="num">Price</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.productName}</td>
                    <td className="num">{item.quantity}</td>
                    <td className="num">{money(item.unitPrice)}</td>
                    <td className="num">{money(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Compact totals */}
        <div className="totals">
          <div className="totals-row"><span>Subtotal</span><span className="amount">{money(subtotal)}</span></div>
          <div className="totals-row"><span>Discount</span><span className="amount">{discount > 0 ? `−${money(discount)}` : money(0)}</span></div>
          <div className="totals-row"><span>Tax</span><span className="amount">{money(tax)}</span></div>
          {sale.pointsRedeemed > 0 && (
            <div className="totals-row"><span>Points Redeemed</span><span className="amount">−{money(sale.pointsRedeemed)}</span></div>
          )}
          <div className="totals-row grand"><span>Grand Total</span><span className="amount">{money(total)}</span></div>
          <div className="totals-row"><span>Change Returned</span><span className="amount">{money(change)}</span></div>
        </div>
      </div>

      {/* Footer */}
      <div className="drawer__footer">
        <a href={apiUrl(`/sales/${sale.id}/receipt.pdf`)} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'flex' }}>
          <button className="btn" style={{ width: '100%' }}>🖨 Print</button>
        </a>
        <a href={apiUrl(`/sales/${sale.id}/receipt.pdf`)} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'flex' }}>
          <button className="btn btn--primary" style={{ width: '100%' }}>⬇ PDF</button>
        </a>
        <button className="btn btn--danger" onClick={() => showToast('Refund flow — coming soon')}>↩ Refund</button>
      </div>
    </>
  );
}
