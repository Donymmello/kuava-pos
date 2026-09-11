import { useEffect, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardActionArea,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import LogoutIcon from '@mui/icons-material/Logout';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { createSubscriptionRequest } from '../../services/subscriptionService';
import { SUBSCRIPTION_PLAN_LABELS, SubscriptionPlan, UserRole } from '../../types';
import { formatMzn } from '../../utils/currency';
import { formatDate } from '../../utils/date';

export default function SubscriptionPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const status = useSubscriptionStore((state) => state.status);
  const isLoading = useSubscriptionStore((state) => state.isLoading);
  const hasLoaded = useSubscriptionStore((state) => state.hasLoaded);
  const refresh = useSubscriptionStore((state) => state.refresh);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isAdmin = user?.role === UserRole.ADMIN;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  async function handleConfirmPlan() {
    if (!selectedPlan) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createSubscriptionRequest(selectedPlan);
      await refresh();
      setSelectedPlan(null);
    } catch {
      setError('Não foi possível criar o pedido. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyReference(reference: string) {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Área de transferência indisponível, a referência continua visível no ecrã para copiar à mão.
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <PointOfSaleIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flex: 1 }}>
            Kuava POS
          </Typography>
          {user && (
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              {user.name}
            </Typography>
          )}
          <Tooltip title="Terminar sessão">
            <IconButton onClick={handleLogout} size="small">
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', p: { xs: 2, md: 4 } }}>
        <Box sx={{ width: '100%', maxWidth: 560 }}>
          {!hasLoaded || isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : !status ? (
            <Alert severity="error">
              Não foi possível carregar o estado da assinatura. Verifique a ligação e tente novamente.
            </Alert>
          ) : (
            <Stack spacing={3}>
              <Stack spacing={0.5}>
                <Typography variant="h5">Assinatura</Typography>
                <SubscriptionSummary
                  hasAccess={status.hasAccess}
                  isAdmin={isAdmin}
                  trialEndsAt={status.trialEndsAt}
                  subscriptionExpiresAt={status.subscriptionExpiresAt}
                />
              </Stack>

              {!isAdmin && !status.hasAccess && (
                <Alert severity="warning">
                  Fala com o administrador da tua conta para regularizar a assinatura, só o administrador
                  consegue escolher um plano.
                </Alert>
              )}

              {isAdmin && status.pendingRequest && (
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CheckCircleOutlineIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle1">Fatura pro-forma</Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Plano
                      </Typography>
                      <Typography variant="body2">{SUBSCRIPTION_PLAN_LABELS[status.pendingRequest.plan]}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Valor a transferir
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatMzn(status.pendingRequest.amount)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Banco
                      </Typography>
                      <Typography variant="body2">{status.bankDetails.bankName}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Titular
                      </Typography>
                      <Typography variant="body2">{status.bankDetails.accountHolder}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        NIB
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {status.bankDetails.nib}
                      </Typography>
                    </Stack>

                    <Divider />

                    <Stack spacing={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        Referência (coloca na descrição da transferência)
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>
                          {status.pendingRequest.reference}
                        </Typography>
                        <Tooltip title={copied ? 'Copiado!' : 'Copiar'}>
                          <IconButton size="small" onClick={() => handleCopyReference(status.pendingRequest!.reference)}>
                            <ContentCopyOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>

                    <Alert severity="info" variant="outlined">
                      Depois de fazeres a transferência, guarda o comprovativo. Assim que o pagamento for
                      confirmado, o acesso é reativado automaticamente, não precisas de fazer mais nada.
                    </Alert>
                  </Stack>
                </Paper>
              )}

              {isAdmin && !status.pendingRequest && (
                <Stack spacing={2}>
                  <Typography variant="subtitle1">
                    {status.hasAccess ? 'Escolher outro plano ou renovar já' : 'Escolhe um plano para continuar'}
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    {status.plans.map((option) => (
                      <Card
                        key={option.plan}
                        variant="outlined"
                        sx={{
                          flex: 1,
                          borderColor: selectedPlan === option.plan ? 'primary.main' : undefined,
                          borderWidth: selectedPlan === option.plan ? 2 : 1,
                        }}
                      >
                        <CardActionArea sx={{ p: 2.5 }} onClick={() => setSelectedPlan(option.plan)}>
                          <Stack spacing={0.5}>
                            <Typography variant="subtitle1">{SUBSCRIPTION_PLAN_LABELS[option.plan]}</Typography>
                            <Typography variant="h6" color="primary.main">
                              {formatMzn(option.priceMzn)}
                            </Typography>
                            {option.plan === SubscriptionPlan.ANNUAL && (
                              <Typography variant="caption" color="text.secondary">
                                Equivale a {formatMzn(option.priceMzn / 12)}/mês
                              </Typography>
                            )}
                          </Stack>
                        </CardActionArea>
                      </Card>
                    ))}
                  </Stack>

                  {error && <Alert severity="error">{error}</Alert>}

                  <Button
                    variant="contained"
                    size="large"
                    disabled={!selectedPlan || isSubmitting}
                    onClick={handleConfirmPlan}
                  >
                    {isSubmitting ? 'A gerar fatura…' : 'Gerar fatura pro-forma'}
                  </Button>
                </Stack>
              )}
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
}

interface SubscriptionSummaryProps {
  hasAccess: boolean;
  isAdmin: boolean;
  trialEndsAt: string | null;
  subscriptionExpiresAt: string | null;
}

function SubscriptionSummary({ hasAccess, isAdmin, trialEndsAt, subscriptionExpiresAt }: SubscriptionSummaryProps) {
  const now = Date.now();
  const subscriptionValid = Boolean(subscriptionExpiresAt) && new Date(subscriptionExpiresAt as string).getTime() > now;
  const trialValid = Boolean(trialEndsAt) && new Date(trialEndsAt as string).getTime() > now;

  if (subscriptionValid) {
    return (
      <Typography variant="body2" color="text.secondary">
        Plano ativo até {formatDate(subscriptionExpiresAt as string)}.
      </Typography>
    );
  }

  if (trialValid) {
    const daysLeft = Math.ceil((new Date(trialEndsAt as string).getTime() - now) / (24 * 60 * 60 * 1000));
    return (
      <Typography variant="body2" color="text.secondary">
        Em teste gratuito: falta{daysLeft === 1 ? '' : 'm'} {daysLeft} dia{daysLeft === 1 ? '' : 's'}.
      </Typography>
    );
  }

  return (
    <Typography variant="body2" color={hasAccess ? 'text.secondary' : 'error.main'}>
      {isAdmin
        ? 'O período de teste terminou e não há nenhum plano pago em vigor.'
        : 'O acesso deste estabelecimento está suspenso.'}
    </Typography>
  );
}
