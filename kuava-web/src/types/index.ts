export enum UserRole {
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER',
  MANAGER = 'MANAGER',
  // Conta do dono da plataforma Kuava, sem tenant_id, gere a lista de
  // estabelecimentos em /superadmin, nunca aparece dentro de um tenant.
  SUPERADMIN = 'SUPERADMIN',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.CASHIER]: 'Caixa',
  [UserRole.MANAGER]: 'Gerente',
  [UserRole.SUPERADMIN]: 'Superadmin',
};

// Papéis que um ADMIN de estabelecimento pode atribuir a um utilizador seu
// (usado no formulário de gestão de utilizadores), nunca SUPERADMIN, que
// não pertence a nenhum tenant e só existe pelo script seedSuperadmin.ts. A
// API já rejeita isto (422), mas nem sequer deve aparecer como opção.
export const TENANT_ASSIGNABLE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  // null só para SUPERADMIN.
  tenantId: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  nuit: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  default_tax_rate: number;
  is_active: boolean;
  // Plano/trial (2026-08-24): trial_ends_at é null para estabelecimentos
  // registados antes desta funcionalidade, nunca ficam bloqueados por isto.
  trial_ends_at: string | null;
  // Substitui o antigo subscription_active booleano (2026-09-09): null
  // quando não há plano pago em vigor, uma data quando há (ver
  // subscriptionService.ts no backend).
  subscription_expires_at: string | null;
  created_at: string;
}

// Vista simplificada de um tenant, devolvida por /api/superadmin/tenants,
// sem default_tax_rate (não é relevante para o superadmin gerir).
export interface SuperadminTenant {
  id: string;
  name: string;
  nuit: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  trial_ends_at: string | null;
  subscription_expires_at: string | null;
  created_at: string;
}

/**
 * Plano da subscrição da plataforma Kuava (2026-09-09). O cliente escolhe
 * um destes, recebe uma fatura pro-forma com uma referência e paga por
 * fora, o superadmin confirma manualmente (ver SubscriptionPage.tsx).
 */
export enum SubscriptionPlan {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
}

export const SUBSCRIPTION_PLAN_LABELS: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.MONTHLY]: 'Mensal',
  [SubscriptionPlan.ANNUAL]: 'Anual',
};

export enum SubscriptionRequestStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export interface SubscriptionRequest {
  id: string;
  plan: SubscriptionPlan;
  amount: number;
  reference: string;
  status: SubscriptionRequestStatus;
  created_at: string;
  confirmed_at: string | null;
}

/** Igual a SubscriptionRequest, mas com o tenant incluído — só na listagem do superadmin. */
export interface SuperadminSubscriptionRequest extends SubscriptionRequest {
  tenant: { id: string; name: string; nuit: string } | null;
}

export interface SubscriptionPlanOption {
  plan: SubscriptionPlan;
  priceMzn: number;
}

export interface SubscriptionBankDetails {
  bankName: string;
  accountHolder: string;
  nib: string;
}

export interface SubscriptionStatus {
  hasAccess: boolean;
  trialEndsAt: string | null;
  subscriptionExpiresAt: string | null;
  pendingRequest: SubscriptionRequest | null;
  plans: SubscriptionPlanOption[];
  bankDetails: SubscriptionBankDetails;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

/**
 * TRANSFER cobre qualquer pagamento recebido por transferência (M-Pesa,
 * e-Mola, banco, ou o que o comerciante usar), decisão de 2026-09-09: o
 * Kuava não distingue operadora nem mecanismo (Paga Fácil, agente,
 * PaySuite, etc.), isso é escolha de cada comerciante. Só guarda uma
 * referência livre e opcional (ver `payment_reference` em `Sale`).
 */
export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Numerário',
  [PaymentMethod.CARD]: 'Cartão',
  [PaymentMethod.TRANSFER]: 'Transferência',
};

/**
 * Unidade de medida em que um produto é vendido. A maioria (mercearias,
 * bottle stores) vende por unidade inteira (UN); ferragens e negócios
 * semelhantes muitas vezes vendem por peso/comprimento (arame por metro,
 * prego por kg, tinta por litro), nesses casos a quantidade pode ser
 * fracionária (ex.: 2.5 kg), o que UN não permite.
 */
