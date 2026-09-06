export enum UserRole {
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER',
  MANAGER = 'MANAGER',
  // Não pertence a nenhum tenant (tenant_id fica null), é a conta do dono
  // da plataforma Kuava, não a de um cliente. Gere a lista de
  // estabelecimentos em /api/superadmin, nunca dados de dentro de um
  // tenant. Nunca deve poder ser atribuído através das rotas normais de
  // criação/edição de utilizadores (ver userService.ts).
  SUPERADMIN = 'SUPERADMIN',
}

export enum PaymentMethod {
  CASH = 'CASH',
  MPESA = 'MPESA',
  EMOLA = 'EMOLA',
  CARD = 'CARD',
}

export enum SaleStatus {
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Como uma venda paga por M-Pesa/e-Mola foi efetivamente recebida, reflete
 * a prática comum em Moçambique, onde não existe uma API C2B simples de
 * ligar a um POS pequeno:
 * - TRANSFER: o cliente transfere para o número da loja; o caixa confere a
 *   notificação e confirma manualmente (com referência da SMS).
 * - AGENT: a loja funciona como agente e o cliente faz um levantamento; a
 *   loja fica com uma margem/comissão sobre o valor.
 */
export enum MobileMoneyFlow {
  TRANSFER = 'TRANSFER',
  AGENT = 'AGENT',
}

/**
 * Unidade de medida em que um produto é vendido. A maioria do retalho
 * (mercearias, bottle stores) vende por unidade inteira (UN); ferragens e
 * negócios semelhantes muitas vezes vendem por peso/comprimento (arame por
 * metro, prego por kg, tinta por litro), nesses casos a quantidade vendida
 * pode ser fracionária (ex.: 2.5 kg), o que UN não permite.
 */
export enum ProductUnit {
  UN = 'UN',
  KG = 'KG',
  G = 'G',
  L = 'L',
  M = 'M',
}

/** Unidades em que a quantidade pode ser fracionária, todas exceto UN. */
export const FRACTIONAL_PRODUCT_UNITS: ReadonlySet<ProductUnit> = new Set([
  ProductUnit.KG,
  ProductUnit.G,
  ProductUnit.L,
  ProductUnit.M,
]);

export function isFractionalUnit(unit: ProductUnit): boolean {
  return FRACTIONAL_PRODUCT_UNITS.has(unit);
}
