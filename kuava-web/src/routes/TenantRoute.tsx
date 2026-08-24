import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole } from '../types';

/**
 * Só deixa passar utilizadores de um tenant (todos exceto SUPERADMIN) — as
 * páginas normais (POS, inventário, painel...) chamam endpoints que exigem
 * tenant_id, e o superadmin não tem nenhum. Usar sempre dentro de
 * ProtectedRoute.
 */
export default function TenantRoute() {
  const role = useAuthStore((state) => state.user?.role);

  if (role === UserRole.SUPERADMIN) {
    return <Navigate to="/superadmin" replace />;
  }

  return <Outlet />;
}
