import crypto from 'crypto';
import { env } from '../config/env';
import { sequelize, SubscriptionRequest, Tenant } from '../models';
import { SubscriptionPlan, SUBSCRIPTION_PLAN_DURATION_DAYS, SubscriptionRequestStatus } from '../types/enums';
import { AppError } from '../utils/AppError';

// Sem os caracteres ambíguos (0/O, 1/l/I), a referência vai ser copiada e
// colada (ou lida à mão) para a descrição de uma transferência bancária,
// mesmo cuidado do TEMP_PASSWORD_ALPHABET em superadminService.ts.
const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const REFERENCE_LENGTH = 6;
const MAX_REFERENCE_ATTEMPTS = 5;

const PLAN_PRICING: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.MONTHLY]: env.billing.monthlyPriceMzn,
  [SubscriptionPlan.ANNUAL]: env.billing.annualPriceMzn,
};

export interface SubscriptionStatus {
  hasAccess: boolean;
  trialEndsAt: Date | null;
  subscriptionExpiresAt: Date | null;
  pendingRequest: SubscriptionRequest | null;
  plans: Array<{ plan: SubscriptionPlan; priceMzn: number }>;
  bankDetails: { bankName: string; accountHolder: string; nib: string };
}

/**
 * Se o tenant tem acesso agora, por trial ainda válido ou por subscrição
 * paga ainda não expirada, os dois são independentes (não se somam, o
 * acesso simplesmente continua enquanto qualquer um dos dois for válido).
 */
export function hasActiveAccess(
  tenant: Pick<Tenant, 'trial_ends_at' | 'subscription_expires_at'>,
  now: Date = new Date(),
): boolean {
  const trialValid = Boolean(tenant.trial_ends_at) && now <= new Date(tenant.trial_ends_at as Date);
  const subscriptionValid =
    Boolean(tenant.subscription_expires_at) && now <= new Date(tenant.subscription_expires_at as Date);
  return trialValid || subscriptionValid;
}

function generateReferenceCandidate(): string {
  const bytes = crypto.randomBytes(REFERENCE_LENGTH);
  let code = '';
  for (let i = 0; i < REFERENCE_LENGTH; i += 1) {
    code += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  }
  return `KV-${code}`;
}

async function generateUniqueReference(): Promise<string> {
  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    const candidate = generateReferenceCandidate();
    // eslint-disable-next-line no-await-in-loop
    const existing = await SubscriptionRequest.findOne({ where: { reference: candidate } });
    if (!existing) {
      return candidate;
    }
  }
  throw new AppError('Não foi possível gerar uma referência única para o pedido, tente novamente', 500);
}

export async function getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus> {
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    throw new AppError('Estabelecimento não encontrado', 404);
  }

  const pendingRequest = await SubscriptionRequest.findOne({
    where: { tenant_id: tenantId, status: SubscriptionRequestStatus.PENDING },
    order: [['created_at', 'DESC']],
  });

  return {
    hasAccess: hasActiveAccess(tenant),
    trialEndsAt: tenant.trial_ends_at,
    subscriptionExpiresAt: tenant.subscription_expires_at,
    pendingRequest,
    plans: Object.values(SubscriptionPlan).map((plan) => ({ plan, priceMzn: PLAN_PRICING[plan] })),
    bankDetails: {
      bankName: env.billing.bankName,
      accountHolder: env.billing.bankAccountHolder,
      nib: env.billing.bankNib,
    },
  };
}

/**
 * Cria um novo pedido (fatura pro-forma) para o plano escolhido. Um tenant
 * só tem um pedido PENDING de cada vez, um pedido novo cancela
 * automaticamente qualquer um anterior ainda por confirmar (ex.: o cliente
 * mudou de mensal para anual antes de pagar), para a lista do superadmin
 * não acumular pedidos obsoletos do mesmo tenant.
 */
export async function createSubscriptionRequest(
  tenantId: string,
  plan: SubscriptionPlan,
): Promise<SubscriptionRequest> {
  if (!Object.values(SubscriptionPlan).includes(plan)) {
    throw new AppError('Plano inválido', 422);
  }

  return sequelize.transaction(async (transaction) => {
    const tenant = await Tenant.findByPk(tenantId, { transaction });
    if (!tenant) {
      throw new AppError('Estabelecimento não encontrado', 404);
    }

    await SubscriptionRequest.update(
      { status: SubscriptionRequestStatus.CANCELLED },
      { where: { tenant_id: tenantId, status: SubscriptionRequestStatus.PENDING }, transaction },
    );

    const reference = await generateUniqueReference();

    return SubscriptionRequest.create(
      {
        tenant_id: tenantId,
        plan,
        amount: PLAN_PRICING[plan],
        reference,
        status: SubscriptionRequestStatus.PENDING,
        confirmed_at: null,
      },
      { transaction },
    );
  });
}

/** Para o painel de superadmin: os pedidos ainda por confirmar/cancelar, mais antigos primeiro. */
export async function listPendingSubscriptionRequests(): Promise<SubscriptionRequest[]> {
  return SubscriptionRequest.findAll({
    where: { status: SubscriptionRequestStatus.PENDING },
    include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'name', 'nuit'] }],
    order: [['created_at', 'ASC']],
  });
}

/**
 * O superadmin confirma depois de ver o pagamento chegar (referência na
 * descrição da transferência). Estende subscription_expires_at a partir de
 * onde a subscrição atual já estava (uma renovação antecipada não perde os
 * dias já pagos), ou a partir de agora se já tinha expirado ou nunca
 * existiu.
 */
export async function confirmSubscriptionRequest(
  requestId: string,
): Promise<{ tenant: Tenant; request: SubscriptionRequest }> {
  return sequelize.transaction(async (transaction) => {
    const request = await SubscriptionRequest.findByPk(requestId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!request) {
      throw new AppError('Pedido de assinatura não encontrado', 404);
    }
    if (request.status !== SubscriptionRequestStatus.PENDING) {
      throw new AppError('Este pedido já foi confirmado ou cancelado', 409);
    }

    const tenant = await Tenant.findByPk(request.tenant_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!tenant) {
      throw new AppError('Estabelecimento não encontrado', 404);
    }

    const now = new Date();
    const base =
      tenant.subscription_expires_at && new Date(tenant.subscription_expires_at) > now
        ? new Date(tenant.subscription_expires_at)
        : now;
    const durationDays = SUBSCRIPTION_PLAN_DURATION_DAYS[request.plan];
    const newExpiry = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);

    tenant.subscription_expires_at = newExpiry;
    await tenant.save({ transaction });

    request.status = SubscriptionRequestStatus.CONFIRMED;
    request.confirmed_at = now;
    await request.save({ transaction });

    return { tenant, request };
  });
}

/** O superadmin usa isto para descartar um pedido enganado/obsoleto sem confirmar pagamento nenhum. */
export async function cancelSubscriptionRequest(requestId: string): Promise<SubscriptionRequest> {
  const request = await SubscriptionRequest.findByPk(requestId);
  if (!request) {
    throw new AppError('Pedido de assinatura não encontrado', 404);
  }
  if (request.status !== SubscriptionRequestStatus.PENDING) {
    throw new AppError('Este pedido já foi confirmado ou cancelado', 409);
  }

  request.status = SubscriptionRequestStatus.CANCELLED;
  await request.save();
  return request;
}
