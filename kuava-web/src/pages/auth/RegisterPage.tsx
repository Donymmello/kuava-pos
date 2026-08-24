import { FormEvent, useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Divider,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { useAuthStore } from '../../store/useAuthStore';

export default function RegisterPage() {
  const [tenantName, setTenantName] = useState('');
  const [nuit, setNuit] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const apiError = useAuthStore((state) => state.error);
  const register = useAuthStore((state) => state.register);
  const clearError = useAuthStore((state) => state.clearError);

  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/pos" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    clearError();

    if (adminPassword !== confirmPassword) {
      setFormError('As senhas não coincidem');
      return;
    }

    if (adminPassword.length < 6) {
      setFormError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    const success = await register({
      tenantName,
      nuit,
      address: address || undefined,
      phone: phone || undefined,
      adminName,
      adminEmail,
      adminPassword,
    });

    if (success) {
      navigate('/pos', { replace: true });
    }
  }

  const errorMessage = formError ?? apiError;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper variant="outlined" sx={{ p: 4, width: '100%', maxWidth: 460 }}>
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Stack spacing={1} alignItems="center">
            <PointOfSaleIcon color="primary" fontSize="large" />
            <Typography variant="h5">Criar estabelecimento</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Regista a tua loja e a conta de administrador no Kuava POS
            </Typography>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              7 dias de teste gratuito, sem compromisso
            </Typography>
          </Stack>

          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <Stack spacing={2}>
            <Typography variant="subtitle2" color="text.secondary">
              Dados do estabelecimento
            </Typography>
            <TextField
              label="Nome do estabelecimento"
              value={tenantName}
              onChange={(event) => setTenantName(event.target.value)}
              autoFocus
              required
              fullWidth
            />
            <TextField
              label="NUIT"
              value={nuit}
              onChange={(event) => setNuit(event.target.value)}
              required
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Morada (opcional)"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                fullWidth
              />
              <TextField
                label="Telefone (opcional)"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                fullWidth
              />
            </Stack>
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Typography variant="subtitle2" color="text.secondary">
              Conta de administrador
            </Typography>
            <TextField
              label="Nome completo"
              value={adminName}
              onChange={(event) => setAdminName(event.target.value)}
              autoComplete="name"
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              autoComplete="username"
              required
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Senha"
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                autoComplete="new-password"
                required
                fullWidth
              />
              <TextField
                label="Confirmar senha"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
                fullWidth
              />
            </Stack>
          </Stack>

          <Button type="submit" variant="contained" size="large" disabled={isLoading} fullWidth>
            {isLoading ? 'A criar…' : 'Criar estabelecimento'}
          </Button>

          <Typography variant="body2" textAlign="center">
            Já tem conta?{' '}
            <Link component={RouterLink} to="/login">
              Iniciar sessão
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
