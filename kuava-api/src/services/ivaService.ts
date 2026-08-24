import { env } from '../config/env';

/**
 * Arredonda um valor monetário a 2 casas decimais evitando erros de
 * vírgula flutuante (ex: 0.1 + 0.2).
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula o valor do IVA sobre um determinado montante base.
 * @param baseAmount Valor base (sem imposto).
 * @param rate Taxa de IVA a aplicar (ex: 0.16 para 16%). Usa o valor
 *             configurado por omissão (IVA_RATE) quando não informado.
 */
export function calculateIva(baseAmount: number, rate: number = env.ivaRate): number {
  return roundCurrency(baseAmount * rate);
}

export interface LineItemTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

/**
 * Calcula o subtotal, o IVA e o total de uma linha de venda, dado o preço
 * unitário, a quantidade e a taxa de imposto específica do produto.
 */
export function calculateLineTotals(unitPrice: number, quantity: number, taxRate: number): LineItemTotals {
  const subtotal = roundCurrency(unitPrice * quantity);
  const taxAmount = calculateIva(subtotal, taxRate);
  const total = roundCurrency(subtotal + taxAmount);

  return { subtotal, taxAmount, total };
}
