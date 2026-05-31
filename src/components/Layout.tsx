import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import type { Role } from '../api/types.js';

const navByRole: Record<Role | 'ALL', Array<{ to: string; label: string; roles?: Role[] }>> = {
  ALL: [
    { to: '/app', label: 'Dashboard' },
    { to: '/app/products', label: 'Products' },
    { to: '/app/pos', label: 'POS' },
    { to: '/app/inventory', label: 'Inventory' },
    { to: '/app/reports', label: 'Reports' },
    { to: '/app/customers', label: 'Customers' },
    { to: '/app/employees', label: 'Employees' },
    { to: '/app/activity', label: 'Activity' }
  ],
  ADMIN: [],
  CASHIER: [],
  STOCK_MANAGER: []
};

function visibleLinks(role: Role) {
  return navByRole.ALL.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  });
}

export function Layout() {
  const { user, logout } = useAuth();
  const links = visibleLinks(user?.role ?? 'CASHIER');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(126,224,197,0.18),_transparent_28%),linear-gradient(180deg,#06101d_0%,#0b1726_45%,#08111d_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-white/10 bg-black/20 px-5 py-5 backdrop-blur lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4 lg:block">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">Supermarket OS</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">Store Control</h1>
              <p className="mt-1 text-sm text-slate-400">{user?.name} · {user?.role}</p>
            </div>
            <button onClick={() => void logout()} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
              Sign out
            </button>
          </div>
          <nav className="mt-8 grid gap-2 lg:gap-3">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/app'}
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-gold-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
