import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import type { DashboardSummary } from '../api/types.js';
import { useAuth } from '../context/AuthContext.js';
import { useSettings } from '../context/SettingsContext.js';
import { formatCurrency } from '../lib/format.js';
import { defaultAppPath } from '../config/nav.js';
import './DashboardPage.css';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
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
      <header className="header">
        {/* Left */}
        <Link to="/app" className="brand">
          <div className="logo">🛒</div>
          <div className="title">
            <strong>{settings.store.name}</strong>
            <span>COMMAND CENTER</span>
          </div>
        </Link>

        {/* Center */}
        <div className="search">
          <span>🔍</span>
          <input type="text" placeholder="Search modules, products, receipts..." />
        </div>

        {/* Right */}
        <div className="actions">
          <Link to="/app/pos" className="btn btn-primary">Open POS</Link>
          <button type="button" onClick={() => void logout()} className="btn btn-secondary">
            Sign out
          </button>
          <div className="avatar">{user?.name?.charAt(0).toUpperCase() ?? 'H'}</div>
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
            <div className="mini">
              <div className="k">Active checkouts</div>
              <div className="v">{summary.activeCashiers}</div>
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
              <div><div className="name">Sales History</div><div className="desc">Browse receipts</div></div>
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
              <div><div className="name">Products</div><div className="desc">Edit catalog & prices</div></div>
            </Link>
            <Link to="/app/inventory" className="tile c-purple">
              <div className="beam"></div>
              {lowStockCount > 0 && <span className="badge hot">{lowStockCount}</span>}
              <div className="ic">📥</div>
              <div><div className="name">Stock In</div><div className="desc">Receive deliveries</div></div>
            </Link>
            <Link to="/app/suppliers" className="tile c-blue">
              <div className="beam"></div>
              <div className="ic">🚚</div>
              <div><div className="name">Suppliers</div><div className="desc">Vendor contacts</div></div>
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
              <div><div className="name">Team</div><div className="desc">Manage staff access</div></div>
            </Link>
          </div>
        </section>

        {/* REPORTS & SETTINGS */}
        <section className="section">
          <div className="section-title">
            <h2>Reports, Activity & Settings</h2>
            <div className="line"></div>
          </div>
          <div className="grid">
            <Link to="/app/activity" className="tile c-amber">
              <div className="beam"></div>
              <div className="ic">📊</div>
              <div><div className="name">Activity</div><div className="desc">Audit & sessions</div></div>
            </Link>
            <Link to="/app/settings" className="tile c-purple">
              <div className="beam"></div>
              <div className="ic">⚙️</div>
              <div><div className="name">Settings</div><div className="desc">System preferences</div></div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
