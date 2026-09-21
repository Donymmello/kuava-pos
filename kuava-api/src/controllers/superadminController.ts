import { NextFunction, Request, Response } from 'express';
import { SubscriptionRequest, Tenant } from '../models';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';
import { listTenants, resetTenantAdminPassword, setTenantActive } from '../services/superadminService';
import {
  cancelSubscriptionRequest,
  confirmSubscriptionRequest,
  listPendingSubscriptionRequests,
} from '../services/subscriptionService';

function serializeTenant(tenant: Tenant) {
  return {
    id: tenant.id,
    name: tenant.name,
    nuit: tenant.nuit,
    address: tenant.address,
    phone: tenant.phone,
    email: tenant.email,
    is_active: tenant.is_active,
    trial_ends_at: tenant.trial_ends_at,
    subscription_expires_at: tenant.subscription_expires_at,
    created_at: tenant.created_at,
  };
}

function serializeSubscriptionRequest(request: SubscriptionRequest) {
  const plain = request.get({ plain: true }) as SubscriptionRequest & {
    tenant?: { id: string; name: string; nuit: string } | null;
  };

  return {
    id: plain.id,
    plan: plain.plan,
    amount: plain.amount,
    reference: plain.reference,
    status: plain.status,
    created_at: plain.created_at,
    confirmed_at: plain.confirmed_at,
    tenant: plain.tenant ? { id: plain.tenant.id, name: plain.tenant.name, nuit: plain.tenant.nuit } : null,
  };
}

export async function listTenantsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenants = await listTenants();
    sendSuccess(res, tenants.map(serializeTenant));
  } catch (error) {
    next(error);
  }
}

export async function setTenantActiveHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { is_active: isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      throw new AppError('Indique o campo is_active (booleano)', 422);
    }

    const tenant = await setTenantActive(req.params.id, isActive);
    const message = isActive ? 'Estabelecimento ativado com sucesso' : 'Estabelecimento desativado com sucesso';

    sendSuccess(res, serializeTenant(tenant), message);
  } catch (error) {
    next(error);
  }
}

export async function resetTenantAdminPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await resetTenantAdminPassword(req.params.id);
    sendSuccess(res, result, 'Senha reposta com sucesso');
  } catch (error) {
    next(error);
  }
}

export async function listPendingSubscriptionRequestsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requests = await listPendingSubscriptionRequests();
    sendSuccess(res, requests.map(serializeSubscriptionRequest));
  } catch (error) {
    next(error);
  }
}

export async function confirmSubscriptionRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // authMiddleware garante req.user nesta rota (ver superadminRoutes.ts),
    // mas o tipo é opcional, por isso falha explicitamente em vez de gravar
    // uma confirmação sem autor.
    if (!req.user) {
      throw new AppError('Autenticação obrigatória', 401);
    }
    const { request } = await confirmSubscriptionRequest(req.params.id, req.user.id);
    sendSuccess(res, serializeSubscriptionRequest(request), 'Pedido confirmado, assinatura estendida com sucesso');
  } catch (error) {
    next(error);
  }
}

export async function cancelSubscriptionRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const request = await cancelSubscriptionRequest(req.params.id);
    sendSuccess(res, serializeSubscriptionRequest(request), 'Pedido cancelado');
  } catch (error) {
    next(error);
  }
}
