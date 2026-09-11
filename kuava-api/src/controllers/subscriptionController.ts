import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';
import { createSubscriptionRequest, getSubscriptionStatus } from '../services/subscriptionService';
import { SubscriptionPlan, SubscriptionRequestStatus } from '../types/enums';
import { SubscriptionRequest } from '../models';

function serializeRequest(request: SubscriptionRequest) {
  return {
    id: request.id,
    plan: request.plan,
    amount: request.amount,
    reference: request.reference,
    status: request.status,
    created_at: request.created_at,
    confirmed_at: request.confirmed_at,
  };
}

export async function getSubscriptionStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const status = await getSubscriptionStatus(tenantId);

    sendSuccess(res, {
      has_access: status.hasAccess,
      trial_ends_at: status.trialEndsAt,
      subscription_expires_at: status.subscriptionExpiresAt,
      pending_request: status.pendingRequest ? serializeRequest(status.pendingRequest) : null,
      plans: status.plans.map((entry) => ({ plan: entry.plan, price_mzn: entry.priceMzn })),
      bank_details: {
        bank_name: status.bankDetails.bankName,
        account_holder: status.bankDetails.accountHolder,
        nib: status.bankDetails.nib,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createSubscriptionRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const { plan } = req.body;

    if (!plan || !Object.values(SubscriptionPlan).includes(plan)) {
      throw new AppError(`Indique um plano válido: ${Object.values(SubscriptionPlan).join(', ')}`, 422);
    }

    const request = await createSubscriptionRequest(tenantId, plan);

    const message =
      request.status === SubscriptionRequestStatus.PENDING
        ? 'Pedido de assinatura criado. Guarde a referência para a transferência.'
        : 'Pedido de assinatura criado';

    sendSuccess(res, serializeRequest(request), message, 201);
  } catch (error) {
    next(error);
  }
}
