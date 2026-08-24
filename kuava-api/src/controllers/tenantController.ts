import { NextFunction, Request, Response } from 'express';
import { Tenant } from '../models';
import { sendSuccess } from '../utils/apiResponse';
import { getTenant, updateTenant } from '../services/tenantService';

function serializeTenant(tenant: Tenant) {
  return {
    id: tenant.id,
    name: tenant.name,
    nuit: tenant.nuit,
    address: tenant.address,
    phone: tenant.phone,
    email: tenant.email,
    default_tax_rate: tenant.default_tax_rate,
    is_active: tenant.is_active,
    trial_ends_at: tenant.trial_ends_at,
    subscription_active: tenant.subscription_active,
    created_at: tenant.created_at,
  };
}

export async function getTenantHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const tenant = await getTenant(tenantId);
    sendSuccess(res, serializeTenant(tenant));
  } catch (error) {
    next(error);
  }
}

export async function updateTenantHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const { name, nuit, address, phone, email, default_tax_rate } = req.body;

    const tenant = await updateTenant(tenantId, {
      name,
      nuit,
      address,
      phone,
      email,
      default_tax_rate,
    });

    sendSuccess(res, serializeTenant(tenant), 'Dados do estabelecimento atualizados com sucesso');
  } catch (error) {
    next(error);
  }
}
