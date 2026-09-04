import { env } from '../config/env';

/**
 * Arredonda um valor monetário a 2 casas decimais evitando erros de
 * vírgula flutuante (ex: 0.1 + 0.2).
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula o valor do IVA embutido num determinado montante final (o IVA já
 * incluído no preço, não um imposto a somar por cima).
 * @param finalAmount Valor final, já com IVA incluído (o que o cliente paga).
 * @param rate Taxa de IVA aplicada (ex: 0.16 para 16%). Usa o valor
 *             configurado por omissão (IVA_RATE) quando não informado.
 */
export function calculateIva(finalAmount: number, rate: number = env.ivaRate): number {
  const base = roundCurrency(finalAmount / (1 + rate));
  return roundCurrency(finalAmount - base);
}

export interface LineItemTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

/**
 * Calcula o total, o IVA e a base (sem IVA) de uma linha de venda, dado o
 * preço unitário, a quantidade e a taxa de imposto específica do produto.
 *
 * `unitPrice` é o preço de venda tal como registado no produto — já com IVA
 * incluído, é o valor efetivamente cobrado ao cliente por unidade (prática
 * comum no retalho: o preço afixado é o preço final). O IVA e a base são
 * calculados "para trás" a partir desse total, só para efeitos de
 * discriminação na fatura/recibo — nunca são somados por cima do preço.
 */
export function calculateLineTotals(unitPrice: number, quantity: number, taxRate: number): LineItemTotals {
  const total = roundCurrency(unitPrice * quantity);
  const taxAmount = calculateIva(total, taxRate);
  const subtotal = roundCurrency(total - taxAmount);

  return { subtotal, taxAmount, total };
}
