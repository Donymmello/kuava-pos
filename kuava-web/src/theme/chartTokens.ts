import { PaymentMethod } from '../types';

/**
 * Paleta categórica para identificar métodos de pagamento nos gráficos do
 * painel. A ordem é fixa (nunca reordenada por valor/ranking) e corresponde
 * aos 3 primeiros slots da paleta de referência validada pela skill de
 * dataviz, CVD ΔE e contraste confirmados com scripts/validate_palette.js
 * para os modos claro e escuro (ver notas em kuava_pos_backend.md).
 */
export const PAYMENT_METHOD_COLORS: Record<PaymentMethod, { light: string; dark: string }> = {
  [PaymentMethod.CASH]: { light: '#2a78d6', dark: '#3987e5' }, // slot 1 · azul
  [PaymentMethod.CARD]: { light: '#eda100', dark: '#c98500' }, // slot 2 · amarelo
  [PaymentMethod.TRANSFER]: { light: '#1baf7a', dark: '#199e70' }, // slot 3 · aqua
};

export function getPaymentMethodColor(method: PaymentMethod, mode: 'light' | 'dark'): string {
  return PAYMENT_METHOD_COLORS[method][mode];
}
