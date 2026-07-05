import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import type { DashboardSummary } from '../api/types.js';
import { useAuth } from '../context/AuthContext.js';
import { formatCurrency } from '../lib/format.js';
import { defaultAppPath } from '../config/nav.js';
import './DashboardPage.css';

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

  if (user?.role !== 'ADMIN') {
    return <Navigate to={defaultAppPath(user?.role ?? 'CASHIER')} replace />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-300 bg-[#0a0f1c]">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-mint-400 border-t-transparent" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex h-screen items-center justify-center text-red-400 bg-[#0a0f1c]">
        Could not load dashboard. Check your connection and try again.
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const revenueStr = formatCurrency(summary.todaySales.revenue);
  const receiptsCount = summary.todaySales.count;
  const lowStockCount = summary.lowStockProducts.length;

  return (
    <div className="command-center">
      <header className="topbar">
        <Link to="/app" className="logo">
          <div className="mark">🛒</div>
          <div>FreshMart<small>COMMAND CENTER</small></div>
        </Link>
        <div className="searchbar">
          <span>🔍</span>
          <input placeholder="Search modules, products, receipts…" />
        </div>
        <div className="top-right">
          <Link to="/app/pos" className="cta">Open POS</Link>
          <div className="avatar">{user?.name?.charAt(0) ?? 'H'}</div>
        </div>
      </header>

      <main className="wrap">
        {/* GREETING + LIVE STATS */}
        <div className="hero">
          <div>
            <h1>{getGreeting()}, {user?.name?.split(' ')[0] ?? 'Admin'} 👋</h1>
            <p>Here's what's happening in your store today.</p>
          </div>
          <div className="hero-stats">
            <div className="mini">
              <div className="k">Today's revenue</div>
              <div className="v g">{revenueStr}</div>
            </div>
            <div className="mini">
              <div className="k">Receipts</div>
              <div className="v">{receiptsCount}</div>
            </div>
            <div className="mini">
              <div className="k">Low stock</div>
              <div className={`v ${lowStockCount > 0 ? 'r' : ''}`}>{lowStockCount}</div>
            </div>
          </div>
        </div>

        {/* SALES & CHECKOUT */}
        <section className="section">
          <div className="section-title">
            <h2>Sales & Checkout</h2>
            <div className="line"></div>
          </div>
          <div className="grid">
            <Link to="/app/pos" className="tile c-green">
              <div className="beam"></div>
              <div className="ic">🖥️</div>
              <div><div className="name">Point of Sale</div><div className="desc">Open register</div></div>
            </Link>
            <Link to="/app/sales" className="tile c-blue">
              <div className="beam"></div>
              <div className="ic">🧾</div>
              <div><div className="name">Sales History</div><div className="desc">Receipts & PDFs</div></div>
            </Link>
            <Link to="/app/sales" className="tile c-green">
              <div className="beam"></div>
              <div className="ic">↩️</div>
              <div><div className="name">Returns & Refunds</div><div className="desc">Process returns</div></div>
            </Link>
            <Link to="/app/pos" className="tile c-amber">
              <div className="beam"></div>
              <span className="badge hot">3</span>
              <div className="ic">⏸️</div>
              <div><div className="name">Held Orders</div><div className="desc">Parked carts</div></div>
            </Link>
            <Link to="/app/settings" className="tile c-purple">
              <div className="beam"></div>
              <div className="ic">💳</div>
              <div><div className="name">Payments</div><div className="desc">Methods & terminals</div></div>
            </Link>
            <Link to="/app/products" className="tile c-blue">
              <div className="beam"></div>
              <div className="ic">🎟️</div>
              <div><div className="name">Discounts</div><div className="desc">Coupons & promos</div></div>
            </Link>
          </div>
        </section>

        {/* STOCK & CATALOG */}
        <section className="section">
          <div className="section-title">
            <h2>Stock & Catalog</h2>
            <div className="line"></div>
          </div>
          <div className="grid">
            <Link to="/app/products" className="tile c-amber">
              <div className="beam"></div>
              <div className="ic">📦</div>
              <div><div className="name">Products</div><div className="desc">SKUs & pricing</div></div>
            </Link>
            <Link to="/app/inventory" className="tile c-red">
              <div className="beam"></div>
              {lowStockCount > 0 && <span className="badge hot">{lowStockCount}</span>}
              <div className="ic">⚠️</div>
              <div><div className="name">Low Stock</div><div className="desc">Reorder alerts</div></div>
            </Link>
            <Link to="/app/products" className="tile c-green">
              <div className="beam"></div>
              <div className="ic">🏷️</div>
              <div><div className="name">Categories</div><div className="desc">Organize catalog</div></div>
            </Link>
            <Link to="/app/suppliers" className="tile c-blue">
              <div className="beam"></div>
              <div className="ic">🚚</div>
              <div><div className="name">Suppliers</div><div className="desc">Vendors & POs</div></div>
            </Link>
            <Link to="/app/inventory" className="tile c-purple">
              <div className="beam"></div>
              <div className="ic">📥</div>
              <div><div className="name">Stock Intake</div><div className="desc">Receive goods</div></div>
            </Link>
            <Link to="/app/products" className="tile c-amber">
              <div className="beam"></div>
              <div className="ic">🔖</div>
              <div><div className="name">Barcodes & Labels</div><div className="desc">Print tags</div></div>
            </Link>
          </div>
        </section>

        {/* PEOPLE */}
        <section className="section">
          <div className="section-title">
            <h2>People</h2>
            <div className="line"></div>
          </div>
          <div className="grid">
            <Link to="/app/customers" className="tile c-blue">
              <div className="beam"></div>
              <div className="ic">👥</div>
              <div><div className="name">Customers</div><div className="desc">Loyalty & history</div></div>
            </Link>
            <Link to="/app/employees" className="tile c-green">
              <div className="beam"></div>
              <div className="ic">🧑‍💼</div>
              <div><div className="name">Cashiers</div><div className="desc">Staff & shifts</div></div>
            </Link>
            <Link to="/app/employees" className="tile c-purple">
              <div className="beam"></div>
              <div className="ic">🔐</div>
              <div><div className="name">Roles & Access</div><div className="desc">Permissions</div></div>
            </Link>
            <Link to="/app/customers" className="tile c-pink">
              <div className="beam"></div>
              <span className="badge new">NEW</span>
              <div className="ic">🎁</div>
              <div><div className="name">Loyalty Program</div><div className="desc">Points & rewards</div></div>
            </Link>
          </div>
        </section>

        {/* REPORTS & SETTINGS */}
        <section className="section">
          <div className="section-title">
            <h2>Reports & Settings</h2>
            <div className="line"></div>
          </div>
          <div className="grid">
            <Link to="/app/reports" className="tile c-green">
              <div className="beam"></div>
              <div className="ic">📊</div>
              <div><div className="name">Sales Reports</div><div className="desc">Daily & monthly</div></div>
            </Link>
            <Link to="/app/activity" className="tile c-amber">
              <div className="beam"></div>
              <div className="ic">💰</div>
              <div><div className="name">Cash Drawer</div><div className="desc">Open/close counts</div></div>
            </Link>
            <Link to="/app/reports" className="tile c-blue">
              <div className="beam"></div>
              <div className="ic">📈</div>
              <div><div className="name">Profit & Loss</div><div className="desc">Financial overview</div></div>
            </Link>
            <Link to="/app/settings" className="tile c-red">
              <div className="beam"></div>
              <div className="ic">🧮</div>
              <div><div className="name">Tax & VAT</div><div className="desc">Rates & filing</div></div>
            </Link>
            <Link to="/app/settings" className="tile c-purple">
              <div className="beam"></div>
              <div className="ic">⚙️</div>
              <div><div className="name">Settings</div><div className="desc">Store config</div></div>
            </Link>
            <Link to="/app/settings" className="tile c-blue">
              <div className="beam"></div>
              <div className="ic">☁️</div>
              <div><div className="name">Backup & Restore</div><div className="desc">Cloud sync</div></div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
