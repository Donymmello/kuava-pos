import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { Product } from '../../types';
import { ProductInput } from '../../services/productService';

interface ProductFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  product: Product | null;
  /** Taxa de IVA (%) sugerida para novos produtos, vinda das definições do estabelecimento. */
  defaultTaxRatePercent?: string;
  onClose: () => void;
  onSubmit: (payload: ProductInput) => Promise<void>;
}

interface FormFields {
  name: string;
  barcode: string;
  category: string;
  price: string;
  costPrice: string;
  stockQuantity: string;
  minStockAlert: string;
  taxRatePercent: string;
}

function emptyForm(defaultTaxRatePercent: string): FormFields {
  return {
    name: '',
    barcode: '',
    category: '',
    price: '',
    costPrice: '0',
    stockQuantity: '0',
    minStockAlert: '5',
    taxRatePercent: defaultTaxRatePercent,
  };
}

function productToForm(product: Product): FormFields {
  return {
    name: product.name,
    barcode: product.barcode ?? '',
    category: product.category ?? '',
    price: String(product.price),
    costPrice: String(product.cost_price),
    stockQuantity: String(product.stock_quantity),
    minStockAlert: String(product.min_stock_alert),
    taxRatePercent: String(Math.round(product.tax_rate * 10000) / 100),
  };
}

function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message;
  }
  return undefined;
}

export default function ProductFormDialog({
  open,
  mode,
  product,
  defaultTaxRatePercent = '16',
  onClose,
  onSubmit,
}: ProductFormDialogProps) {
  const [fields, setFields] = useState<FormFields>(() => emptyForm(defaultTaxRatePercent));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFields(product ? productToForm(product) : emptyForm(defaultTaxRatePercent));
      setError(null);
    }
  }, [open, product, defaultTaxRatePercent]);

  function updateField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const price = Number(fields.price);
    if (!fields.name.trim() || Number.isNaN(price) || price < 0) {
      setError('Indique um nome e um preço válido.');
      return;
    }

    const payload: ProductInput = {
      name: fields.name.trim(),
      barcode: fields.barcode.trim() || null,
      category: fields.category.trim() || null,
      price,
      cost_price: Number(fields.costPrice) || 0,
      stock_quantity: Math.max(0, Math.trunc(Number(fields.stockQuantity) || 0)),
      min_stock_alert: Math.max(0, Math.trunc(Number(fields.minStockAlert) || 0)),
      tax_rate: Math.max(0, Number(fields.taxRatePercent) || 0) / 100,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (submitError) {
      setError(extractErrorMessage(submitError) ?? 'Não foi possível guardar o produto.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'Novo produto' : 'Editar produto'}</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Nome"
              value={fields.name}
              onChange={(event) => updateField('name', event.target.value)}
              autoFocus
              required
              fullWidth
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Código de barras"
                value={fields.barcode}
                onChange={(event) => updateField('barcode', event.target.value)}
                fullWidth
              />
              <TextField
                label="Categoria"
                value={fields.category}
                onChange={(event) => updateField('category', event.target.value)}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Preço de venda (MZN, IVA incluído)"
                helperText="Valor final cobrado ao cliente — o IVA já vai incluído neste preço."
                type="number"
                inputProps={{ min: 0, step: '0.01' }}
                value={fields.price}
                onChange={(event) => updateField('price', event.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Preço de custo (MZN)"
                type="number"
                inputProps={{ min: 0, step: '0.01' }}
                value={fields.costPrice}
                onChange={(event) => updateField('costPrice', event.target.value)}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Stock atual"
                type="number"
                inputProps={{ min: 0, step: '1' }}
                value={fields.stockQuantity}
                onChange={(event) => updateField('stockQuantity', event.target.value)}
                fullWidth
              />
              <TextField
                label="Alerta de stock mínimo"
                type="number"
                inputProps={{ min: 0, step: '1' }}
                value={fields.minStockAlert}
                onChange={(event) => updateField('minStockAlert', event.target.value)}
                fullWidth
              />
              <TextField
                label="IVA (%)"
                type="number"
                inputProps={{ min: 0, max: 100, step: '0.01' }}
                value={fields.taxRatePercent}
                onChange={(event) => updateField('taxRatePercent', event.target.value)}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'A guardar…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
