import { FormEvent, useState } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { useAuthStore } from '../../store/useAuthStore';
import { UserRole } from '../../types';

interface LocationState {
  from?: { pathname: string };
}

function defaultRouteForRole(role: UserRole | undefined): string {
  return role === UserRole.SUPERADMIN ? '/superadmin' : '/pos';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const clearError = useAuthStore((state) => state.clearError);

  const navigate = useNavigate();
  const location = useLocation();

  if (user) {
    const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? defaultRouteForRole(user.role);
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    const success = await login(email, password);
    if (success) {
      const loggedInRole = useAuthStore.getState().user?.role;
      const redirectTo =
        (location.state as LocationState | null)?.from?.pathname ?? defaultRouteForRole(loggedInRole);
      navigate(redirectTo, { replace: true });
    }
  }

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper variant="outlined" sx={{ p: 4, width: '100%', maxWidth: 380 }}>
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Stack spacing={1} alignItems="center">
            <PointOfSaleIcon color="primary" fontSize="large" />
            <Typography variant="h5">Kuava POS</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Inicie sessão para aceder ao seu estabelecimento
            </Typography>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            autoFocus
            required
            fullWidth
          />

          <TextField
            label="Senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            fullWidth
          />

          <Button type="submit" variant="contained" size="large" disabled={isLoading} fullWidth>
            {isLoading ? 'A entrar…' : 'Entrar'}
          </Button>

          <Typography variant="body2" textAlign="center">
            Ainda não tem estabelecimento?{' '}
            <Link component={RouterLink} to="/register">
              Criar agora
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
