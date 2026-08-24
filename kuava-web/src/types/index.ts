export enum UserRole {
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER',
  MANAGER = 'MANAGER',
  // Conta do dono da plataforma Kuava, sem tenant_id — gere a lista de
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
// (usado no formulário de gestão de utilizadores) — nunca SUPERADMIN, que
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
  // registados antes desta funcionalidade — nunca ficam bloqueados por isto.
  trial_ends_at: string | null;
  subscription_active: boolean;
  created_at: string;
}

// Vista simplificada de um tenant, devolvida por /api/superadmin/tenants —
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
  subscription_active: boolean;
  created_at: string;
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

export enum PaymentMethod {
  CASH = 'CASH',
  MPESA = 'MPESA',
  EMOLA = 'EMOLA',
  CARD = 'CARD',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Numerário',
  [PaymentMethod.MPESA]: 'M-Pesa',
  [PaymentMethod.EMOLA]: 'e-Mola',
  [PaymentMethod.CARD]: 'Cartão',
};

export function isMobileMoneyMethod(method: PaymentMethod): boolean {
  return method === PaymentMethod.MPESA || method === PaymentMethod.EMOLA;
}

/**
 * Como um pagamento M-Pesa/e-Mola foi efetivamente recebido — não existe uma
 * API C2B simples para um POS pequeno se ligar, por isso a confirmação é
 * sempre manual: ou o cliente transferiu para o número da loja, ou a loja
 * atuou como agente (o cliente levantou e a loja ficou com uma margem).
 */
export enum MobileMoneyFlow {
  TRANSFER = 'TRANSFER',
  AGENT = 'AGENT',
}

export const MOBILE_MONEY_FLOW_LABELS: Record<MobileMoneyFlow, string> = {
  [MobileMoneyFlow.TRANSFER]: 'Transferência',
  [MobileMoneyFlow.AGENT]: 'Agente (levantamento)',
};

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
  is_active: boolean;
  image_url?: string | null;
}

export interface CartItem {
  productId: string;
  barcode: string | null;
  name: string;
  unitPrice: number;
  taxRate: number;
  quantity: number;
  stockQuantity: number;
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
  mobile_money_flow: MobileMoneyFlow | null;
  payment_reference: string | null;
  agent_margin_amount: number | null;
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

export interface DashboardSummary {
  today: SalesSummary;
  month: SalesSummary & { averageTicket: number };
  last7Days: DailySales[];
  paymentMethodBreakdown: PaymentMethodTotal[];
  topProducts: TopProduct[];
  lowStockCount: number;
  agentMarginMonth: SalesSummary;
}
