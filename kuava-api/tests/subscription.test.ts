import { describe, expect, it } from 'vitest';
import {
  api,
  createSuperadminAndLogin,
  createTestUser,
  expireTenantTrial,
  registerTestTenant,
  setTenantSubscriptionExpiry,
} from './helpers';

describe('assinatura — pedido de plano e confirmação manual', () => {
  it('um ADMIN cria um pedido de plano, com referência única e o valor do plano', async () => {
    const tenant = await registerTestTenant();

    const res = await api
      .post('/api/subscription/requests')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ plan: 'MONTHLY' });

    expect(res.status).toBe(201);
    expect(res.body.data.plan).toBe('MONTHLY');
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.reference).toMatch(/^KV-[A-Z0-9]{6}$/);
    expect(res.body.data.amount).toBeGreaterThan(0);
  });

  it('bloqueia um CASHIER de criar um pedido de plano, só o ADMIN pode', async () => {
    const tenant = await registerTestTenant();
    const cashier = await createTestUser(tenant.token, { role: 'CASHIER' });

    const res = await api
      .post('/api/subscription/requests')
      .set('Authorization', `Bearer ${cashier.token}`)
      .send({ plan: 'MONTHLY' });

    expect(res.status).toBe(403);
  });

  it('rejeita um plano inválido', async () => {
    const tenant = await registerTestTenant();

    const res = await api
      .post('/api/subscription/requests')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ plan: 'SEMESTRAL' });

    expect(res.status).toBe(422);
  });

  it('um novo pedido cancela automaticamente o pedido pendente anterior do mesmo tenant', async () => {
    const tenant = await registerTestTenant();

    await api.post('/api/subscription/requests').set('Authorization', `Bearer ${tenant.token}`).send({ plan: 'MONTHLY' });
    const second = await api
      .post('/api/subscription/requests')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ plan: 'ANNUAL' });
    expect(second.status).toBe(201);

    const status = await api.get('/api/subscription/status').set('Authorization', `Bearer ${tenant.token}`);
    expect(status.body.data.pending_request.plan).toBe('ANNUAL');
    expect(status.body.data.pending_request.reference).toBe(second.body.data.reference);
  });

  it('bloqueia as rotas de negócio quando o trial termina sem plano pago, e confirmar o pedido restaura o acesso', async () => {
    const superadmin = await createSuperadminAndLogin();
    const tenant = await registerTestTenant();

    await expireTenantTrial(tenant.tenantId);

    // O login continua a funcionar (ver superadmin.test.ts), o bloqueio real
    // é nas rotas de negócio.
    const blockedProducts = await api.get('/api/products').set('Authorization', `Bearer ${tenant.token}`);
    expect(blockedProducts.status).toBe(402);

    const request = await api
      .post('/api/subscription/requests')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ plan: 'MONTHLY' });
    expect(request.status).toBe(201);

    const confirm = await api
      .post(`/api/superadmin/subscription-requests/${request.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${superadmin.token}`);
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.status).toBe('CONFIRMED');

    const restoredProducts = await api.get('/api/products').set('Authorization', `Bearer ${tenant.token}`);
    expect(restoredProducts.status).toBe(200);

    const status = await api.get('/api/subscription/status').set('Authorization', `Bearer ${tenant.token}`);
    expect(status.body.data.has_access).toBe(true);
    const expiresAt = new Date(status.body.data.subscription_expires_at).getTime();
    const twentyNineDaysFromNow = Date.now() + 29 * 24 * 60 * 60 * 1000;
    const thirtyOneDaysFromNow = Date.now() + 31 * 24 * 60 * 60 * 1000;
    expect(expiresAt).toBeGreaterThan(twentyNineDaysFromNow);
    expect(expiresAt).toBeLessThan(thirtyOneDaysFromNow);
  });

  it('confirmar uma renovação antecipada soma a partir da data de expiração atual, sem perder os dias já pagos', async () => {
    const superadmin = await createSuperadminAndLogin();
    const tenant = await registerTestTenant();

    const currentExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    await setTenantSubscriptionExpiry(tenant.tenantId, currentExpiry);

    const request = await api
      .post('/api/subscription/requests')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ plan: 'MONTHLY' });

    await api
      .post(`/api/superadmin/subscription-requests/${request.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${superadmin.token}`);

    const status = await api.get('/api/subscription/status').set('Authorization', `Bearer ${tenant.token}`);
    const expiresAt = new Date(status.body.data.subscription_expires_at).getTime();
    // 10 dias que já tinha + 30 do plano mensal = 40 dias a partir de agora,
    // não 30 (o que aconteceria se a base fosse sempre "agora").
    const thirtyNineDaysFromNow = Date.now() + 39 * 24 * 60 * 60 * 1000;
    const fortyOneDaysFromNow = Date.now() + 41 * 24 * 60 * 60 * 1000;
    expect(expiresAt).toBeGreaterThan(thirtyNineDaysFromNow);
    expect(expiresAt).toBeLessThan(fortyOneDaysFromNow);
  });

  it('confirmar ou cancelar um pedido que já não está pendente devolve 409', async () => {
    const superadmin = await createSuperadminAndLogin();
    const tenant = await registerTestTenant();

    const request = await api
      .post('/api/subscription/requests')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ plan: 'MONTHLY' });

    await api
      .post(`/api/superadmin/subscription-requests/${request.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${superadmin.token}`);

    const confirmAgain = await api
      .post(`/api/superadmin/subscription-requests/${request.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${superadmin.token}`);
    expect(confirmAgain.status).toBe(409);

    const cancelAfterConfirm = await api
      .post(`/api/superadmin/subscription-requests/${request.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${superadmin.token}`);
    expect(cancelAfterConfirm.status).toBe(409);
  });

  it('bloqueia um utilizador normal de aceder às rotas de superadmin de pedidos de assinatura', async () => {
    const tenant = await registerTestTenant();

    const res = await api
      .get('/api/superadmin/subscription-requests')
      .set('Authorization', `Bearer ${tenant.token}`);

    expect(res.status).toBe(403);
  });
});
