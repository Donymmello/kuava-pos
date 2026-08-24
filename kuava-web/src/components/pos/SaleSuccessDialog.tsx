import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { PAYMENT_METHOD_LABELS, Sale, Tenant } from '../../types';
import { formatMzn } from '../../utils/currency';
import SaleDocumentActions from '../invoices/SaleDocumentActions';

interface SaleSuccessDialogProps {
  sale: Sale | null;
  tenant: Tenant | null;
  onPrintReceipt: () => void;
  onClose: () => void;
}

/**
 * Confirmação exibida logo após finalizar uma venda no balcão, com acesso
 * imediato à fatura em PDF e à impressão do recibo térmico — sem ter de ir
 * procurar a venda depois em Faturas.
 */
export default function SaleSuccessDialog({ sale, tenant, onPrintReceipt, onClose }: SaleSuccessDialogProps) {
  if (!sale) {
    return null;
  }

  return (
    <Dialog open={Boolean(sale)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <CheckCircleOutlineIcon color="success" />
          <span>Venda concluída</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {PAYMENT_METHOD_LABELS[sale.payment_method]} · Venda #{sale.id.slice(0, 8).toUpperCase()}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {formatMzn(sale.total_amount)}
          </Typography>
        </Stack>

        {sale.pending_sync && (
          <Alert severity="info" sx={{ mb: 1 }}>
            Guardada neste dispositivo — sem ligação de momento. Sincroniza automaticamente
            assim que a rede voltar.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, flexWrap: 'wrap', gap: 1 }}>
        <SaleDocumentActions sale={sale} tenant={tenant} onPrintReceipt={onPrintReceipt} size="small" />
        <Button variant="contained" onClick={onClose} sx={{ ml: 'auto' }}>
          Nova venda
        </Button>
      </DialogActions>
    </Dialog>
  );
}
