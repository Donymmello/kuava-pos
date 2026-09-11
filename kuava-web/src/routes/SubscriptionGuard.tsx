import { useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Navigate, Outlet } from 'react-router-dom';
import { useSubscriptionStore } from '../store/useSubscriptionStore';

/**
 * Envolve as páginas normais do tenant (POS, painel, inventário...):
 * redireciona para /assinatura quando o estabelecimento não tem acesso
 * ativo (trial expirado e sem plano pago em vigor). Usar sempre dentro de
 * TenantRoute. Falha aberta (deixa passar) se não conseguir carregar o
 * estado, ver o comentário em useSubscriptionStore.refresh().
 */
export default function SubscriptionGuard() {
  const status = useSubscriptionStore((state) => state.status);
  const hasLoaded = useSubscriptionStore((state) => state.hasLoaded);
  const refresh = useSubscriptionStore((state) => state.refresh);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!hasLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status && !status.hasAccess) {
    return <Navigate to="/assinatura" replace />;
  }

  return <Outlet />;
}
