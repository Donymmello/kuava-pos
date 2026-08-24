import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import MoneyOffOutlinedIcon from '@mui/icons-material/MoneyOffOutlined';
import {
  fetchAllTenants,
  ResetAdminPasswordResult,
  resetTenantAdminPassword,
  setTenantActive,
  setTenantSubscriptionActive,
} from '../../services/superadminService';
import { SuperadminTenant } from '../../types';
import { formatDateTime } from '../../utils/date';

interface PlanStatus {
  label: string;
  color: 'success' | 'warning' | 'error' | 'default';
}

// Fase inicial: um único plano pago + 7 dias de teste gratuito, sem
// gateway de pagamento — o superadmin ativa o plano manualmente depois de
// o cliente pagar por fora (ver kuava-api/src/services/superadminService.ts).
function getPlanStatus(tenant: SuperadminTenant): PlanStatus {
  if (tenant.subscription_active) {
    return { label: 'Plano ativo', color: 'success' };
  }

  if (!tenant.trial_ends_at) {
    // Estabelecimento registado antes desta funcionalidade existir — nunca
    // teve trial, nunca é bloqueado por isto.
    return { label: 'Sem plano (anterior ao trial)', color: 'default' };
  }

  const trialEnd = new Date(tenant.trial_ends_at).getTime();
  const daysLeft = Math.ceil((trialEnd - Date.now()) / (24 * 60 * 60 * 1000));

  if (daysLeft > 0) {
    return { label: `Em teste — ${daysLeft} dia${daysLeft === 1 ? '' : 's'} restante${daysLeft === 1 ? '' : 's'}`, color: 'warning' };
  }

  return { label: 'Teste expirado', color: 'error' };
}

export default function SuperadminTenantsPage() {
  const [tenants, setTenants] = useState<SuperadminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(
    null,
  );

  const [resetTarget, setResetTarget] = useState<SuperadminTenant | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetResult, setResetResult] = useState<ResetAdminPasswordResult | null>(null);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAllTenants();
      setTenants(result);
    } catch {
      setFeedback({ severity: 'error', message: 'Não foi possível carregar os estabelecimentos.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  async function handleToggleActive(tenant: SuperadminTenant) {
    try {
      await setTenantActive(tenant.id, !tenant.is_active);
      setFeedback({
        severity: 'success',
        message: tenant.is_active
          ? `"${tenant.name}" foi desativado — os utilizadores dele deixam de conseguir iniciar sessão.`
          : `"${tenant.name}" foi reativado.`,
      });
      await loadTenants();
    } catch {
      setFeedback({ severity: 'error', message: 'Não foi possível atualizar o estado do estabelecimento.' });
    }
  }

  async function handleToggleSubscription(tenant: SuperadminTenant) {
    const nextActive = !tenant.subscription_active;
    try {
      await setTenantSubscriptionActive(tenant.id, nextActive);
      setFeedback({
        severity: 'success',
        message: nextActive
          ? `Plano de "${tenant.name}" ativado — o estabelecimento já pode entrar mesmo que o teste tenha terminado.`
          : `Plano de "${tenant.name}" desativado.`,
      });
      await loadTenants();
    } catch {
      setFeedback({ severity: 'error', message: 'Não foi possível atualizar o plano do estabelecimento.' });
    }
  }

  async function handleConfirmReset() {
    if (!resetTarget) {
      return;
    }
    setResetSubmitting(true);
    try {
      const result = await resetTenantAdminPassword(resetTarget.id);
      setResetResult(result);
      setResetTarget(null);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Não foi possível repor a senha.';
      setFeedback({ severity: 'error', message });
      setResetTarget(null);
    } finally {
      setResetSubmitting(false);
    }
  }

  async function handleCopyPassword() {
    if (!resetResult) {
      return;
    }
    try {
      await navigator.clipboard.writeText(resetResult.temporaryPassword);
      setFeedback({ severity: 'success', message: 'Senha copiada.' });
    } catch {
      // Área de transferência indisponível (ex.: contexto não seguro) — a senha continua visível no ecrã para copiar à mão.
    }
  }

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', p: 3 }}>
      <Stack sx={{ mb: 3 }}>
        <Typography variant="h5">Estabelecimentos</Typography>
        <Typography variant="body2" color="text.secondary">
          Todos os clientes registados na plataforma Kuava POS
        </Typography>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nome</TableCell>
            <TableCell>NUIT</TableCell>
            <TableCell>Contacto</TableCell>
            <TableCell>Registado em</TableCell>
            <TableCell align="center">Estado</TableCell>
            <TableCell align="center">Plano</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!loading && tenants.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                Nenhum estabelecimento registado.
              </TableCell>
            </TableRow>
          )}
          {tenants.map((tenant) => {
            const planStatus = getPlanStatus(tenant);
            return (
              <TableRow key={tenant.id} hover sx={{ opacity: tenant.is_active ? 1 : 0.6 }}>
                <TableCell>{tenant.name}</TableCell>
                <TableCell>{tenant.nuit}</TableCell>
                <TableCell>{tenant.email || tenant.phone || '—'}</TableCell>
                <TableCell>{formatDateTime(tenant.created_at)}</TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={tenant.is_active ? 'Ativo' : 'Inativo'}
                    color={tenant.is_active ? 'success' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip size="small" label={planStatus.label} color={planStatus.color} variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Repor senha do ADMIN">
                    <IconButton size="small" onClick={() => setResetTarget(tenant)}>
                      <LockResetOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={tenant.subscription_active ? 'Desativar plano' : 'Ativar plano'}>
                    <IconButton size="small" onClick={() => handleToggleSubscription(tenant)}>
                      {tenant.subscription_active ? (
                        <MoneyOffOutlinedIcon fontSize="small" />
                      ) : (
                        <PaidOutlinedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={tenant.is_active ? 'Desativar' : 'Reativar'}>
                    <IconButton size="small" onClick={() => handleToggleActive(tenant)}>
                      {tenant.is_active ? (
                        <BlockOutlinedIcon fontSize="small" />
                      ) : (
                        <RestoreOutlinedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={Boolean(resetTarget)} onClose={() => setResetTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Repor senha do ADMIN</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Vai ser gerada uma senha temporária nova para o(s) ADMIN(s) ativo(s) de <strong>{resetTarget?.name}</strong>.
            A senha atual deixa imediatamente de funcionar. Não há forma de desfazer isto — combina com o cliente
            antes de confirmar.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetTarget(null)} disabled={resetSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmReset} disabled={resetSubmitting} variant="contained" color="warning">
            {resetSubmitting ? 'A repor…' : 'Repor senha'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(resetResult)} onClose={() => setResetResult(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Senha temporária gerada</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Esta senha só é mostrada uma vez — copia-a e passa-a ao cliente por fora da app (telefone, WhatsApp).
            Válida para: {resetResult?.adminEmails.join(', ')}.
          </DialogContentText>
          <Stack direction="row" spacing={1}>
            <TextField
              value={resetResult?.temporaryPassword ?? ''}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
            />
            <Tooltip title="Copiar">
              <IconButton onClick={handleCopyPassword}>
                <ContentCopyOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setResetResult(null);
              loadTenants();
            }}
            variant="contained"
          >
            Concluído
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(feedback)} autoHideDuration={4000} onClose={() => setFeedback(null)}>
        {feedback ? (
          <Alert severity={feedback.severity} onClose={() => setFeedback(null)} variant="filled">
            {feedback.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
