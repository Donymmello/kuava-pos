import { NextFunction, Request, Response } from 'express';
import { Tenant } from '../models';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';
import {
  listTenants,
  resetTenantAdminPassword,
  setTenantActive,
  setTenantSubscriptionActive,
} from '../services/superadminService';

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
    subscription_active: tenant.subscription_active,
    created_at: tenant.created_at,
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
    const { is_active: isActive, subscription_active: subscriptionActive } = req.body;

    if (typeof isActive !== 'boolean' && typeof subscriptionActive !== 'boolean') {
      throw new AppError('Indique pelo menos um campo: is_active ou subscription_active (booleano)', 422);
    }

    let tenant: Tenant | null = null;
    let message = 'Estabelecimento atualizado com sucesso';

    if (typeof isActive === 'boolean') {
      tenant = await setTenantActive(req.params.id, isActive);
      message = isActive ? 'Estabelecimento ativado com sucesso' : 'Estabelecimento desativado com sucesso';
    }

    if (typeof subscriptionActive === 'boolean') {
      tenant = await setTenantSubscriptionActive(req.params.id, subscriptionActive);
      message = subscriptionActive
        ? 'Plano ativado com sucesso — o estabelecimento já pode entrar mesmo que o teste tenha terminado'
        : 'Plano desativado';
    }

    sendSuccess(res, serializeTenant(tenant as Tenant), message);
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
