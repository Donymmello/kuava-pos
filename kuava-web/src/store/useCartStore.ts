import { create } from 'zustand';
import { fetchProductByBarcode } from '../services/productService';
import { CartItem, isFractionalUnit, PaymentMethod, Product } from '../types';

/** Arredonda a 3 casas decimais (kg/g/l/m) ou ao inteiro mais próximo (UN), conforme a unidade do item. */
function roundQuantityForUnit(item: Pick<CartItem, 'unit'>, quantity: number): number {
  return isFractionalUnit(item.unit) ? Math.round((quantity + Number.EPSILON) * 1000) / 1000 : Math.round(quantity);
}

export interface CartTotals {
  subtotal: number;
  taxTotal: number;
  total: number;
  itemCount: number;
}

interface CartState {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  /** Referência livre e opcional, preenchida quando paymentMethod é TRANSFER. */
  paymentReference: string;
  lastError: string | null;
  isAddingByBarcode: boolean;

  addProduct: (product: Product, quantity?: number) => void;
  addProductByBarcode: (barcode: string) => Promise<boolean>;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setPaymentReference: (value: string) => void;
  clearCart: () => void;
  clearError: () => void;
  getTotals: () => CartTotals;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// item.unitPrice é o preço de venda do produto já com IVA incluído (o valor
// efetivamente cobrado por unidade), o total da venda é a soma direta das
// linhas; o IVA mostrado é só a fatia discriminada "para trás" a partir de
// cada linha, para a fatura/recibo, nunca somado por cima. Mantém a mesma
// lógica usada em kuava-api/src/services/ivaService.ts.
function computeTotals(items: CartItem[]): CartTotals {
  let total = 0;
  let taxTotal = 0;
  let itemCount = 0;

  for (const item of items) {
    const lineTotal = roundCurrency(item.unitPrice * item.quantity);
    const lineBase = roundCurrency(lineTotal / (1 + item.taxRate));
    const lineTax = roundCurrency(lineTotal - lineBase);

    total += lineTotal;
    taxTotal += lineTax;
    itemCount += item.quantity;
  }

  total = roundCurrency(total);
  taxTotal = roundCurrency(taxTotal);

  return {
    subtotal: roundCurrency(total - taxTotal),
    taxTotal,
    total,
    itemCount,
  };
}

function productToCartItem(product: Product, quantity: number): CartItem {
  return {
    productId: product.id,
    barcode: product.barcode,
    name: product.name,
    unitPrice: product.price,
    taxRate: product.tax_rate,
    quantity,
    stockQuantity: product.stock_quantity,
    unit: product.unit,
    imageUrl: product.image_url ?? null,
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  paymentMethod: PaymentMethod.CASH,
  paymentReference: '',
  lastError: null,
  isAddingByBarcode: false,

  addProduct: (product, quantity = 1) => {
    set((state) => {
      const existing = state.items.find((item) => item.productId === product.id);

      if (existing) {
        const nextQuantity = Math.min(existing.quantity + quantity, product.stock_quantity);
        return {
          items: state.items.map((item) =>
            item.productId === product.id ? { ...item, quantity: nextQuantity } : item,
          ),
        };
      }

      if (product.stock_quantity < 1) {
        return { lastError: `"${product.name}" está sem stock disponível` };
      }

      const initialQuantity = Math.min(quantity, product.stock_quantity);
      return { items: [...state.items, productToCartItem(product, initialQuantity)], lastError: null };
    });
  },

  addProductByBarcode: async (barcode) => {
    set({ isAddingByBarcode: true, lastError: null });
    try {
      const product = await fetchProductByBarcode(barcode);
      get().addProduct(product);
      set({ isAddingByBarcode: false });
      return true;
    } catch {
      set({
        isAddingByBarcode: false,
        lastError: `Nenhum produto encontrado para o código "${barcode}"`,
      });
      return false;
    }
  },

  incrementQuantity: (productId) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(item.quantity + 1, item.stockQuantity) }
          : item,
      ),
    }));
  },

  decrementQuantity: (productId) => {
    set((state) => ({
      items: state.items
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    }));
  },

  setQuantity: (productId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((item) => item.productId !== productId) };
      }

      return {
        items: state.items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: roundQuantityForUnit(item, Math.min(quantity, item.stockQuantity)) }
            : item,
        ),
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({ items: state.items.filter((item) => item.productId !== productId) }));
  },

  setPaymentMethod: (method) =>
    set((state) => ({
      paymentMethod: method,
      // Ao trocar para um método que não é TRANSFER, a referência deixa de
      // fazer sentido.
      paymentReference: method === PaymentMethod.TRANSFER ? state.paymentReference : '',
    })),

  setPaymentReference: (value) => set({ paymentReference: value }),

  clearCart: () => set({ items: [], lastError: null, paymentReference: '' }),

  clearError: () => set({ lastError: null }),

  getTotals: () => computeTotals(get().items),
}));
