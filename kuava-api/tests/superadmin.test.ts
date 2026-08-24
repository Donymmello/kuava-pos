import { describe, expect, it } from 'vitest';
import { api, createSuperadminAndLogin, createTestUser, expireTenantTrial, registerTestTenant } from './helpers';

describe('superadmin — gestão de tenants', () => {
  it('bloqueia um utilizador normal (ADMIN de tenant) de aceder às rotas de superadmin', async () => {
    const tenant = await registerTestTenant();

    const res = await api.get('/api/superadmin/tenants').set('Authorization', `Bearer ${tenant.token}`);

    expect(res.status).toBe(403);
  });

  it('permite ao superadmin listar todos os tenants', async () => {
    const superadmin = await createSuperadminAndLogin();
    const tenantA = await registerTestTenant({ tenantName: 'Loja A' });
    const tenantB = await registerTestTenant({ tenantName: 'Loja B' });

    const res = await api.get('/api/superadmin/tenants').set('Authorization', `Bearer ${superadmin.token}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.map((t: { id: string }) => t.id);
    expect(ids).toEqual(expect.arrayContaining([tenantA.tenantId, tenantB.tenantId]));
  });

  it('desativar um tenant bloqueia o login dos seus utilizadores, e reativar restaura o acesso', async () => {
    const superadmin = await createSuperadminAndLogin();
    const tenant = await registerTestTenant();
    const cashier = await createTestUser(tenant.token, { role: 'CASHIER' });

    const deactivate = await api
      .put(`/api/superadmin/tenants/${tenant.tenantId}`)
      .set('Authorization', `Bearer ${superadmin.token}`)
      .send({ is_active: false });
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.is_active).toBe(false);

    // O admin já tinha um token emitido antes de desativar — o login deixa
    // de funcionar (é isso que testamos), mas o token antigo continua
    // válido até expirar (JWT sem estado); ver nota no memory do projeto.
    const adminLoginBlocked = await api
      .post('/api/auth/login')
      .send({ email: tenant.adminEmail, password: tenant.adminPassword });
    expect(adminLoginBlocked.status).toBe(401);

    const cashierLoginBlocked = await api
      .post('/api/auth/login')
      .send({ email: cashier.email, password: 'senha12345' });
    expect(cashierLoginBlocked.status).toBe(401);

    const reactivate = await api
      .put(`/api/superadmin/tenants/${tenant.tenantId}`)
      .set('Authorization', `Bearer ${superadmin.token}`)
      .send({ is_active: true });
    expect(reactivate.status).toBe(200);

    const adminLoginRestored = await api
      .post('/api/auth/login')
      .send({ email: tenant.adminEmail, password: tenant.adminPassword });
    expect(adminLoginRestored.status).toBe(200);
  });

  it('repõe a senha do ADMIN de um tenant, permitindo login com a senha temporária e não com a antiga', async () => {
    const superadmin = await createSuperadminAndLogin();
    const tenant = await registerTestTenant();

    const reset = await api
      .post(`/api/superadmin/tenants/${tenant.tenantId}/reset-admin-password`)
      .set('Authorization', `Bearer ${superadmin.token}`);

    expect(reset.status).toBe(200);
    expect(reset.body.data.adminEmails).toEqual([tenant.adminEmail]);
    const temporaryPassword = reset.body.data.temporaryPassword;
    expect(typeof temporaryPassword).toBe('string');
    expect(temporaryPassword.length).toBeGreaterThanOrEqual(10);

    const oldPasswordLogin = await api
      .post('/api/auth/login')
      .send({ email: tenant.adminEmail, password: tenant.adminPassword });
    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await api
      .post('/api/auth/login')
      .send({ email: tenant.adminEmail, password: temporaryPassword });
    expect(newPasswordLogin.status).toBe(200);
  });

  it('bloqueia um utilizador normal de repor a senha de um admin pela rota de superadmin', async () => {
    const tenant = await registerTestTenant();

    const res = await api
      .post(`/api/superadmin/tenants/${tenant.tenantId}/reset-admin-password`)
      .set('Authorization', `Bearer ${tenant.token}`);

    expect(res.status).toBe(403);
  });

  it('devolve 403 (não 401) quando o superadmin acede a uma rota de tenant — regressão do bug "entra e sai logo"', async () => {
    // Um superadmin não tem tenant_id, por isso qualquer rota de tenant
    // (ex.: GET /api/tenants/me, usada pelo POS) tem de rejeitar com 403.
    // Se devolvesse 401, o interceptor global do frontend
    // (kuava-web/src/services/api.ts) trataria isto como "sessão expirada"
    // e terminava a sessão do superadmin — mesmo sendo um token válido.
    const superadmin = await createSuperadminAndLogin();

    const res = await api.get('/api/tenants/me').set('Authorization', `Bearer ${superadmin.token}`);

    expect(res.status).toBe(403);
  });

  it('um estabelecimento novo começa em teste gratuito de 7 dias, com plano por ativar', async () => {
    const superadmin = await createSuperadminAndLogin();
    const tenant = await registerTestTenant();

    const list = await api.get('/api/superadmin/tenants').set('Authorization', `Bearer ${superadmin.token}`);
    const found = list.body.data.find((t: { id: string }) => t.id === tenant.tenantId);

    expect(found.subscription_active).toBe(false);
    expect(found.trial_ends_at).not.toBeNull();
    const trialEnd = new Date(found.trial_ends_at).getTime();
    const sixDaysFromNow = Date.now() + 6 * 24 * 60 * 60 * 1000;
    const eightDaysFromNow = Date.now() + 8 * 24 * 60 * 60 * 1000;
    expect(trialEnd).toBeGreaterThan(sixDaysFromNow);
    expect(trialEnd).toBeLessThan(eightDaysFromNow);
  });

  it('bloqueia o login quando o trial termina sem um plano pago ativo, e ativar o plano restaura o acesso', async () => {
    const superadmin = await createSuperadminAndLogin();
    const tenant = await registerTestTenant();

    // Ainda dentro do trial — login continua a funcionar normalmente.
    const stillTrialing = await api
      .post('/api/auth/login')
      .send({ email: tenant.adminEmail, password: tenant.adminPassword });
    expect(stillTrialing.status).toBe(200);

    await expireTenantTrial(tenant.tenantId);

    const afterExpiry = await api
      .post('/api/auth/login')
      .send({ email: tenant.adminEmail, password: tenant.adminPassword });
    expect(afterExpiry.status).toBe(401);
    expect(afterExpiry.body.message).toMatch(/período de teste/i);

    const activate = await api
      .put(`/api/superadmin/tenants/${tenant.tenantId}`)
      .set('Authorization', `Bearer ${superadmin.token}`)
      .send({ subscription_active: true });
    expect(activate.status).toBe(200);
    expect(activate.body.data.subscription_active).toBe(true);

    // Plano ativo restaura o login mesmo com o trial já expirado.
    const afterActivation = await api
      .post('/api/auth/login')
      .send({ email: tenant.adminEmail, password: tenant.adminPassword });
    expect(afterActivation.status).toBe(200);
  });

  it('rejeita criar ou promover um utilizador a SUPERADMIN pelas rotas normais de gestão de utilizadores', async () => {
    const tenant = await registerTestTenant();

    const createRes = await api
      .post('/api/users')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ name: 'Tentativa', email: 'tentativa@teste.kuava', password: 'senha12345', role: 'SUPERADMIN' });
    expect(createRes.status).toBe(422);

    const cashier = await createTestUser(tenant.token, { role: 'CASHIER' });
    const list = await api.get('/api/users').set('Authorization', `Bearer ${tenant.token}`);
    const cashierRecord = list.body.data.find((u: { email: string }) => u.email === cashier.email);

    const promoteRes = await api
      .put(`/api/users/${cashierRecord.id}`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ role: 'SUPERADMIN' });
    expect(promoteRes.status).toBe(422);
  });
});
