import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ProductFormDialog from '../../components/inventory/ProductFormDialog';
import ProductLotsDialog from '../../components/inventory/ProductLotsDialog';
import StockEntryDialog from '../../components/inventory/StockEntryDialog';
import {
  createProduct,
  deactivateProduct,
  fetchCategories,
  fetchProductsPaginated,
  ProductInput,
  updateProduct,
} from '../../services/productService';
import { fetchTenant } from '../../services/tenantService';
import { PRODUCT_UNIT_ABBREVIATIONS, Product } from '../../types';
import { formatMzn } from '../../utils/currency';
import { formatDate, formatDateTime } from '../../utils/date';
import { formatQuantity } from '../../utils/quantity';

const EXPIRY_WARNING_WINDOW_DAYS = 30;

/** dias até `expiryDate` (negativo se já passou), contando a partir de hoje. */
function daysUntil(expiryDate: string): number {
  const today = new Date();
  const todayUtcMidnight = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [year, month, day] = expiryDate.slice(0, 10).split('-').map(Number);
  const expiryUtcMidnight = Date.UTC(year, month - 1, day);
  return Math.round((expiryUtcMidnight - todayUtcMidnight) / 86_400_000);
}

const FALLBACK_DEFAULT_TAX_RATE_PERCENT = '16';

