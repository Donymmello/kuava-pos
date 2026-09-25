import { ReactNode } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  AppBar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
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
  /** Rótulo curto para a barra inferior, onde só cabem ~9 caracteres. */
  shortLabel: string;
  icon: ReactNode;
  roles: UserRole[] | null;
}

/**
 * Quantos itens cabem na barra inferior antes de o resto ir para "Mais".
 * Quatro mais o "Mais" são cinco alvos num ecrã de 412px, que é o limite
 * antes de cada um ficar estreito de mais para o dedo.
 */
const MAX_ITENS_BARRA_INFERIOR = 4;

const NAV_ITEMS: NavItem[] = [
  { to: '/pos', label: 'Ponto de Venda', shortLabel: 'Venda', icon: <PointOfSaleIcon />, roles: null },
  { to: '/invoices', label: 'Faturas', shortLabel: 'Faturas', icon: <ReceiptLongOutlinedIcon />, roles: null },
  {
    to: '/inventory',
    label: 'Inventário',
    shortLabel: 'Stock',
    icon: <Inventory2OutlinedIcon />,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    to: '/dashboard',
    label: 'Painel',
    shortLabel: 'Painel',
    icon: <BarChartOutlinedIcon />,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  { to: '/settings', label: 'Definições', shortLabel: 'Definições', icon: <SettingsOutlinedIcon />, roles: [UserRole.ADMIN] },
  { to: '/assinatura', label: 'Assinatura', shortLabel: 'Assinatura', icon: <PaidOutlinedIcon />, roles: [UserRole.ADMIN] },
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

  const theme = useTheme();
  /**
   * Num telemóvel a barra de navegação horizontal não cabe: com seis botões
   * estendia-se até ~625px num ecrã de 412px, e o browser respondia a
   * reduzir a PÁGINA INTEIRA a ~52% — texto e alvos de toque a metade do
   * tamanho, num POS que se usa ao dedo, ao balcão. Abaixo de `sm` a
   * navegação passa para uma barra inferior, ao alcance do polegar.
   */
  const ecraPequeno = useMediaQuery(theme.breakpoints.down('sm'));

  // Os que cabem na barra; o resto vai para o menu "Mais".
  const cabemNaBarra =
    visibleItems.length <= MAX_ITENS_BARRA_INFERIOR + 1
      ? visibleItems
      : visibleItems.slice(0, MAX_ITENS_BARRA_INFERIOR);
  const itensNoMais = visibleItems.slice(cabemNaBarra.length);

  const [menuMais, setMenuMais] = useState<null | HTMLElement>(null);
  const indiceActivo = cabemNaBarra.findIndex((item) => location.pathname.startsWith(item.to));

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
          <Typography
            variant="h6"
            sx={{ mr: ecraPequeno ? 0 : 3, flex: ecraPequeno ? 1 : 'none', whiteSpace: 'nowrap' }}
          >
            {ecraPequeno ? 'Kuava' : 'Kuava POS'}
          </Typography>

          {/* No telemóvel esta barra dá lugar à navegação inferior. */}
          <Stack direction="row" spacing={0.5} sx={{ flex: 1, display: ecraPequeno ? 'none' : 'flex' }}>
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

          {trialBanner &&
            (ecraPequeno ? (
              // Só o ícone: o texto do aviso sozinho é mais largo que o ecrã.
              <Tooltip title={trialBanner.label}>
                <IconButton
                  size="small"
                  color={trialBanner.color}
                  onClick={() => navigate('/assinatura')}
                  aria-label={trialBanner.label}
                >
                  <PaidOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Chip
                size="small"
                icon={<PaidOutlinedIcon />}
                label={trialBanner.label}
                color={trialBanner.color}
                variant="outlined"
                onClick={() => navigate('/assinatura')}
                sx={{ mr: 1, cursor: 'pointer' }}
              />
            ))}

          {!isOnline &&
            (ecraPequeno ? (
              <Tooltip title="Sem ligação">
                <CloudOffOutlinedIcon color="warning" fontSize="small" sx={{ mx: 0.5 }} />
              </Tooltip>
            ) : (
              <Chip
                size="small"
                icon={<CloudOffOutlinedIcon />}
                label="Offline"
                color="warning"
                variant="outlined"
                sx={{ mr: 1 }}
              />
            ))}

          {pendingCount > 0 && (
            <Tooltip title={isOnline ? 'Sincronizar vendas pendentes agora' : 'Aguarda ligação para sincronizar'}>
              <span>
                {ecraPequeno ? (
                  // O número continua visível através do badge — é informação
                  // que o caixa precisa de ver ao fechar o dia.
                  <IconButton
                    size="small"
                    color="info"
                    onClick={isOnline && !isSyncing ? () => syncNow() : undefined}
                    aria-label={`${pendingCount} venda${pendingCount === 1 ? '' : 's'} por sincronizar`}
                  >
                    <Badge badgeContent={pendingCount} color="info">
                      {isSyncing ? <CircularProgress size={14} /> : <SyncOutlinedIcon fontSize="small" />}
                    </Badge>
                  </IconButton>
                ) : (
                  <Chip
                    size="small"
                    icon={isSyncing ? <CircularProgress size={14} /> : <SyncOutlinedIcon />}
                    label={`${pendingCount} venda${pendingCount === 1 ? '' : 's'} por sincronizar`}
                    color="info"
                    variant="outlined"
                    onClick={isOnline && !isSyncing ? () => syncNow() : undefined}
                    sx={{ mr: 1, cursor: isOnline && !isSyncing ? 'pointer' : 'default' }}
                  />
                )}
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
              {!ecraPequeno && (
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 160 }} title={user.name}>
                    {user.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {USER_ROLE_LABELS[user.role]}
                  </Typography>
                </Box>
              )}
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

      {/*
        Em vez de position: fixed, a barra é mais um filho desta coluna flex:
        assim o conteúdo acima encolhe sozinho e nunca fica escondido por
        baixo dela — o botão "Finalizar Venda" do POS vive precisamente no
        fundo do ecrã.
      */}
      {ecraPequeno && visibleItems.length > 1 && (
        <Paper elevation={3} square sx={{ borderTop: 1, borderColor: 'divider' }}>
          <BottomNavigation
            value={indiceActivo === -1 ? false : indiceActivo}
            showLabels
            sx={{ height: 60 }}
          >
            {cabemNaBarra.map((item) => (
              <BottomNavigationAction
                key={item.to}
                component={RouterLink}
                to={item.to}
                label={item.shortLabel}
                icon={item.icon}
                sx={{ minWidth: 0, px: 0.5 }}
              />
            ))}

            {itensNoMais.length > 0 && (
              <BottomNavigationAction
                label="Mais"
                icon={<MoreHorizIcon />}
                onClick={(event) => setMenuMais(event.currentTarget)}
                sx={{ minWidth: 0, px: 0.5 }}
              />
            )}
          </BottomNavigation>

          <Menu
            anchorEl={menuMais}
            open={Boolean(menuMais)}
            onClose={() => setMenuMais(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            {itensNoMais.map((item) => (
              <MenuItem
                key={item.to}
                component={RouterLink}
                to={item.to}
                selected={location.pathname.startsWith(item.to)}
                onClick={() => setMenuMais(null)}
              >
                <Box sx={{ mr: 1.5, display: 'flex', color: 'text.secondary' }}>{item.icon}</Box>
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </Paper>
      )}
    </Box>
  );
}
