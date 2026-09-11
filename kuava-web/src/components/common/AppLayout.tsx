import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import { useAuthStore } from '../../store/useAuthStore';
import { useOfflineStore } from '../../store/useOfflineStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useColorMode } from '../../theme/ColorModeContext';
import { SubscriptionStatus, USER_ROLE_LABELS, UserRole } from '../../types';

// Só o ADMIN vê este aviso, é quem trata da assinatura, não a caixa/gerente
// do dia a dia. Lê o estado já carregado pelo SubscriptionGuard (que
// envolve estas páginas), sem precisar de outro pedido à API.
function trialBannerFrom(
  status: SubscriptionStatus | null,
  userRole: UserRole | undefined,
): { label: string; color: 'warning' | 'error' } | null {
  if (userRole !== UserRole.ADMIN || !status) {
    return null;
  }

  const now = Date.now();
  const subscriptionValid =
    Boolean(status.subscriptionExpiresAt) && new Date(status.subscriptionExpiresAt as string).getTime() > now;

  if (subscriptionValid || !status.trialEndsAt) {
    return null;
  }

  const daysLeft = Math.ceil((new Date(status.trialEndsAt).getTime() - now) / (24 * 60 * 60 * 1000));

  if (daysLeft > 0) {
    return {
      label: `Teste gratuito: falta${daysLeft === 1 ? '' : 'm'} ${daysLeft} dia${daysLeft === 1 ? '' : 's'}`,
      color: 'warning',
    };
  }

  return { label: 'Teste gratuito terminado: escolha um plano', color: 'error' };
}

interface NavItem {
  to: string;
  label: string;
  roles: UserRole[] | null;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/pos', label: 'Ponto de Venda', roles: null },
  { to: '/invoices', label: 'Faturas', roles: null },
  { to: '/inventory', label: 'Inventário', roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { to: '/dashboard', label: 'Painel', roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { to: '/settings', label: 'Definições', roles: [UserRole.ADMIN] },
  { to: '/assinatura', label: 'Assinatura', roles: [UserRole.ADMIN] },
];

export default function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { mode, toggleColorMode } = useColorMode();
  const location = useLocation();
  const navigate = useNavigate();

  const isOnline = useOfflineStore((state) => state.isOnline);
  const pendingCount = useOfflineStore((state) => state.pendingCount);
  const isSyncing = useOfflineStore((state) => state.isSyncing);
  const syncNow = useOfflineStore((state) => state.syncNow);

  const subscriptionStatus = useSubscriptionStore((state) => state.status);
  const trialBanner = trialBannerFrom(subscriptionStatus, user?.role);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 0.5 }}>
          <PointOfSaleIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ mr: 3, whiteSpace: 'nowrap' }}>
            Kuava POS
          </Typography>

          <Stack direction="row" spacing={0.5} sx={{ flex: 1 }}>
            {visibleItems.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <Button
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  size="small"
                  variant={isActive ? 'contained' : 'text'}
                  color={isActive ? 'primary' : 'inherit'}
                  sx={{ color: isActive ? undefined : 'text.secondary' }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Stack>

          {trialBanner && (
            <Chip
              size="small"
              icon={<PaidOutlinedIcon />}
              label={trialBanner.label}
              color={trialBanner.color}
              variant="outlined"
              onClick={() => navigate('/assinatura')}
              sx={{ mr: 1, cursor: 'pointer' }}
            />
          )}

          {!isOnline && (
            <Chip
              size="small"
              icon={<CloudOffOutlinedIcon />}
              label="Offline"
              color="warning"
              variant="outlined"
              sx={{ mr: 1 }}
            />
          )}

          {pendingCount > 0 && (
            <Tooltip title={isOnline ? 'Sincronizar vendas pendentes agora' : 'Aguarda ligação para sincronizar'}>
              <span>
                <Chip
                  size="small"
                  icon={isSyncing ? <CircularProgress size={14} /> : <SyncOutlinedIcon />}
                  label={`${pendingCount} venda${pendingCount === 1 ? '' : 's'} por sincronizar`}
                  color="info"
                  variant="outlined"
                  onClick={isOnline && !isSyncing ? () => syncNow() : undefined}
                  sx={{ mr: 1, cursor: isOnline && !isSyncing ? 'pointer' : 'default' }}
                />
              </span>
            </Tooltip>
          )}

          <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo escuro'}>
            <IconButton onClick={toggleColorMode} size="small" sx={{ mr: 1 }}>
              {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {user && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" noWrap sx={{ maxWidth: 160 }} title={user.name}>
                  {user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {USER_ROLE_LABELS[user.role]}
                </Typography>
              </Box>
              <Tooltip title="Terminar sessão">
                <IconButton onClick={handleLogout} size="small">
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
