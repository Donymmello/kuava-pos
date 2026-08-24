import { describe, expect, it } from 'vitest';
import { QueryTypes } from 'sequelize';
import { Sale, User, sequelize } from '../src/models';
import { api, createTestProduct, registerTestTenant } from './helpers';

/**
 * Cria uma venda com uma data de criação escolhida à mão. `Sale.create`
 * sozinho não chega: o Sequelize gere `created_at` automaticamente
 * (`timestamps: true` + `underscored: true` na ligação) e substitui sempre
 * pelo instante atual, mesmo indicando `created_at` explicitamente — por
 * isso o valor certo só fica a valer com um UPDATE em SQL direto a seguir.
 */
async function createSaleAt(params: {
  tenantId: string;
  userId: string;
  totalAmount: number;
  createdAt: Date;
}): Promise<Sale> {
  const sale = await Sale.create({
    tenant_id: params.tenantId,
    user_id: params.userId,
    total_amount: params.totalAmount,
    tax_amount: 0,
    payment_method: 'CASH' as never,
  });

  await sequelize.query('UPDATE sales SET created_at = :createdAt WHERE id = :id', {
    replacements: { createdAt: params.createdAt, id: sale.id },
    type: QueryTypes.UPDATE,
  });

  return sale;
}

const MAPUTO_OFFSET_MS = 2 * 60 * 60 * 1000;

/** Instante UTC da meia-noite local de Maputo do dia de `date` — mesma fórmula que dashboardService.ts. */
function startOfMaputoDay(date: Date): number {
  const local = new Date(date.getTime() + MAPUTO_OFFSET_MS);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - MAPUTO_OFFSET_MS;
}

function maputoDateKey(instantMs: number): string {
  return new Date(instantMs + MAPUTO_OFFSET_MS).toISOString().slice(0, 10);
}

describe('painel — agrupamento por dia em hora de Maputo (UTC+2)', () => {
  it('agrupa uma venda perto da meia-noite pelo dia local, não pelo dia UTC', async () => {
    const tenant = await registerTestTenant();
    const product = await createTestProduct(tenant.tenantId, { stock_quantity: 100 });
    const adminUser = await User.findOne({ where: { email: tenant.adminEmail } });

    const now = new Date();
    const todayMidnightMaputoUtcMs = startOfMaputoDay(now);

    // 23h de Maputo de ontem — fica no dia de ontem tanto em UTC como em
    // Maputo (caso de controlo, não testa a regressão por si só).
    const yesterdayLateInstant = todayMidnightMaputoUtcMs - 1 * 60 * 60 * 1000;
    // 30 min depois da meia-noite local de Maputo, ou seja 22h30 UTC do dia
    // UTC anterior — em UTC "ingénuo" ainda parece o dia de ontem, mas em
    // Maputo já é hoje. Esta é exatamente a regressão corrigida.
    const todayEarlyInstant = todayMidnightMaputoUtcMs + 30 * 60 * 1000;

    await createSaleAt({
      tenantId: tenant.tenantId,
      userId: adminUser!.id,
      totalAmount: 75,
      createdAt: new Date(yesterdayLateInstant),
    });

    await createSaleAt({
      tenantId: tenant.tenantId,
      userId: adminUser!.id,
      totalAmount: 250,
      createdAt: new Date(todayEarlyInstant),
    });

    void product;

    const res = await api.get('/api/dashboard/summary').set('Authorization', `Bearer ${tenant.token}`);
    expect(res.status).toBe(200);

    const byDate = new Map(
      res.body.data.last7Days.map((d: { date: string; totalAmount: number }) => [d.date, d.totalAmount]),
    );

    expect(byDate.get(maputoDateKey(yesterdayLateInstant))).toBe(75);
    expect(byDate.get(maputoDateKey(todayEarlyInstant))).toBe(250);
  });
});
