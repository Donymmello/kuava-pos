import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app';
import { Product, Tenant, User } from '../src/models';
import { UserRole } from '../src/types/enums';

export const app = createApp();
export const api = request(app);

let counter = 0;

export interface TestTenant {
  token: string;
  tenantId: string;
  adminEmail: string;
  adminPassword: string;
}

/** Regista um estabelecimento novo (com o primeiro admin) pelo endpoint real de registo. */
export async function registerTestTenant(
  overrides: Partial<{ tenantName: string; adminEmail: string }> = {},
): Promise<TestTenant> {
  counter += 1;
  const adminEmail = overrides.adminEmail ?? `admin${counter}@teste.kuava`;

  const res = await api.post('/api/auth/register').send({
    tenantName: overrides.tenantName ?? `Loja de Teste ${counter}`,
    nuit: `1000000${String(counter).padStart(3, '0')}`,
    adminName: 'Admin de Teste',
    adminEmail,
    adminPassword: 'senha12345',
  });

  if (res.status !== 201) {
    throw new Error(`Falha ao registar estabelecimento de teste: ${JSON.stringify(res.body)}`);
  }

  return {
    token: res.body.data.token,
    tenantId: res.body.data.user.tenantId,
    adminEmail,
    adminPassword: 'senha12345',
  };
}

/** Cria um utilizador adicional (ex.: caixa) dentro do estabelecimento do admin indicado, já autenticado. */
export async function createTestUser(
  adminToken: string,
  overrides: Partial<{ email: string; role: string; name: string }> = {},
): Promise<{ token: string; email: string }> {
  counter += 1;
  const email = overrides.email ?? `user${counter}@teste.kuava`;
  const password = 'senha12345';

  const createRes = await api
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: overrides.name ?? 'Utilizador de Teste',
      email,
      password,
      role: overrides.role ?? 'CASHIER',
    });

  if (createRes.status !== 201) {
    throw new Error(`Falha ao criar utilizador de teste: ${JSON.stringify(createRes.body)}`);
  }

  const loginRes = await api.post('/api/auth/login').send({ email, password });
  return { token: loginRes.body.data.token, email };
}

/**
 * Cria a conta de superadmin diretamente no modelo (não existe endpoint
 * público para isto — só o script seedSuperadmin.ts, ver src/scripts/) e
 * autentica-a pelo login real.
 */
export async function createSuperadminAndLogin(
  overrides: Partial<{ email: string; password: string }> = {},
): Promise<{ token: string; email: string }> {
  counter += 1;
  const email = overrides.email ?? `superadmin${counter}@teste.kuava`;
  const password = overrides.password ?? 'senha-super-123';

  await User.create({
    tenant_id: null,
    name: 'Superadmin de Teste',
    email,
    password_hash: await bcrypt.hash(password, 10),
    role: UserRole.SUPERADMIN,
  });

  const loginRes = await api.post('/api/auth/login').send({ email, password });
  return { token: loginRes.body.data.token, email };
}

/**
 * Força o trial de um tenant de teste a já ter terminado — não há forma de
 * fazer isto pela API real (o trial de 7 dias é sempre calculado a partir de
 * "agora" no registo), por isso este helper mexe diretamente no modelo.
 */
export async function expireTenantTrial(tenantId: string): Promise<void> {
  await Tenant.update(
    { trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    { where: { id: tenantId } },
  );
}

/** Cria um produto diretamente no modelo — mais rápido que passar pelo endpoint quando o teste não é sobre o catálogo em si. */
export async function createTestProduct(
  tenantId: string,
  overrides: Partial<{ name: string; price: number; stock_quantity: number; tax_rate: number }> = {},
): Promise<Product> {
  return Product.create({
    tenant_id: tenantId,
    barcode: null,
    name: overrides.name ?? 'Produto de Teste',
    price: overrides.price ?? 100,
    cost_price: 0,
    stock_quantity: overrides.stock_quantity ?? 10,
    min_stock_alert: 5,
    tax_rate: overrides.tax_rate ?? 0.16,
    category: null,
  });
}
