import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { addProductStock } from '../../services/productService';
import { isFractionalUnit, PRODUCT_UNIT_ABBREVIATIONS, Product } from '../../types';
import { formatMzn } from '../../utils/currency';
import { formatQuantity } from '../../utils/quantity';

interface StockEntryDialogProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message;
  }
  return undefined;
}

export default function StockEntryDialog({ open, product, onClose, onSuccess }: StockEntryDialogProps) {
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && product) {
      setQuantity('');
      setCostPrice(product.cost_price > 0 ? String(product.cost_price) : '');
      setExpiryDate(product.expiry_date ?? '');
      setError(null);
    }
  }, [open, product]);

  if (!product) {
    return null;
  }

  const unitAbbr = PRODUCT_UNIT_ABBREVIATIONS[product.unit];
  const isFractional = isFractionalUnit(product.unit);
  const parsedQty = Number(quantity) || 0;
  const currentStock = product.stock_quantity;
  const nextTotalStock = currentStock + parsedQty;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;

    if (!quantity.trim() || Number.isNaN(parsedQty) || parsedQty <= 0) {
      setError('Indique uma quantidade válida maior que zero.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await addProductStock(product.id, {
        quantity: parsedQty,
        cost_price: costPrice.trim() ? Number(costPrice) : undefined,
        expiry_date: expiryDate.trim() || undefined,
      });

      onSuccess(
        `Entrada de stock (+${formatQuantity(parsedQty)} ${unitAbbr}) registada com sucesso em "${product.name}". Novo stock: ${formatQuantity(nextTotalStock)} ${unitAbbr}.`,
      );
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err) ?? 'Não foi possível registar a entrada de stock.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AddCircleOutlineIcon color="primary" />
        <span>Entrada de Stock</span>
      </DialogTitle>

      <Stack component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            {/* Informações do Produto */}
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {product.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Código: {product.barcode ?? 'Sem código de barras'} | Preço de venda: {formatMzn(product.price)}
              </Typography>
            </Box>

            {product.tracks_batches && (
              <Alert severity="info" sx={{ py: 0.5 }}>
                Este produto controla stock por lotes. Esta entrada será registada como uma nova remessa.
              </Alert>
            )}

            {/* Quantidade a adicionar */}
            <TextField
              label={`Quantidade a entrar (${unitAbbr})`}
              type="number"
              inputProps={{ min: isFractional ? 0.001 : 1, step: isFractional ? '0.001' : '1' }}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              autoFocus
              fullWidth
              helperText={
                parsedQty > 0
                  ? `Stock atual (${formatQuantity(currentStock)}) + Entrada (${formatQuantity(parsedQty)}) = Novo stock: ${formatQuantity(nextTotalStock)} ${unitAbbr}`
                  : `Stock atual: ${formatQuantity(currentStock)} ${unitAbbr}`
              }
            />

            {/* Preço de Custo Opcional */}
            <TextField
              label="Preço de custo desta remessa (MZN - Opcional)"
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              helperText="Deixe como está para manter o preço de custo atual."
              fullWidth
            />

            {/* Validade Opcional */}
            <TextField
              label="Data de validade desta remessa (Opcional)"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Relevante se este lote tiver um prazo de validade específico."
              fullWidth
            />

            {/* Resumo da Operação */}
            {parsedQty > 0 && (
              <>
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Novo Stock Total:
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {formatQuantity(nextTotalStock)} {unitAbbr}
                  </Typography>
                </Stack>
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting || parsedQty <= 0}>
            {submitting ? 'A registar…' : 'Confirmar Entrada'}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
