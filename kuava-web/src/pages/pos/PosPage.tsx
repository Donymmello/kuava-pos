import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Divider, Grid, Snackbar, Stack, Typography, Alert } from '@mui/material';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useOfflineStore } from '../../store/useOfflineStore';
import { fetchProducts } from '../../services/productService';
import { registerSale, RegisterSalePayload } from '../../services/saleService';
import { fetchTenant } from '../../services/tenantService';
import { cacheProducts, cacheTenant, decrementCachedStock, getCachedProducts, getCachedTenant } from '../../db/offlineDb';
import { extractErrorMessage, isNetworkError } from '../../utils/networkError';
import { buildLocalSalePreview } from '../../utils/offlineSale';
import { isMobileMoneyMethod, MobileMoneyFlow, Product, Sale, Tenant } from '../../types';
import { formatMzn } from '../../utils/currency';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import BarcodeSearchInput from '../../components/pos/BarcodeSearchInput';
import ProductGrid from '../../components/pos/ProductGrid';
import CartTable from '../../components/pos/CartTable';
import PaymentMethodSelector from '../../components/pos/PaymentMethodSelector';
import MobileMoneyDetailsForm from '../../components/pos/MobileMoneyDetailsForm';
import SaleSuccessDialog from '../../components/pos/SaleSuccessDialog';
import ThermalReceipt from '../../components/invoices/ThermalReceipt';

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isFinalizingSale, setIsFinalizingSale] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [usingOfflineCatalog, setUsingOfflineCatalog] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const { searchValue, setSearchValue, submitSearch } = useBarcodeScanner();

  const currentUser = useAuthStore((state) => state.user);
  const isOnline = useOfflineStore((state) => state.isOnline);

  const items = useCartStore((state) => state.items);
  const paymentMethod = useCartStore((state) => state.paymentMethod);
  const mobileMoneyFlow = useCartStore((state) => state.mobileMoneyFlow);
  const paymentReference = useCartStore((state) => state.paymentReference);
  const agentMarginAmount = useCartStore((state) => state.agentMarginAmount);
  const lastError = useCartStore((state) => state.lastError);
  const isAddingByBarcode = useCartStore((state) => state.isAddingByBarcode);
  const addProduct = useCartStore((state) => state.addProduct);
  const incrementQuantity = useCartStore((state) => state.incrementQuantity);
  const decrementQuantity = useCartStore((state) => state.decrementQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const setPaymentMethod = useCartStore((state) => state.setPaymentMethod);
  const setMobileMoneyFlow = useCartStore((state) => state.setMobileMoneyFlow);
  const setPaymentReference = useCartStore((state) => state.setPaymentReference);
  const setAgentMarginAmount = useCartStore((state) => state.setAgentMarginAmount);
  const clearCart = useCartStore((state) => state.clearCart);
  const clearError = useCartStore((state) => state.clearError);
  const getTotals = useCartStore((state) => state.getTotals);

  const totals = getTotals();

  const needsMobileMoneyDetails = isMobileMoneyMethod(paymentMethod);
  // Referência e margem são opcionais — o caixa pode finalizar sem as
  // preencher, para não atrasar o atendimento. Só bloqueia se o caixa TIVER
  // escrito um valor de margem que não faz sentido (negativo). Aceita
  // vírgula como separador decimal (comum em português) além do ponto.
  const normalizedMargin = agentMarginAmount.trim().replace(',', '.');
  const marginTyped = normalizedMargin !== '';
  const parsedAgentMargin = marginTyped ? Number(normalizedMargin) : undefined;
  const paymentDetailsError =
    needsMobileMoneyDetails &&
    mobileMoneyFlow === MobileMoneyFlow.AGENT &&
    marginTyped &&
    (Number.isNaN(parsedAgentMargin) || (parsedAgentMargin as number) < 0)
      ? 'Indica um valor de margem válido (não pode ser negativo).'
      : null;

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const result = await fetchProducts();
      setProducts(result);
      setUsingOfflineCatalog(false);
      cacheProducts(result).catch(() => undefined);
    } catch (error) {
      if (isNetworkError(error)) {
        // Sem ligação — usa o catálogo guardado localmente da última vez
        // que a app esteve online, para o balcão não parar de vender.
        const cached = await getCachedProducts();
        setProducts(cached);
        setUsingOfflineCatalog(true);
      }
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    // Dados do estabelecimento para o cabeçalho da fatura/recibo pós-venda;
    // se a rede falhar usa a última cópia guardada localmente.
    fetchTenant()
      .then((result) => {
        setTenant(result);
        cacheTenant(result).catch(() => undefined);
      })
      .catch(async (error) => {
        if (isNetworkError(error)) {
          const cached = await getCachedTenant();
          if (cached) {
            setTenant(cached);
          }
        }
      });
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const term = searchValue.trim().toLowerCase();
    if (!term) {
      return products;
    }
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) || product.barcode?.toLowerCase().includes(term),
    );
  }, [products, searchValue]);

  const handleFinalizeSale = useCallback(async () => {
    if (items.length === 0 || isFinalizingSale || paymentDetailsError) {
      return;
    }

    setIsFinalizingSale(true);
    const cartItems = items;
    const cartTotals = getTotals();
    const payload: RegisterSalePayload = {
      payment_method: paymentMethod,
      items: cartItems.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
      mobile_money_flow: needsMobileMoneyDetails ? mobileMoneyFlow ?? undefined : undefined,
      payment_reference:
        needsMobileMoneyDetails && mobileMoneyFlow === MobileMoneyFlow.TRANSFER && paymentReference.trim()
          ? paymentReference.trim()
          : undefined,
      agent_margin_amount:
        needsMobileMoneyDetails && mobileMoneyFlow === MobileMoneyFlow.AGENT ? parsedAgentMargin : undefined,
    };

    try {
      const sale = await registerSale(payload);
      clearCart();
      setCompletedSale(sale);
      await loadProducts();
    } catch (error) {
      if (isNetworkError(error)) {
        // Sem ligação — guarda a venda localmente; sincroniza sozinha quando
        // a rede voltar (ver useOfflineStore).
        const pending = await useOfflineStore.getState().queueSale(payload);
        await decrementCachedStock(payload.items);

        setProducts((current) =>
          current.map((product) => {
            const cartItem = cartItems.find((item) => item.productId === product.id);
            if (!cartItem) {
              return product;
            }
            return { ...product, stock_quantity: Math.max(0, product.stock_quantity - cartItem.quantity) };
          }),
        );

        clearCart();
        setCompletedSale(
          buildLocalSalePreview({
            clientRef: pending.clientRef,
            items: cartItems,
            paymentMethod,
            totals: cartTotals,
            cashierId: currentUser?.id ?? '',
            cashierName: currentUser?.name ?? '—',
            mobileMoneyFlow: payload.mobile_money_flow ?? null,
            paymentReference: payload.payment_reference ?? null,
            agentMarginAmount: payload.agent_margin_amount ?? null,
          }),
        );
      } else {
        useCartStore.setState({
          lastError: extractErrorMessage(error) ?? 'Não foi possível finalizar a venda. Tente novamente.',
        });
      }
    } finally {
      setIsFinalizingSale(false);
    }
  }, [
    items,
    isFinalizingSale,
    paymentDetailsError,
    paymentMethod,
    needsMobileMoneyDetails,
    mobileMoneyFlow,
    paymentReference,
    parsedAgentMargin,
    clearCart,
    loadProducts,
    getTotals,
    currentUser,
  ]);

  useKeyboardShortcuts({
    F2: () => searchInputRef.current?.focus(),
    F9: () => handleFinalizeSale(),
    Escape: () => clearCart(),
  });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Grid container sx={{ flex: 1, overflow: 'hidden' }}>
        <Grid item xs={12} md={8} sx={{ height: '100%', overflowY: 'auto', p: 2 }}>
          <Stack spacing={2} sx={{ height: '100%' }}>
            {(!isOnline || usingOfflineCatalog) && (
              <Alert severity="warning" icon={<CloudOffOutlinedIcon fontSize="small" />} sx={{ py: 0 }}>
                Sem ligação — a vender a partir do catálogo guardado localmente. As vendas ficam
                guardadas neste dispositivo e sincronizam automaticamente quando a rede voltar.
              </Alert>
            )}
            <BarcodeSearchInput
              ref={searchInputRef}
              value={searchValue}
              onChange={setSearchValue}
              onSubmit={submitSearch}
              loading={isAddingByBarcode}
            />
            <ProductGrid products={filteredProducts} loading={loadingProducts} onSelect={addProduct} />
          </Stack>
        </Grid>

        <Grid
          item
          xs={12}
          md={4}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: { md: 1 },
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <CartTable
              items={items}
              onIncrement={incrementQuantity}
              onDecrement={decrementQuantity}
              onRemove={removeItem}
            />
          </Box>

          <Divider />

          <Box sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Stack spacing={0.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography variant="body2">{formatMzn(totals.subtotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    IVA
                  </Typography>
                  <Typography variant="body2">{formatMzn(totals.taxTotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" color="primary.main">
                    {formatMzn(totals.total)}
                  </Typography>
                </Stack>
              </Stack>

              <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />

              {needsMobileMoneyDetails && (
                <MobileMoneyDetailsForm
                  flow={mobileMoneyFlow}
                  paymentReference={paymentReference}
                  agentMarginAmount={agentMarginAmount}
                  onFlowChange={setMobileMoneyFlow}
                  onPaymentReferenceChange={setPaymentReference}
                  onAgentMarginAmountChange={setAgentMarginAmount}
                  marginError={paymentDetailsError}
                />
              )}

              <Button
                variant="contained"
                size="large"
                color="primary"
                disabled={items.length === 0 || isFinalizingSale || Boolean(paymentDetailsError)}
                onClick={handleFinalizeSale}
              >
                {isFinalizingSale ? 'A finalizar…' : `Finalizar Venda (F9) — ${formatMzn(totals.total)}`}
              </Button>
            </Stack>
          </Box>
        </Grid>
      </Grid>

      <Snackbar open={Boolean(lastError)} autoHideDuration={4000} onClose={clearError}>
        <Alert severity="error" onClose={clearError} variant="filled">
          {lastError}
        </Alert>
      </Snackbar>

      <SaleSuccessDialog
        sale={completedSale}
        tenant={tenant}
        onPrintReceipt={() => window.print()}
        onClose={() => setCompletedSale(null)}
      />

      <ThermalReceipt sale={completedSale} tenant={tenant} />
    </Box>
  );
}
