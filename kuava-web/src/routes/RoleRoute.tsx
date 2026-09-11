import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole } from '../types';

interface RoleRouteProps {
  roles: UserRole[];
}

/**
 * Só deixa passar utilizadores cujo role esteja em `roles`. Usar sempre
 * dentro de TenantRoute (que já garante um utilizador de tenant, não
 * SUPERADMIN). Quem não tem permissão é mandado para /pos, o mesmo destino
 * para onde o link já fica escondido no menu, isto só reforça ao nível das
 * rotas o que o menu já esconde, para a página nem chegar a abrir a quem
 * não devia vê-la.
 */
export default function RoleRoute({ roles }: RoleRouteProps) {
  const role = useAuthStore((state) => state.user?.role);

  if (!role || !roles.includes(role)) {
    return <Navigate to="/pos" replace />;
  }

  return <Outlet />;
}
