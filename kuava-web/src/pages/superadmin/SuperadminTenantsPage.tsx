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
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import {
  cancelSubscriptionRequest,
  confirmSubscriptionRequest,
  fetchAllTenants,
  fetchPendingSubscriptionRequests,
  ResetAdminPasswordResult,
  resetTenantAdminPassword,
  setTenantActive,
} from '../../services/superadminService';
import { SUBSCRIPTION_PLAN_LABELS, SuperadminSubscriptionRequest, SuperadminTenant } from '../../types';
import { formatDateTime } from '../../utils/date';
import { formatMzn } from '../../utils/currency';

interface PlanStatus {
  label: string;
  color: 'success' | 'warning' | 'error' | 'default';
}

// Fase inicial: um único plano pago + 7 dias de teste gratuito, sem
// gateway de pagamento, o cliente escolhe o plano na app, paga por fora, e
// o superadmin confirma manualmente no painel abaixo (ver
// kuava-api/src/services/subscriptionService.ts).
function getPlanStatus(tenant: SuperadminTenant): PlanStatus {
  const now = Date.now();

  if (tenant.subscription_expires_at && new Date(tenant.subscription_expires_at).getTime() > now) {
    return { label: `Plano ativo até ${formatDateTime(tenant.subscription_expires_at)}`, color: 'success' };
  }

  if (!tenant.trial_ends_at) {
    // Estabelecimento registado antes desta funcionalidade existir, nunca
    // teve trial, nunca é bloqueado por isto.
    return { label: 'Sem plano (anterior ao trial)', color: 'default' };
  }

  const trialEnd = new Date(tenant.trial_ends_at).getTime();
  const daysLeft = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));

  if (daysLeft > 0) {
    return { label: `Em teste: ${daysLeft} dia${daysLeft === 1 ? '' : 's'} restante${daysLeft === 1 ? '' : 's'}`, color: 'warning' };
  }

  return { label: 'Teste expirado, sem plano', color: 'error' };
}

export default function SuperadminTenantsPage() {
  const [tenants, setTenants] = useState<SuperadminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(
    null,
  );

  const [pendingRequests, setPendingRequests] = useState<SuperadminSubscriptionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestActionId, setRequestActionId] = useState<string | null>(null);

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

  const loadPendingRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const result = await fetchPendingSubscriptionRequests();
      setPendingRequests(result);
    } catch {
      setFeedback({ severity: 'error', message: 'Não foi possível carregar os pedidos de assinatura.' });
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
    loadPendingRequests();
  }, [loadTenants, loadPendingRequests]);

  async function handleToggleActive(tenant: SuperadminTenant) {
    try {
      await setTenantActive(tenant.id, !tenant.is_active);
      setFeedback({
        severity: 'success',
        message: tenant.is_active
          ? `"${tenant.name}" foi desativado. Os utilizadores dele deixam de conseguir iniciar sessão.`
          : `"${tenant.name}" foi reativado.`,
      });
      await loadTenants();
    } catch {
      setFeedback({ severity: 'error', message: 'Não foi possível atualizar o estado do estabelecimento.' });
    }
  }

  async function handleConfirmRequest(request: SuperadminSubscriptionRequest) {
    setRequestActionId(request.id);
    try {
      await confirmSubscriptionRequest(request.id);
      setFeedback({
        severity: 'success',
        message: `Pedido de "${request.tenant?.name ?? 'estabelecimento'}" confirmado, assinatura estendida.`,
      });
      await Promise.all([loadPendingRequests(), loadTenants()]);
    } catch {
      setFeedback({ severity: 'error', message: 'Não foi possível confirmar o pedido.' });
    } finally {
      setRequestActionId(null);
    }
  }

  async function handleCancelRequest(request: SuperadminSubscriptionRequest) {
    setRequestActionId(request.id);
    try {
      await cancelSubscriptionRequest(request.id);
      setFeedback({ severity: 'success', message: 'Pedido cancelado.' });
      await loadPendingRequests();
    } catch {
      setFeedback({ severity: 'error', message: 'Não foi possível cancelar o pedido.' });
    } finally {
      setRequestActionId(null);
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
      // Área de transferência indisponível (ex.: contexto não seguro), a senha continua visível no ecrã para copiar à mão.
    }
  }

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', p: 3 }}>
      <Stack sx={{ mb: 3 }}>
        <Typography variant="h5">Pedidos de assinatura</Typography>
        <Typography variant="body2" color="text.secondary">
          Confirma depois de veres a transferência chegar (usa a referência para identificar o pagamento)
        </Typography>
      </Stack>

      <Table size="small" sx={{ mb: 4 }}>
        <TableHead>
          <TableRow>
            <TableCell>Estabelecimento</TableCell>
            <TableCell>Plano</TableCell>
            <TableCell align="right">Valor</TableCell>
            <TableCell>Referência</TableCell>
            <TableCell>Pedido em</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!loadingRequests && pendingRequests.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                Nenhum pedido de assinatura por confirmar.
              </TableCell>
            </TableRow>
          )}
          {pendingRequests.map((request) => (
            <TableRow key={request.id} hover>
              <TableCell>
                {request.tenant?.name ?? '-'}
                {request.tenant?.nuit && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    NUIT: {request.tenant.nuit}
                  </Typography>
                )}
              </TableCell>
              <TableCell>{SUBSCRIPTION_PLAN_LABELS[request.plan]}</TableCell>
              <TableCell align="right">{formatMzn(request.amount)}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>{request.reference}</TableCell>
              <TableCell>{formatDateTime(request.created_at)}</TableCell>
              <TableCell align="right">
                <Tooltip title="Confirmar pagamento e estender a assinatura">
                  <span>
                    <IconButton
                      size="small"
                      color="success"
                      disabled={requestActionId === request.id}
                      onClick={() => handleConfirmRequest(request)}
                    >
                      <CheckCircleOutlinedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Cancelar pedido">
                  <span>
                    <IconButton
                      size="small"
                      disabled={requestActionId === request.id}
                      onClick={() => handleCancelRequest(request)}
                    >
                      <CancelOutlinedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
                <TableCell>{tenant.email || tenant.phone || '-'}</TableCell>
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
            A senha atual deixa imediatamente de funcionar. Não há forma de desfazer isto: combina com o cliente
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
            Esta senha só é mostrada uma vez: copia-a e passa-a ao cliente por fora da app (telefone, WhatsApp).
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
