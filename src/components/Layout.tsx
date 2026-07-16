import { Link, Outlet, useLocation } from 'react-router-dom';
import { SupermarketBackground } from './SupermarketBackground.js';
import { useAuth } from '../context/AuthContext.js';

export function Layout() {
  const location = useLocation();
  const { logout } = useAuth();
  
  const isDashboard = location.pathname === '/app' || location.pathname === '/app/';
  const isPos = location.pathname === '/app/pos';

  return (
    <div className="min-h-screen bg-[var(--bg-tint)] text-[var(--text-body)] flex flex-col overflow-hidden relative">
      {!isDashboard && !isPos && (
        <div className="absolute top-4 left-4 z-50 flex gap-3">
          <Link to="/app" className="rounded-xl bg-white/80 px-4 py-2 text-sm font-medium text-[var(--text-heading)] backdrop-blur-md border border-[var(--border)] shadow-sm hover:bg-white transition flex items-center gap-2">
            ← Command Center
          </Link>
          <button type="button" onClick={() => void logout()} className="rounded-xl bg-white/80 px-4 py-2 text-sm font-medium text-[var(--accent-red)] backdrop-blur-md border border-[var(--border)] shadow-sm hover:bg-white transition">
            Sign out
          </button>
        </div>
      )}
      <main className="flex-1 flex flex-col overflow-auto relative z-10 scroll-smooth" style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}>
        <Outlet />
      </main>
    </div>
  );
}
