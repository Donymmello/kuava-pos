import { describe, expect, it } from 'vitest';
import { api, createTestProduct, createTestUser, registerTestTenant } from './helpers';

describe('controle por lotes', () => {
  it('ativar tracks_batches num produto com stock existente migra tudo para o primeiro lote', async () => {
    const tenant = await registerTestTenant();
    const product = await createTestProduct(tenant.tenantId, {
      stock_quantity: 20,
      expiry_date: '2026-10-01',
    });

    const res = await api
      .put(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ tracks_batches: true });

    expect(res.status).toBe(200);
    expect(res.body.data.tracks_batches).toBe(true);
    expect(res.body.data.stock_quantity).toBe(20);
    expect(res.body.data.expiry_date).toBe('2026-10-01');

    const lots = await api
      .get(`/api/products/${product.id}/lots`)
      .set('Authorization', `Bearer ${tenant.token}`);

    expect(lots.status).toBe(200);
    expect(lots.body.data).toHaveLength(1);
    expect(lots.body.data[0].quantity).toBe(20);
    expect(lots.body.data[0].expiry_date).toBe('2026-10-01');
  });

  it('rejeita editar stock ou validade diretamente enquanto o controle por lotes está ativo', async () => {
    const tenant = await registerTestTenant();
    const product = await createTestProduct(tenant.tenantId, {
      stock_quantity: 0,
      tracks_batches: true,
    });

    const res = await api
      .put(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ stock_quantity: 5 });

    expect(res.status).toBe(422);
  });

  it('criar lotes soma o stock e usa a validade mais próxima entre os lotes com stock', async () => {
    const tenant = await registerTestTenant();
    const product = await createTestProduct(tenant.tenantId, {
      stock_quantity: 0,
      tracks_batches: true,
    });

    await api
      .post(`/api/products/${product.id}/lots`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ quantity: 5, expiry_date: '2026-12-01' })
      .expect(201);

    await api
      .post(`/api/products/${product.id}/lots`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ quantity: 3, expiry_date: '2026-10-01' })
      .expect(201);

    const res = await api
      .get(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${tenant.token}`);

    expect(res.body.data.stock_quantity).toBe(8);
    expect(res.body.data.expiry_date).toBe('2026-10-01');
  });

  it('uma venda desconta do lote que expira primeiro, atravessando lotes quando necessário (FEFO)', async () => {
    const tenant = await registerTestTenant();
    const product = await createTestProduct(tenant.tenantId, {
      stock_quantity: 0,
      tracks_batches: true,
    });

    await api
      .post(`/api/products/${product.id}/lots`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ quantity: 3, expiry_date: '2026-10-01' });
    await api
      .post(`/api/products/${product.id}/lots`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ quantity: 10, expiry_date: '2026-12-01' });

    const sale = await api
      .post('/api/sales')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ payment_method: 'CASH', items: [{ product_id: product.id, quantity: 5 }] });

    expect(sale.status).toBe(201);

    const productRes = await api
      .get(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${tenant.token}`);
    expect(productRes.body.data.stock_quantity).toBe(8);

    const lots = await api
      .get(`/api/products/${product.id}/lots`)
      .set('Authorization', `Bearer ${tenant.token}`);

    // O lote que vencia primeiro (3 unidades) esgotou-se por completo e some
    // da lista (listLots só mostra lotes com stock); sobra só o outro, com
    // as 2 unidades que faltavam já descontadas (10 - 2 = 8).
    expect(lots.body.data).toHaveLength(1);
    expect(lots.body.data[0].quantity).toBe(8);
    expect(lots.body.data[0].expiry_date).toBe('2026-12-01');
  });

  it('cancelar uma venda de um produto com lotes repõe exatamente as quantidades certas', async () => {
    const tenant = await registerTestTenant();
    const product = await createTestProduct(tenant.tenantId, {
      stock_quantity: 0,
      tracks_batches: true,
    });

    await api
      .post(`/api/products/${product.id}/lots`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ quantity: 3, expiry_date: '2026-10-01' });
    await api
      .post(`/api/products/${product.id}/lots`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ quantity: 10, expiry_date: '2026-12-01' });

    const sale = await api
      .post('/api/sales')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ payment_method: 'CASH', items: [{ product_id: product.id, quantity: 5 }] });

    await api
      .post(`/api/sales/${sale.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .expect(200);

    const productRes = await api
      .get(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${tenant.token}`);
    expect(productRes.body.data.stock_quantity).toBe(13);
    expect(productRes.body.data.expiry_date).toBe('2026-10-01');

    const lots = await api
      .get(`/api/products/${product.id}/lots`)
      .set('Authorization', `Bearer ${tenant.token}`);

    expect(lots.body.data).toHaveLength(2);
    expect(lots.body.data[0].quantity).toBe(3);
    expect(lots.body.data[1].quantity).toBe(10);
  });

  it('deixa apagar um lote intacto, mas não um que já tem vendas associadas', async () => {
    const tenant = await registerTestTenant();
    const product = await createTestProduct(tenant.tenantId, {
      stock_quantity: 0,
      tracks_batches: true,
    });

    const untouchedLot = await api
      .post(`/api/products/${product.id}/lots`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ quantity: 5, expiry_date: null });

    const deleteUntouched = await api
      .delete(`/api/products/${product.id}/lots/${untouchedLot.body.data.id}`)
      .set('Authorization', `Bearer ${tenant.token}`);
    expect(deleteUntouched.status).toBe(200);

    const soldLot = await api
      .post(`/api/products/${product.id}/lots`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ quantity: 5, expiry_date: null });

    await api
      .post('/api/sales')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ payment_method: 'CASH', items: [{ product_id: product.id, quantity: 2 }] });

    const deleteSold = await api
      .delete(`/api/products/${product.id}/lots/${soldLot.body.data.id}`)
      .set('Authorization', `Bearer ${tenant.token}`);
    expect(deleteSold.status).toBe(409);
  });

  it('rejeita lotes num produto sem controle por lotes ativado, e bloqueia um CASHIER de os gerir', async () => {
    const tenant = await registerTestTenant();

    const plainProduct = await createTestProduct(tenant.tenantId, { stock_quantity: 10 });
    const rejected = await api
      .post(`/api/products/${plainProduct.id}/lots`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ quantity: 5, expiry_date: null });
    expect(rejected.status).toBe(422);

    const batchProduct = await createTestProduct(tenant.tenantId, {
      stock_quantity: 0,
      tracks_batches: true,
    });
    const cashier = await createTestUser(tenant.token, { role: 'CASHIER' });
    const blocked = await api
      .post(`/api/products/${batchProduct.id}/lots`)
      .set('Authorization', `Bearer ${cashier.token}`)
      .send({ quantity: 5, expiry_date: null });
    expect(blocked.status).toBe(403);
  });
});
