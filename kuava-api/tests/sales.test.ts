import { describe, expect, it } from 'vitest';
import { api, createTestProduct, createTestUser, registerTestTenant } from './helpers';

describe('vendas e stock', () => {
  it('regista uma venda, calcula o total com IVA e dá baixa no stock', async () => {
    const tenant = await registerTestTenant();
    const product = await createTestProduct(tenant.tenantId, {
      price: 100,
      stock_quantity: 10,
      tax_rate: 0.16,
    });

    const res = await api
      .post('/api/sales')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({
        payment_method: 'CASH',
        items: [{ product_id: product.id, quantity: 3 }],
      });

    expect(res.status).toBe(201);
    // 3 * 100 = 300 de subtotal, + 16% de IVA = 348.
    expect(res.body.data.total_amount).toBeCloseTo(348);
    expect(res.body.data.tax_amount).toBeCloseTo(48);

    await product.reload();
    expect(product.stock_quantity).toBe(7);
  });

  it('rejeita uma venda quando não há stock suficiente, sem alterar o stock', async () => {
    const tenant = await registerTestTenant();
    const product = await createTestProduct(tenant.tenantId, { stock_quantity: 2 });

    const res = await api
      .post('/api/sales')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({
        payment_method: 'CASH',
        items: [{ product_id: product.id, quantity: 5 }],
      });

    expect(res.status).toBe(409);

    await product.reload();
    expect(product.stock_quantity).toBe(2);
  });

  it('rejeita uma venda para um produto inexistente', async () => {
    const tenant = await registerTestTenant();

    const res = await api
      .post('/api/sales')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({
        payment_method: 'CASH',
        items: [{ product_id: '00000000-0000-0000-0000-000000000000', quantity: 1 }],
      });

    expect(res.status).toBe(404);
  });

  it('reenviar a mesma venda com o mesmo client_ref não a duplica nem dá baixa dupla no stock', async () => {
    const tenant = await registerTestTenant();
    const product = await createTestProduct(tenant.tenantId, { stock_quantity: 10 });

    const payload = {
      payment_method: 'CASH',
      items: [{ product_id: product.id, quantity: 2 }],
      client_ref: 'venda-offline-teste-1',
    };

    const first = await api.post('/api/sales').set('Authorization', `Bearer ${tenant.token}`).send(payload);
    const second = await api.post('/api/sales').set('Authorization', `Bearer ${tenant.token}`).send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);

    await product.reload();
    expect(product.stock_quantity).toBe(8);
  });

  it('cancelar uma venda repõe o stock, e cancelar outra vez é rejeitado', async () => {
    const tenant = await registerTestTenant();
    const product = await createTestProduct(tenant.tenantId, { stock_quantity: 10 });

    const sale = await api
      .post('/api/sales')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ payment_method: 'CASH', items: [{ product_id: product.id, quantity: 4 }] });

    await product.reload();
    expect(product.stock_quantity).toBe(6);

    const cancel = await api
      .post(`/api/sales/${sale.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${tenant.token}`);
    expect(cancel.status).toBe(200);

    await product.reload();
    expect(product.stock_quantity).toBe(10);

    const cancelAgain = await api
      .post(`/api/sales/${sale.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${tenant.token}`);
    expect(cancelAgain.status).toBe(409);
  });

  it('bloqueia um caixa (CASHIER) de cancelar uma venda', async () => {
    const tenant = await registerTestTenant();
    const cashier = await createTestUser(tenant.token, { role: 'CASHIER' });
    const product = await createTestProduct(tenant.tenantId, { stock_quantity: 10 });

    const sale = await api
      .post('/api/sales')
      .set('Authorization', `Bearer ${cashier.token}`)
      .send({ payment_method: 'CASH', items: [{ product_id: product.id, quantity: 1 }] });
    expect(sale.status).toBe(201);

    const cancel = await api
      .post(`/api/sales/${sale.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${cashier.token}`);
    expect(cancel.status).toBe(403);
  });
});

describe('M-Pesa/e-Mola — confirmação manual (opcional)', () => {
  it('finaliza uma venda M-Pesa sem indicar fluxo/referência/margem nenhuns', async () => {
    const tenant = await registerTestTenant();
    const product = await createTestProduct(tenant.tenantId, { stock_quantity: 10 });

    const res = await api
      .post('/api/sales')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({ payment_method: 'MPESA', items: [{ product_id: product.id, quantity: 1 }] });

    expect(res.status).toBe(201);
    expect(res.body.data.mobile_money_flow).toBeNull();
    expect(res.body.data.payment_reference).toBeNull();
    expect(res.body.data.agent_margin_amount).toBeNull();
  });

  it('guarda a referência da transferência quando indicada, e null quando só espaços', async () => {
    const tenant = await registerTestTenant();
    const product = await createTestProduct(tenant.tenantId, { stock_quantity: 10 });

    const withRef = await api
      .post('/api/sales')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({
        payment_method: 'MPESA',
        items: [{ product_id: product.id, quantity: 1 }],
        mobile_money_flow: 'TRANSFER',
        payment_reference: 'CI250823.1234.A56789',
      });
    expect(withRef.status).toBe(201);
    expect(withRef.body.data.payment_reference).toBe('CI250823.1234.A56789');

    // Regressão: uma referência só com espaços tem de ficar null, não "" —
    // ver a correção do code review em saleService.ts (`|| null`, não `?? null`).
    const withBlankRef = await api
      .post('/api/sales')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({
        payment_method: 'EMOLA',
        items: [{ product_id: product.id, quantity: 1 }],
        mobile_money_flow: 'TRANSFER',
        payment_reference: '   ',
      });
    expect(withBlankRef.status).toBe(201);
    expect(withBlankRef.body.data.payment_reference).toBeNull();
  });

  it('guarda a margem do agente quando válida, e rejeita quando negativa', async () => {
    const tenant = await registerTestTenant();
    const product = await createTestProduct(tenant.tenantId, { stock_quantity: 10 });

    const valid = await api
      .post('/api/sales')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({
        payment_method: 'EMOLA',
        items: [{ product_id: product.id, quantity: 1 }],
        mobile_money_flow: 'AGENT',
        agent_margin_amount: 5.5,
      });
    expect(valid.status).toBe(201);
    expect(valid.body.data.agent_margin_amount).toBeCloseTo(5.5);

    const negative = await api
      .post('/api/sales')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({
        payment_method: 'EMOLA',
        items: [{ product_id: product.id, quantity: 1 }],
        mobile_money_flow: 'AGENT',
        agent_margin_amount: -5,
      });
    expect(negative.status).toBe(422);
  });
});
