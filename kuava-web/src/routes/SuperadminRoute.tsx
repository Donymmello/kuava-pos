import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole } from '../types';

/**
 * Só deixa passar utilizadores SUPERADMIN — usar sempre dentro de
 * ProtectedRoute (que já garante que há sessão). Um utilizador normal (de
 * um tenant) que tente aceder a /superadmin é mandado para /pos.
 */
export default function SuperadminRoute() {
  const role = useAuthStore((state) => state.user?.role);

  if (role !== UserRole.SUPERADMIN) {
    return <Navigate to="/pos" replace />;
  }

  return <Outlet />;
}
