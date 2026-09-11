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

/**
 * TRANSFER cobre qualquer pagamento recebido por transferência (M-Pesa,
 * e-Mola, banco, ou o que o comerciante usar), decisão de 2026-09-09: o
 * Kuava não distingue a operadora nem o mecanismo (Paga Fácil, agente,
 * PaySuite, etc.), isso é escolha de cada comerciante e não precisa de
 * integração nenhuma, só de um campo de referência livre (ver
 * `payment_reference` em `Sale`). Substitui os antigos MPESA/EMOLA
 * separados e o conceito de "agente"/margem retida.
 */
export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
}

export enum SaleStatus {
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Plano da subscrição da plataforma Kuava (não confundir com o
 * PaymentMethod, que é dos pagamentos das vendas no balcão). Decisão de
 * 2026-09-09: sem gateway integrado, o cliente escolhe o plano, recebe uma
 * fatura pro-forma com os dados bancários e uma referência única, paga por
 * fora, e o superadmin confirma manualmente (ver subscriptionService.ts).
 */
export enum SubscriptionPlan {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
}

/** Quantos dias uma confirmação de cada plano acrescenta a subscription_expires_at. */
export const SUBSCRIPTION_PLAN_DURATION_DAYS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.MONTHLY]: 30,
  [SubscriptionPlan.ANNUAL]: 365,
};

export enum SubscriptionRequestStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
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
