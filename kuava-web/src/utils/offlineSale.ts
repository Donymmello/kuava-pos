import { CartItem, MobileMoneyFlow, PaymentMethod, Sale, SaleItemResult } from '../types';
import { CartTotals } from '../store/useCartStore';

interface BuildLocalSalePreviewParams {
  clientRef: string;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  totals: CartTotals;
  cashierId: string;
  cashierName: string;
  mobileMoneyFlow?: MobileMoneyFlow | null;
  paymentReference?: string | null;
  agentMarginAmount?: number | null;
}

/**
 * Constrói um objeto `Sale` só para mostrar de imediato no ecrã de confirmação
 * (e para a fatura/recibo) de uma venda feita offline — antes de ter um id
 * real do servidor. Os totais vêm do cálculo local do carrinho (mesma lógica
 * de IVA usada em toda a POS); o servidor recalcula tudo de forma autoritativa
 * quando a venda for sincronizada.
 */
export function buildLocalSalePreview({
  clientRef,
  items,
  paymentMethod,
  totals,
  cashierId,
  cashierName,
  mobileMoneyFlow = null,
  paymentReference = null,
  agentMarginAmount = null,
}: BuildLocalSalePreviewParams): Sale {
  const saleItems: SaleItemResult[] = items.map((item, index) => ({
    id: `${clientRef}-${index}`,
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    subtotal: Math.round(item.unitPrice * item.quantity * 100) / 100,
    product_name: item.name,
  }));

  return {
    id: clientRef,
    tenant_id: '',
    user_id: cashierId,
    total_amount: totals.total,
    tax_amount: totals.taxTotal,
    payment_method: paymentMethod,
    status: 'COMPLETED',
    mobile_money_flow: mobileMoneyFlow,
    payment_reference: paymentReference,
    agent_margin_amount: agentMarginAmount,
    created_at: new Date().toISOString(),
    user: { id: cashierId, name: cashierName, email: '' },
    items: saleItems,
    pending_sync: true,
  };
}
