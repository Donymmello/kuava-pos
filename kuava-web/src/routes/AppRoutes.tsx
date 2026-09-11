import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import SuperadminRoute from './SuperadminRoute';
import TenantRoute from './TenantRoute';
import SubscriptionGuard from './SubscriptionGuard';
import RoleRoute from './RoleRoute';
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
import SubscriptionPage from '../pages/subscription/SubscriptionPage';
import SuperadminTenantsPage from '../pages/superadmin/SuperadminTenantsPage';
import { UserRole } from '../types';

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
          <Route path="/assinatura" element={<SubscriptionPage />} />

          <Route element={<SubscriptionGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/pos" element={<PosPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />

              <Route element={<RoleRoute roles={[UserRole.ADMIN, UserRole.MANAGER]} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
              </Route>

              <Route element={<RoleRoute roles={[UserRole.ADMIN]} />}>
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}
