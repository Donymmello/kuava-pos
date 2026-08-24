import { Tenant } from '../models';
import { AppError } from '../utils/AppError';

export interface UpdateTenantInput {
  name?: string;
  nuit?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  default_tax_rate?: number;
}

export async function getTenant(tenantId: string): Promise<Tenant> {
  const tenant = await Tenant.findByPk(tenantId);

  if (!tenant) {
    throw new AppError('Estabelecimento não encontrado', 404);
  }

  return tenant;
}

export async function updateTenant(tenantId: string, input: UpdateTenantInput): Promise<Tenant> {
  const tenant = await getTenant(tenantId);

  if (input.nuit && input.nuit !== tenant.nuit) {
    const existing = await Tenant.findOne({ where: { nuit: input.nuit } });
    if (existing && existing.id !== tenant.id) {
      throw new AppError('Já existe um estabelecimento registado com este NUIT', 409);
    }
  }

  if (
    input.default_tax_rate !== undefined &&
    (Number.isNaN(input.default_tax_rate) || input.default_tax_rate < 0 || input.default_tax_rate > 1)
  ) {
    throw new AppError('A taxa de IVA por omissão deve estar entre 0% e 100%', 422);
  }

  await tenant.update({
    name: input.name ?? tenant.name,
    nuit: input.nuit ?? tenant.nuit,
    address: input.address !== undefined ? input.address : tenant.address,
    phone: input.phone !== undefined ? input.phone : tenant.phone,
    email: input.email !== undefined ? input.email : tenant.email,
    default_tax_rate: input.default_tax_rate ?? tenant.default_tax_rate,
  });

  return tenant;
}
