import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import SuperadminRoute from './SuperadminRoute';
import TenantRoute from './TenantRoute';
import AppLayout from '../components/common/AppLayout';
import SuperadminLayout from '../components/common/SuperadminLayout';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import LandingPage from '../pages/landing/LandingPage';
import TermosPage from '../pages/legal/TermosPage';
import PoliticaPage from '../pages/legal/PoliticaPage';
import PosPage from '../pages/pos/PosPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import InvoicesPage from '../pages/invoices/InvoicesPage';
import SettingsPage from '../pages/settings/SettingsPage';
import SuperadminTenantsPage from '../pages/superadmin/SuperadminTenantsPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/termos" element={<TermosPage />} />
      <Route path="/politica" element={<PoliticaPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<SuperadminRoute />}>
          <Route element={<SuperadminLayout />}>
            <Route path="/superadmin" element={<SuperadminTenantsPage />} />
          </Route>
        </Route>

        <Route element={<TenantRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/pos" element={<PosPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}