type SortField = 'name' | 'created_at' | 'price' | 'stock_quantity' | 'expiry_date';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filtros e busca
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [stockStatus, setStockStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Ordenação
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Paginação
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Diálogos e formulários
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [lotsDialogProduct, setLotsDialogProduct] = useState<Product | null>(null);
  const [stockEntryProduct, setStockEntryProduct] = useState<Product | null>(null);
  const [defaultTaxRatePercent, setDefaultTaxRatePercent] = useState(FALLBACK_DEFAULT_TAX_RATE_PERCENT);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(
    null,
  );

  // Debounce da pesquisa de texto para não sobrecarregar a API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } catch {
      // Falha silenciosa
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchProductsPaginated({
        search: debouncedSearch,
        category: category !== 'all' ? category : undefined,
        status,
        stockStatus: stockStatus !== 'all' ? stockStatus : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder,
        page: page + 1,
        pageSize,
      });
      setProducts(result.items);
      setTotalProducts(result.pagination.total);
    } catch {
      setFeedback({ severity: 'error', message: 'Não foi possível carregar os produtos.' });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, status, stockStatus, startDate, endDate, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadCategories();
    fetchTenant()
      .then((tenant) => setDefaultTaxRatePercent(String(Math.round(tenant.default_tax_rate * 10000) / 100)))
      .catch(() => undefined);
  }, [loadCategories]);

  function handleSortChange(field: SortField) {
    if (sortBy === field) {
      setSortOrder((current) => (current === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      // Por omissão, para datas e números faz sentido começar pelo maior/mais recente
      setSortOrder(field === 'name' ? 'ASC' : 'DESC');
    }
    setPage(0);
  }

  function handleQuickSortSelect(value: string) {
    const [field, order] = value.split(':') as [SortField, 'ASC' | 'DESC'];
    setSortBy(field);
    setSortOrder(order);
    setPage(0);
  }

  const hasActiveFilters = Boolean(
    searchInput.trim() ||
      category !== 'all' ||
      status !== 'all' ||
      stockStatus !== 'all' ||
      startDate ||
      endDate,
  );

  function clearAllFilters() {
    setSearchInput('');
    setDebouncedSearch('');
    setCategory('all');
    setStatus('all');
    setStockStatus('all');
    setStartDate('');
    setEndDate('');
    setPage(0);
  }

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
      const result = await createProduct(payload);
      setFeedback({
        severity: 'success',
        message: result.message || 'Produto criado com sucesso.',
      });
    } else if (editingProduct) {
      await updateProduct(editingProduct.id, payload);
      setFeedback({ severity: 'success', message: 'Produto atualizado com sucesso.' });
    }
    setDialogOpen(false);
    await loadProducts();
    await loadCategories();
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h5">Inventário</Typography>
          <Typography variant="body2" color="text.secondary">
            {totalProducts} produto{totalProducts === 1 ? '' : 's'} registado{totalProducts === 1 ? '' : 's'}
            {hasActiveFilters ? ' (com filtros ativos)' : ''}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Novo Produto
        </Button>
      </Stack>

      {/* Barra de Filtros e Busca */}
      <Box
        sx={{
          p: 2,
          mb: 2.5,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Stack spacing={2}>
          {/* Linha 1: Pesquisa por texto e Filtros de Categoria, Estado e Stock */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="center">
            <TextField
              placeholder="Pesquisar por nome, código ou categoria..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              size="small"
              fullWidth
              sx={{ flex: { md: 2 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchInput ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchInput('')} edge="end">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />

            <FormControl size="small" sx={{ minWidth: 160, width: { xs: '100%', md: 'auto' } }}>
              <InputLabel id="category-filter-label">Categoria</InputLabel>
              <Select
                labelId="category-filter-label"
                label="Categoria"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="all">Todas as categorias</MenuItem>
                <MenuItem value="__none__">Sem categoria</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130, width: { xs: '100%', md: 'auto' } }}>
              <InputLabel id="status-filter-label">Estado</InputLabel>
              <Select
                labelId="status-filter-label"
                label="Estado"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as 'all' | 'active' | 'inactive');
                  setPage(0);
                }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="active">Ativos</MenuItem>
                <MenuItem value="inactive">Inativos</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150, width: { xs: '100%', md: 'auto' } }}>
              <InputLabel id="stock-filter-label">Stock</InputLabel>
              <Select
                labelId="stock-filter-label"
                label="Stock"
                value={stockStatus}
                onChange={(e) => {
                  setStockStatus(e.target.value as 'all' | 'in_stock' | 'low_stock' | 'out_of_stock');
                  setPage(0);
                }}
              >
                <MenuItem value="all">Todo o stock</MenuItem>
                <MenuItem value="in_stock">Em stock</MenuItem>
                <MenuItem value="low_stock">Stock baixo</MenuItem>
                <MenuItem value="out_of_stock">Sem stock</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Linha 2: Filtro por Data de Entrada (De/Até), Organização (Sort) e Limpar */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                Data de entrada:
              </Typography>
              <TextField
                label="De"
                type="date"
                size="small"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(0);
                }}
                InputLabelProps={{ shrink: true }}
                sx={{ width: { xs: '100%', sm: 150 } }}
              />
              <TextField
                label="Até"
                type="date"
                size="small"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(0);
                }}
                InputLabelProps={{ shrink: true }}
                sx={{ width: { xs: '100%', sm: 150 } }}
              />
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 230, width: { xs: '100%', sm: 'auto' } }}>
                <InputLabel id="sort-select-label">Organizar por</InputLabel>
                <Select
                  labelId="sort-select-label"
                  label="Organizar por"
                  value={`${sortBy}:${sortOrder}`}
                  onChange={(e) => handleQuickSortSelect(e.target.value)}
                >
                  <MenuItem value="created_at:DESC">Data de Entrada: Mais recentes</MenuItem>
                  <MenuItem value="created_at:ASC">Data de Entrada: Mais antigos</MenuItem>
                  <MenuItem value="name:ASC">Nome: A - Z</MenuItem>
                  <MenuItem value="name:DESC">Nome: Z - A</MenuItem>
                  <MenuItem value="price:DESC">Preço: Maior primeiro</MenuItem>
                  <MenuItem value="price:ASC">Preço: Menor primeiro</MenuItem>
                  <MenuItem value="stock_quantity:DESC">Stock: Maior quantidade</MenuItem>
                  <MenuItem value="stock_quantity:ASC">Stock: Menor quantidade</MenuItem>
                  <MenuItem value="expiry_date:ASC">Validade: Mais próxima</MenuItem>
                </Select>
              </FormControl>

              {hasActiveFilters && (
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  startIcon={<FilterAltOffOutlinedIcon />}
                  onClick={clearAllFilters}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Limpar
                </Button>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Box>

      {/* Indicador de carregamento */}
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      {/* Tabela de Produtos */}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={sortBy === 'name'}
                direction={sortBy === 'name' ? (sortOrder.toLowerCase() as 'asc' | 'desc') : 'asc'}
                onClick={() => handleSortChange('name')}
              >
                Produto
              </TableSortLabel>
            </TableCell>
            <TableCell>Código de barras</TableCell>
            <TableCell>Categoria</TableCell>
            <TableCell align="center">
              <TableSortLabel
                active={sortBy === 'created_at'}
                direction={sortBy === 'created_at' ? (sortOrder.toLowerCase() as 'asc' | 'desc') : 'desc'}
                onClick={() => handleSortChange('created_at')}
              >
                Data de Entrada
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortBy === 'price'}
                direction={sortBy === 'price' ? (sortOrder.toLowerCase() as 'asc' | 'desc') : 'desc'}
                onClick={() => handleSortChange('price')}
              >
                Preço (c/ IVA)
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">Custo</TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortBy === 'stock_quantity'}
                direction={sortBy === 'stock_quantity' ? (sortOrder.toLowerCase() as 'asc' | 'desc') : 'desc'}
                onClick={() => handleSortChange('stock_quantity')}
              >
                Stock
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">IVA</TableCell>
            <TableCell align="center">
              <TableSortLabel
                active={sortBy === 'expiry_date'}
                direction={sortBy === 'expiry_date' ? (sortOrder.toLowerCase() as 'asc' | 'desc') : 'asc'}
                onClick={() => handleSortChange('expiry_date')}
              >
                Validade
              </TableSortLabel>
            </TableCell>
            <TableCell align="center">Estado</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!loading && products.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                {hasActiveFilters
                  ? 'Nenhum produto encontrado com os filtros aplicados.'
                  : 'Nenhum produto registado.'}
              </TableCell>
            </TableRow>
          )}
          {products.map((product) => {
            const lowStock = product.is_active && product.stock_quantity <= product.min_stock_alert;
            const expiryDays = product.expiry_date ? daysUntil(product.expiry_date) : null;
            const expiryUrgent = expiryDays !== null && expiryDays <= EXPIRY_WARNING_WINDOW_DAYS;

            return (
              <TableRow key={product.id} hover sx={{ opacity: product.is_active ? 1 : 0.6 }}>
                <TableCell sx={{ fontWeight: 500 }}>{product.name}</TableCell>
                <TableCell>{product.barcode ?? '-'}</TableCell>
                <TableCell>{product.category ?? '-'}</TableCell>
                <TableCell align="center">
                  <Tooltip title={`Registado em: ${formatDateTime(product.created_at)}`}>
                    <Typography variant="body2" sx={{ cursor: 'help' }}>
                      {formatDate(product.created_at)}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">{formatMzn(product.price)}</TableCell>
                <TableCell align="right">{formatMzn(product.cost_price)}</TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    label={`${formatQuantity(product.stock_quantity)} ${PRODUCT_UNIT_ABBREVIATIONS[product.unit]}`}
                    color={lowStock ? 'warning' : 'default'}
                    variant={lowStock ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell align="right">{Math.round(product.tax_rate * 10000) / 100}%</TableCell>
                <TableCell align="center">
                  {product.expiry_date ? (
                    <Chip
                      size="small"
                      label={
                        expiryDays !== null && expiryDays < 0
                          ? 'Expirado'
                          : new Date(`${product.expiry_date}T00:00:00`).toLocaleDateString('pt-MZ')
                      }
                      color={expiryUrgent ? 'error' : 'default'}
                      variant={expiryUrgent ? 'filled' : 'outlined'}
                    />
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={product.is_active ? 'Ativo' : 'Inativo'}
                    color={product.is_active ? 'success' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Entrada de stock (+)">
                    <IconButton size="small" color="primary" onClick={() => setStockEntryProduct(product)}>
                      <AddCircleOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {product.tracks_batches && (
                    <Tooltip title="Ver lotes">
                      <IconButton size="small" onClick={() => setLotsDialogProduct(product)}>
                        <Inventory2OutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
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

      {/* Paginação do Servidor */}
      <TablePagination
        component="div"
        count={totalProducts}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Linhas por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`}
        sx={{ borderTop: 1, borderColor: 'divider', mt: 1 }}
      />

      <ProductFormDialog
        open={dialogOpen}
        mode={dialogMode}
        product={editingProduct}
        defaultTaxRatePercent={defaultTaxRatePercent}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />

      <ProductLotsDialog
        open={Boolean(lotsDialogProduct)}
        product={lotsDialogProduct}
        onClose={() => setLotsDialogProduct(null)}
        onLotsChanged={loadProducts}
      />

      <StockEntryDialog
        open={Boolean(stockEntryProduct)}
        product={stockEntryProduct}
        onClose={() => setStockEntryProduct(null)}
        onSuccess={(msg) => {
          setFeedback({ severity: 'success', message: msg });
          loadProducts();
        }}
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