export enum ProductUnit {
  UN = 'UN',
  KG = 'KG',
  G = 'G',
  L = 'L',
  M = 'M',
}

export const PRODUCT_UNIT_LABELS: Record<ProductUnit, string> = {
  [ProductUnit.UN]: 'Unidade',
  [ProductUnit.KG]: 'Quilograma (kg)',
  [ProductUnit.G]: 'Grama (g)',
  [ProductUnit.L]: 'Litro (l)',
  [ProductUnit.M]: 'Metro (m)',
};

/** Abreviatura curta para mostrar junto da quantidade (ex.: "2,5 kg"). */
export const PRODUCT_UNIT_ABBREVIATIONS: Record<ProductUnit, string> = {
  [ProductUnit.UN]: 'un.',
  [ProductUnit.KG]: 'kg',
  [ProductUnit.G]: 'g',
  [ProductUnit.L]: 'l',
  [ProductUnit.M]: 'm',
};

export function isFractionalUnit(unit: ProductUnit): boolean {
  return unit !== ProductUnit.UN;
}

export interface Product {
  id: string;
  tenant_id: string;
  barcode: string | null;
  name: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  tax_rate: number;
  category: string | null;
  unit: ProductUnit;
  /**
   * "AAAA-MM-DD", ou null quando não há validade a controlar. Quando
   * tracks_batches é true, este valor vem sozinho do lote mais próximo de
   * vencer (ver ProductLot), não é editável diretamente.
   */
  expiry_date: string | null;
  is_active: boolean;
  image_url?: string | null;
  /**
   * Controle por lotes (opcional por produto): quando true, stock_quantity
   * e expiry_date vêm da soma/validade mais próxima entre os ProductLot
   * deste produto, geridos em "Ver lotes" no Inventário.
   */
  tracks_batches: boolean;
}

export interface ProductLot {
  id: string;
  product_id: string;
  quantity: number;
  /** "AAAA-MM-DD", ou null quando este lote não tem validade indicada (fica para o fim ao vender, ver backend). */
  expiry_date: string | null;
  created_at: string;
}

export interface CartItem {
  productId: string;
  barcode: string | null;
  name: string;
  unitPrice: number;
  taxRate: number;
  quantity: number;
  stockQuantity: number;
  unit: ProductUnit;
  imageUrl?: string | null;
}

// Cobre as duas formas devolvidas pela API: a criação de venda (POST /sales)
// devolve items com product_name direto; a listagem/detalhe (GET /sales)
// devolve o produto associado via Sequelize (items[].product.name).
export interface SaleItemResult {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_name?: string;
  product?: { id: string; name: string } | null;
}

export type SaleStatus = 'COMPLETED' | 'CANCELLED';

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

export interface Sale {
  id: string;
  tenant_id: string;
  user_id: string;
  total_amount: number;
  tax_amount: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  payment_reference: string | null;
  created_at: string;
  user?: { id: string; name: string; email: string } | null;
  items: SaleItemResult[];
  /** Só presente no lado do cliente: verdadeiro para uma venda feita offline, ainda não sincronizada com o servidor. */
  pending_sync?: boolean;
}

export function getSaleItemProductName(item: SaleItemResult): string {
  return item.product_name ?? item.product?.name ?? 'Produto removido';
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  message: string;
  errors?: unknown;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SalesSummary {
  totalAmount: number;
  count: number;
}

export interface DailySales {
  date: string;
  totalAmount: number;
}

export interface PaymentMethodTotal {
  paymentMethod: PaymentMethod;
  totalAmount: number;
  count: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantitySold: number;
}

export interface ExpiringProduct {
  productId: string;
  name: string;
  /** "AAAA-MM-DD" */
  expiryDate: string;
  /** Negativo quando já expirou. */
  daysUntilExpiry: number;
}

export interface DashboardSummary {
  today: SalesSummary;
  month: SalesSummary & { averageTicket: number };
  last7Days: DailySales[];
  paymentMethodBreakdown: PaymentMethodTotal[];
  topProducts: TopProduct[];
  lowStockCount: number;
  expiringCount: number;
  expiringProducts: ExpiringProduct[];
}
