import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { SupermarketBackground } from './SupermarketBackground.js';
import { defaultAppPath } from '../config/nav.js';
import type { Role } from '../api/types.js';

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <SupermarketBackground variant="app" className="flex min-h-screen items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm text-slate-200 backdrop-blur-md">
          Loading session...
        </div>
      </SupermarketBackground>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={defaultAppPath(user.role)} replace />;
  }

  return <Outlet />;
}
