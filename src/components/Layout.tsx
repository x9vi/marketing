import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { SupermarketBackground } from './SupermarketBackground.js';
import { NavIcon } from './NavIcon.js';
import { defaultAppPath, navItemsForRole } from '../config/nav.js';
import type { Role } from '../api/types.js';

function roleLabel(role: Role) {
  if (role === 'STOCK_MANAGER') return 'Stock manager';
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user?.role ?? 'CASHIER';
  const groups = navItemsForRole(role);

  const currentTitle =
    groups.flatMap((g) => g.items).find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)))?.label ??
    'FreshMart';

  const isPos = location.pathname === '/app/pos';

  if (isPos) {
    return (
      <SupermarketBackground variant="app" className="min-h-screen text-slate-100 flex flex-col overflow-hidden p-2">
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </SupermarketBackground>
    );
  }

  return (
    <SupermarketBackground variant="app" className="admin-shell min-h-screen text-slate-100">
      <div className="admin-shell__frame">
        <aside className={`admin-sidebar ${mobileOpen ? 'admin-sidebar--open' : ''}`}>
          <div className="admin-sidebar__brand">
            <div className="admin-sidebar__logo" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="10" fill="currentColor" fillOpacity="0.15" />
                <path d="M10 12h12l-1.2 7H11.2L9 8H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="22" r="1.5" fill="currentColor" />
                <circle cx="20" cy="22" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="admin-sidebar__chain">FreshMart</p>
              <p className="admin-sidebar__tagline">Store control</p>
            </div>
          </div>

          <div className="admin-sidebar__store">
            <span className="admin-sidebar__store-dot" />
            Single-store installation
          </div>

          <nav className="admin-sidebar__nav">
            {groups.map((group) => (
              <div key={group.title} className="admin-sidebar__group">
                <p className="admin-sidebar__group-title">{group.title}</p>
                <ul className="admin-sidebar__list">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) => `admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`}
                      >
                        <span className="admin-nav-link__icon">
                          <NavIcon name={item.icon} />
                        </span>
                        <span className="admin-nav-link__text">
                          <span className="admin-nav-link__label">{item.label}</span>
                          <span className="admin-nav-link__desc">{item.description}</span>
                        </span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="admin-sidebar__footer">
            <div className="admin-sidebar__user">
              <span className="admin-sidebar__avatar">{user?.name?.charAt(0) ?? '?'}</span>
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{user?.name}</p>
                <p className="truncate text-xs text-slate-400">{roleLabel(role)}</p>
              </div>
            </div>
            <button type="button" onClick={() => void logout()} className="admin-sidebar__logout">
              Sign out
            </button>
          </div>
        </aside>

        {mobileOpen ? (
          <button type="button" className="admin-shell__backdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
        ) : null}

        <div className="admin-main">
          <header className="admin-topbar">
            <div className="admin-topbar__left">
              <button type="button" className="admin-topbar__menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
              <div>
                <p className="admin-topbar__crumb">FreshMart · {roleLabel(role)}</p>
                <h2 className="admin-topbar__title">{currentTitle}</h2>
              </div>
            </div>
            <div className="admin-topbar__actions">
              {role === 'ADMIN' || role === 'CASHIER' ? (
                <Link to="/app/pos" className="admin-topbar__cta">
                  Open POS
                </Link>
              ) : null}
              <Link to={defaultAppPath(role)} className="admin-topbar__ghost">
                Home
              </Link>
            </div>
          </header>

          <main className="admin-content">
            <Outlet />
          </main>
        </div>
      </div>
    </SupermarketBackground>
  );
}
