import { Outlet, useNavigate } from 'react-router-dom';
import { AppBar, Box, IconButton, Stack, Toolbar, Tooltip, Typography } from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useAuthStore } from '../../store/useAuthStore';
import { useColorMode } from '../../theme/ColorModeContext';

/**
 * Layout dedicado ao superadmin — deliberadamente mais simples que
 * AppLayout: sem navegação de POS/inventário/faturas (que exigem um
 * tenant_id, e o superadmin não tem nenhum) nem indicadores de
 * online/offline (irrelevantes fora do contexto de um estabelecimento).
 */
export default function SuperadminLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { mode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 0.5 }}>
          <AdminPanelSettingsOutlinedIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flex: 1, whiteSpace: 'nowrap' }}>
            Kuava POS — Superadmin
          </Typography>

          <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo escuro'}>
            <IconButton onClick={toggleColorMode} size="small" sx={{ mr: 1 }}>
              {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {user && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }} title={user.name}>
                {user.name}
              </Typography>
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
