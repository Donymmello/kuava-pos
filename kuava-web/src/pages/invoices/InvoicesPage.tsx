import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import SaleDetailDialog from '../../components/invoices/SaleDetailDialog';
import ThermalReceipt from '../../components/invoices/ThermalReceipt';
import { cancelSale, fetchSales } from '../../services/saleService';
import { fetchTenant } from '../../services/tenantService';
import { PAYMENT_METHOD_LABELS, Sale, SALE_STATUS_LABELS, Tenant } from '../../types';
import { formatMzn } from '../../utils/currency';
import { formatDateTime } from '../../utils/date';

export default function InvoicesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(
    null,
  );

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSales();
      setSales(result.items);
    } catch {
      setFeedback({ severity: 'error', message: 'Não foi possível carregar as vendas.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
    // Dados do estabelecimento para o cabeçalho da fatura/recibo; se falhar,
    // os botões de imprimir/descarregar ficam desativados em vez de rebentar.
    fetchTenant()
      .then(setTenant)
      .catch(() => undefined);
  }, [loadSales]);

  function handlePrintReceipt() {
    window.print();
  }

  async function handleCancelSale(saleId: string) {
    await cancelSale(saleId);
    setFeedback({ severity: 'success', message: 'Venda cancelada e stock reposto.' });
    await loadSales();
  }

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', p: 3 }}>
      <Stack sx={{ mb: 3 }}>
        <Typography variant="h5">Faturas</Typography>
        <Typography variant="body2" color="text.secondary">
          Histórico de vendas registadas no ponto de venda
        </Typography>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Data</TableCell>
            <TableCell>Nº Venda</TableCell>
            <TableCell>Operador</TableCell>
            <TableCell>Pagamento</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell align="center">Estado</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!loading && sales.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                Ainda não há vendas registadas.
              </TableCell>
            </TableRow>
          )}
          {sales.map((sale) => (
            <TableRow
              key={sale.id}
              hover
              onClick={() => setSelectedSale(sale)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>{formatDateTime(sale.created_at)}</TableCell>
              <TableCell>#{sale.id.slice(0, 8).toUpperCase()}</TableCell>
              <TableCell>{sale.user?.name ?? '—'}</TableCell>
              <TableCell>{PAYMENT_METHOD_LABELS[sale.payment_method]}</TableCell>
              <TableCell align="right">{formatMzn(sale.total_amount)}</TableCell>
              <TableCell align="center">
                <Chip
                  size="small"
                  label={SALE_STATUS_LABELS[sale.status]}
                  color={sale.status === 'COMPLETED' ? 'success' : 'default'}
                  variant={sale.status === 'COMPLETED' ? 'filled' : 'outlined'}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <SaleDetailDialog
        open={Boolean(selectedSale)}
        sale={selectedSale}
        tenant={tenant}
        onClose={() => setSelectedSale(null)}
        onCancelSale={handleCancelSale}
        onPrintReceipt={handlePrintReceipt}
      />

      <ThermalReceipt sale={selectedSale} tenant={tenant} />

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
