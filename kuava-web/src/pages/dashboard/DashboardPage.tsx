import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import StatTile from '../../components/dashboard/StatTile';
import SalesTrendChart from '../../components/dashboard/SalesTrendChart';
import PaymentMethodBreakdown from '../../components/dashboard/PaymentMethodBreakdown';
import TopProductsList from '../../components/dashboard/TopProductsList';
import { fetchDashboardSummary } from '../../services/dashboardService';
import { DashboardSummary } from '../../types';
import { formatMzn } from '../../utils/currency';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardSummary();
      setSummary(result);
    } catch {
      setError('Não foi possível carregar o painel. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !summary) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error ?? 'Sem dados disponíveis.'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', p: { xs: 2, md: 4 } }}>
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Painel
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Resumo de vendas e indicadores do estabelecimento.
        </Typography>
      </Stack>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label="Vendas hoje"
            value={formatMzn(summary.today.totalAmount)}
            sublabel={`${summary.today.count} ${summary.today.count === 1 ? 'venda' : 'vendas'}`}
            icon={<PaymentsOutlinedIcon fontSize="small" color="action" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label="Vendas este mês"
            value={formatMzn(summary.month.totalAmount)}
            sublabel={`${summary.month.count} ${summary.month.count === 1 ? 'venda' : 'vendas'}`}
            icon={<CalendarMonthOutlinedIcon fontSize="small" color="action" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label="Ticket médio"
            value={formatMzn(summary.month.averageTicket)}
            sublabel="este mês"
            icon={<ReceiptLongOutlinedIcon fontSize="small" color="action" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label="Stock baixo"
            value={String(summary.lowStockCount)}
            sublabel={summary.lowStockCount > 0 ? 'produtos a repor' : 'tudo em ordem'}
            accent={summary.lowStockCount > 0 ? 'warning' : 'default'}
            icon={<WarningAmberOutlinedIcon fontSize="small" color={summary.lowStockCount > 0 ? 'warning' : 'action'} />}
          />
        </Grid>
        {summary.agentMarginMonth.count > 0 && (
          <Grid item xs={12} sm={6} md={3}>
            <StatTile
              label="Comissões de agente"
              value={formatMzn(summary.agentMarginMonth.totalAmount)}
              sublabel={`${summary.agentMarginMonth.count} levantamento${summary.agentMarginMonth.count === 1 ? '' : 's'} este mês`}
              icon={<StorefrontOutlinedIcon fontSize="small" color="action" />}
            />
          </Grid>
        )}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <SalesTrendChart data={summary.last7Days} />
        </Grid>
        <Grid item xs={12} md={5}>
          <PaymentMethodBreakdown data={summary.paymentMethodBreakdown} />
        </Grid>
        <Grid item xs={12} md={5}>
          <TopProductsList data={summary.topProducts} />
        </Grid>
      </Grid>
    </Box>
  );
}
