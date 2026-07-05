import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { Layout } from './components/Layout.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ProductsPage } from './pages/ProductsPage.js';
import { POSPage } from './pages/POSPage.js';
import { InventoryPage } from './pages/InventoryPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { CustomersPage } from './pages/CustomersPage.js';
import { EmployeesPage } from './pages/EmployeesPage.js';
import { ActivityPage } from './pages/ActivityPage.js';
import { SuppliersPage } from './pages/SuppliersPage.js';
import { SalesPage } from './pages/SalesPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import type { Role } from './api/types.js';

function AppRoutes() {
  const { user } = useAuth();
  const home = user ? '/app' : '/login';

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route element={<ProtectedRoute roles={['ADMIN', 'STOCK_MANAGER'] as Role[]} />}>
            <Route path="products" element={<ProductsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ADMIN', 'CASHIER'] as Role[]} />}>
            <Route path="pos" element={<POSPage />} />
            <Route path="customers" element={<CustomersPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ADMIN'] as Role[]} />}>
            <Route path="sales" element={<SalesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to={home} replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
