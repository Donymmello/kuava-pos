import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  getSaleItemProductName,
  MOBILE_MONEY_FLOW_LABELS,
  MobileMoneyFlow,
  PAYMENT_METHOD_LABELS,
  Sale,
  SALE_STATUS_LABELS,
  Tenant,
  UserRole,
} from '../../types';
import { formatMzn } from '../../utils/currency';
import { formatDateTime } from '../../utils/date';
import { useAuthStore } from '../../store/useAuthStore';
import SaleDocumentActions from './SaleDocumentActions';

interface SaleDetailDialogProps {
  open: boolean;
  sale: Sale | null;
  tenant: Tenant | null;
  onClose: () => void;
  onCancelSale: (saleId: string) => Promise<void>;
  onPrintReceipt: () => void;
}

export default function SaleDetailDialog({
  open,
  sale,
  tenant,
  onClose,
  onCancelSale,
  onPrintReceipt,
}: SaleDetailDialogProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const role = useAuthStore((state) => state.user?.role);
  const canCancel = role === UserRole.ADMIN || role === UserRole.MANAGER;

  if (!sale) {
    return null;
  }

  async function handleCancel() {
    if (!sale) {
      return;
    }
    setError(null);
    setIsCancelling(true);
    try {
      await onCancelSale(sale.id);
      onClose();
    } catch {
      setError('Não foi possível cancelar esta venda. Tente novamente.');
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Venda #{sale.id.slice(0, 8).toUpperCase()}
        <Typography variant="body2" color="text.secondary">
          {formatDateTime(sale.created_at)}
          {sale.user ? ` · ${sale.user.name}` : ''}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip size="small" label={PAYMENT_METHOD_LABELS[sale.payment_method]} variant="outlined" />
            {sale.mobile_money_flow && (
              <Chip size="small" label={MOBILE_MONEY_FLOW_LABELS[sale.mobile_money_flow]} variant="outlined" />
            )}
            <Chip
              size="small"
              label={SALE_STATUS_LABELS[sale.status]}
              color={sale.status === 'COMPLETED' ? 'success' : 'default'}
              variant={sale.status === 'COMPLETED' ? 'filled' : 'outlined'}
            />
          </Stack>

          {sale.mobile_money_flow === MobileMoneyFlow.TRANSFER && sale.payment_reference && (
            <Typography variant="body2" color="text.secondary">
              Referência da confirmação: {sale.payment_reference}
            </Typography>
          )}
          {sale.mobile_money_flow === MobileMoneyFlow.AGENT && sale.agent_margin_amount !== null && (
            <Typography variant="body2" color="text.secondary">
              Margem retida como agente: {formatMzn(sale.agent_margin_amount)}
            </Typography>
          )}

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produto</TableCell>
                <TableCell align="center">Qtd.</TableCell>
                <TableCell align="right">Preço</TableCell>
                <TableCell align="right">Subtotal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sale.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{getSaleItemProductName(item)}</TableCell>
                  <TableCell align="center">{item.quantity}</TableCell>
                  <TableCell align="right">{formatMzn(item.unit_price)}</TableCell>
                  <TableCell align="right">{formatMzn(item.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Divider />

          <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                IVA
              </Typography>
              <Typography variant="body2">{formatMzn(sale.tax_amount)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="h6">Total</Typography>
              <Typography variant="h6" color="primary.main">
                {formatMzn(sale.total_amount)}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, flexWrap: 'wrap', gap: 1 }}>
        <SaleDocumentActions sale={sale} tenant={tenant} onPrintReceipt={onPrintReceipt} size="small" />
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Fechar</Button>
        {sale.status === 'COMPLETED' && canCancel && (
          <Button color="error" onClick={handleCancel} disabled={isCancelling}>
            {isCancelling ? 'A cancelar…' : 'Cancelar venda'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
