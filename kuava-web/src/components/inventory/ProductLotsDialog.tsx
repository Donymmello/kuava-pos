import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { createProductLot, deleteProductLot, fetchProductLots } from '../../services/productLotService';
import { Product, ProductLot } from '../../types';
import { formatDate } from '../../utils/date';
import { formatQuantity } from '../../utils/quantity';

interface ProductLotsDialogProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  /** Avisa o Inventário para recarregar a lista (o stock total do produto pode ter mudado). */
  onLotsChanged: () => void;
}

function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message;
  }
  return undefined;
}

export default function ProductLotsDialog({ open, product, onClose, onLotsChanged }: ProductLotsDialogProps) {
  const [lots, setLots] = useState<ProductLot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newQuantity, setNewQuantity] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && product) {
      setError(null);
      setNewQuantity('');
      setNewExpiryDate('');
      setLoading(true);
      fetchProductLots(product.id)
        .then(setLots)
        .catch(() => setError('Não foi possível carregar os lotes.'))
        .finally(() => setLoading(false));
    }
  }, [open, product]);

  async function reload() {
    if (!product) {
      return;
    }
    const result = await fetchProductLots(product.id);
    setLots(result);
    onLotsChanged();
  }

  async function handleAddLot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) {
      return;
    }

    const quantity = Number(newQuantity);
    if (!quantity || quantity <= 0) {
      setError('Indique uma quantidade maior que zero.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await createProductLot(product.id, { quantity, expiry_date: newExpiryDate || null });
      setNewQuantity('');
      setNewExpiryDate('');
      await reload();
    } catch (submitError) {
      setError(extractErrorMessage(submitError) ?? 'Não foi possível registar o lote.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteLot(lot: ProductLot) {
    if (!product) {
      return;
    }
    setError(null);
    setDeletingId(lot.id);
    try {
      await deleteProductLot(product.id, lot.id);
      await reload();
    } catch (deleteError) {
      setError(extractErrorMessage(deleteError) ?? 'Não foi possível apagar este lote.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Lotes {product ? `de "${product.name}"` : ''}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="right">Quantidade</TableCell>
                <TableCell align="center">Validade</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && lots.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    Nenhum lote com stock.
                  </TableCell>
                </TableRow>
              )}
              {lots.map((lot) => (
                <TableRow key={lot.id} hover>
                  <TableCell align="right">{formatQuantity(lot.quantity)}</TableCell>
                  <TableCell align="center">{lot.expiry_date ? formatDate(lot.expiry_date) : '-'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Apagar lote">
                      <span>
                        <IconButton
                          size="small"
                          disabled={deletingId === lot.id}
                          onClick={() => handleDeleteLot(lot)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Typography variant="subtitle2">Novo lote</Typography>
          <Stack component="form" onSubmit={handleAddLot} direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Quantidade recebida"
              type="number"
              inputProps={{ min: 0, step: '0.001' }}
              value={newQuantity}
              onChange={(event) => setNewQuantity(event.target.value)}
              fullWidth
            />
            <TextField
              label="Validade (opcional)"
              type="date"
              value={newExpiryDate}
              onChange={(event) => setNewExpiryDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <Button type="submit" variant="contained" disabled={submitting} sx={{ whiteSpace: 'nowrap' }}>
              {submitting ? 'A adicionar…' : 'Adicionar lote'}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
