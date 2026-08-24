import { describe, expect, it } from 'vitest';
import { api, createTestUser, registerTestTenant } from './helpers';

describe('autenticação e gestão de utilizadores', () => {
  it('regista um estabelecimento novo com o primeiro utilizador como ADMIN', async () => {
    const res = await api.post('/api/auth/register').send({
      tenantName: 'Loja Principal',
      nuit: '400111222',
      adminName: 'Dona da Loja',
      adminEmail: 'dona@loja.teste',
      adminPassword: 'senha12345',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.user.email).toBe('dona@loja.teste');
  });

  it('permite login com as credenciais corretas', async () => {
    const tenant = await registerTestTenant();

    const res = await api
      .post('/api/auth/login')
      .send({ email: tenant.adminEmail, password: tenant.adminPassword });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe(tenant.adminEmail);
  });

  it('rejeita login com senha errada', async () => {
    const tenant = await registerTestTenant();

    const res = await api
      .post('/api/auth/login')
      .send({ email: tenant.adminEmail, password: 'senha-errada' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejeita login de um utilizador desativado', async () => {
    const tenant = await registerTestTenant();
    const cashier = await createTestUser(tenant.token, { role: 'CASHIER' });

    // Descobrir o id do caixa criado para o poder desativar.
    const list = await api.get('/api/users').set('Authorization', `Bearer ${tenant.token}`);
    const cashierRecord = list.body.data.find((u: { email: string }) => u.email === cashier.email);

    await api
      .put(`/api/users/${cashierRecord.id}`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ is_active: false });

    const loginRes = await api.post('/api/auth/login').send({
      email: cashier.email,
      password: 'senha12345',
    });

    expect(loginRes.status).toBe(401);
  });

  it('impede um utilizador de se autodesativar', async () => {
    const tenant = await registerTestTenant();

    const list = await api.get('/api/users').set('Authorization', `Bearer ${tenant.token}`);
    const adminRecord = list.body.data.find((u: { email: string }) => u.email === tenant.adminEmail);

    const res = await api
      .put(`/api/users/${adminRecord.id}`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ is_active: false });

    expect(res.status).toBe(400);
  });

  it('rejeita registar um segundo estabelecimento com um email de admin já usado noutro (email é único em toda a app)', async () => {
    const first = await registerTestTenant({ adminEmail: 'repetido@teste.kuava' });
    expect(first.adminEmail).toBe('repetido@teste.kuava');

    const res = await api.post('/api/auth/register').send({
      tenantName: 'Outra Loja',
      nuit: '999888777',
      adminName: 'Outro Admin',
      adminEmail: 'repetido@teste.kuava',
      adminPassword: 'outra-senha-123',
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/já existe/i);
  });

  it('rejeita criar um utilizador com um email já usado noutro estabelecimento', async () => {
    const tenantA = await registerTestTenant();
    await createTestUser(tenantA.token, { email: 'partilhado@teste.kuava' });

    const tenantB = await registerTestTenant();
    const res = await api
      .post('/api/users')
      .set('Authorization', `Bearer ${tenantB.token}`)
      .send({
        name: 'Outro Caixa',
        email: 'partilhado@teste.kuava',
        password: 'senha12345',
        role: 'CASHIER',
      });

    expect(res.status).toBe(409);
  });

  it('bloqueia um caixa (CASHIER) de aceder à gestão de utilizadores', async () => {
    const tenant = await registerTestTenant();
    const cashier = await createTestUser(tenant.token, { role: 'CASHIER' });

    const res = await api.get('/api/users').set('Authorization', `Bearer ${cashier.token}`);

    expect(res.status).toBe(403);
  });
});
