import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
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
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ProductFormDialog from '../../components/inventory/ProductFormDialog';
import {
  createProduct,
  deactivateProduct,
  fetchProducts,
  ProductInput,
  updateProduct,
} from '../../services/productService';
import { fetchTenant } from '../../services/tenantService';
import { Product } from '../../types';
import { formatMzn } from '../../utils/currency';

const FALLBACK_DEFAULT_TAX_RATE_PERCENT = '16';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [defaultTaxRatePercent, setDefaultTaxRatePercent] = useState(FALLBACK_DEFAULT_TAX_RATE_PERCENT);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(
    null,
  );

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchProducts(undefined, false);
      setProducts(result);
    } catch {
      setFeedback({ severity: 'error', message: 'Não foi possível carregar os produtos.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    // A taxa de IVA do estabelecimento é só uma sugestão para novos produtos;
    // se falhar, mantém-se o valor por omissão de 16% em silêncio.
    fetchTenant()
      .then((tenant) => setDefaultTaxRatePercent(String(Math.round(tenant.default_tax_rate * 10000) / 100)))
      .catch(() => undefined);
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return products;
    }
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.barcode?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term),
    );
  }, [products, search]);

  function openCreateDialog() {
    setDialogMode('create');
    setEditingProduct(null);
    setDialogOpen(true);
  }

  function openEditDialog(product: Product) {
    setDialogMode('edit');
    setEditingProduct(product);
    setDialogOpen(true);
  }

  async function handleSubmit(payload: ProductInput) {
    if (dialogMode === 'create') {
      await createProduct(payload);
      setFeedback({ severity: 'success', message: 'Produto criado com sucesso.' });
    } else if (editingProduct) {
      await updateProduct(editingProduct.id, payload);
      setFeedback({ severity: 'success', message: 'Produto atualizado com sucesso.' });
    }
    setDialogOpen(false);
    await loadProducts();
  }

  async function handleToggleActive(product: Product) {
    try {
      if (product.is_active) {
        await deactivateProduct(product.id);
        setFeedback({ severity: 'success', message: `"${product.name}" foi desativado.` });
      } else {
        await updateProduct(product.id, { is_active: true });
        setFeedback({ severity: 'success', message: `"${product.name}" foi reativado.` });
      }
      await loadProducts();
    } catch {
      setFeedback({ severity: 'error', message: 'Não foi possível atualizar o estado do produto.' });
    }
  }

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5">Inventário</Typography>
          <Typography variant="body2" color="text.secondary">
            {products.length} produto{products.length === 1 ? '' : 's'} registado
            {products.length === 1 ? '' : 's'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Novo Produto
        </Button>
      </Stack>

      <TextField
        placeholder="Pesquisar por nome, código de barras ou categoria"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        size="small"
        sx={{ mb: 2, maxWidth: 420 }}
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Produto</TableCell>
            <TableCell>Código de barras</TableCell>
            <TableCell>Categoria</TableCell>
            <TableCell align="right">Preço (c/ IVA)</TableCell>
            <TableCell align="right">Custo</TableCell>
            <TableCell align="right">Stock</TableCell>
            <TableCell align="right">IVA</TableCell>
            <TableCell align="center">Estado</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!loading && filteredProducts.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                Nenhum produto encontrado.
              </TableCell>
            </TableRow>
          )}
          {filteredProducts.map((product) => {
            const lowStock = product.is_active && product.stock_quantity <= product.min_stock_alert;
            return (
              <TableRow key={product.id} hover sx={{ opacity: product.is_active ? 1 : 0.6 }}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.barcode ?? '—'}</TableCell>
                <TableCell>{product.category ?? '—'}</TableCell>
                <TableCell align="right">{formatMzn(product.price)}</TableCell>
                <TableCell align="right">{formatMzn(product.cost_price)}</TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    label={product.stock_quantity}
                    color={lowStock ? 'warning' : 'default'}
                    variant={lowStock ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell align="right">{Math.round(product.tax_rate * 10000) / 100}%</TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={product.is_active ? 'Ativo' : 'Inativo'}
                    color={product.is_active ? 'success' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => openEditDialog(product)}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={product.is_active ? 'Desativar' : 'Reativar'}>
                    <IconButton size="small" onClick={() => handleToggleActive(product)}>
                      {product.is_active ? (
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

      <ProductFormDialog
        open={dialogOpen}
        mode={dialogMode}
        product={editingProduct}
        defaultTaxRatePercent={defaultTaxRatePercent}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />

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
