export enum UserRole {
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER',
  MANAGER = 'MANAGER',
  // Não pertence a nenhum tenant (tenant_id fica null) — é a conta do dono
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
 * Como uma venda paga por M-Pesa/e-Mola foi efetivamente recebida — reflete
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
