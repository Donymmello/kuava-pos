import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { MobileMoneyFlow, PaymentMethod, SaleStatus } from '../types/enums';

export interface SalesSummary {
  totalAmount: number;
  count: number;
}

export interface DailySales {
  date: string;
  totalAmount: number;
}

export interface PaymentMethodTotal {
  paymentMethod: PaymentMethod;
  totalAmount: number;
  count: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantitySold: number;
}

export interface DashboardSummary {
  today: SalesSummary;
  month: SalesSummary & { averageTicket: number };
  last7Days: DailySales[];
  paymentMethodBreakdown: PaymentMethodTotal[];
  topProducts: TopProduct[];
  lowStockCount: number;
  /** Total de margens/comissões retidas como agente M-Pesa/e-Mola este mês. */
  agentMarginMonth: SalesSummary;
}

/**
 * Moçambique usa UTC+2 o ano inteiro (Africa/Maputo, sem horário de verão).
 * O servidor pode correr com o relógio em UTC, por isso "hoje", "este mês" e
 * "últimos 7 dias" têm de ser calculados em hora local de Maputo — senão o
 * dia muda às 22h locais (2h antes da meia-noite real) em vez de à meia-noite.
 */
const MAPUTO_OFFSET_MS = 2 * 60 * 60 * 1000;

/** Instante UTC correspondente à meia-noite local de Maputo do dia de `date`. */
function startOfMaputoDay(date: Date): Date {
  const local = new Date(date.getTime() + MAPUTO_OFFSET_MS);
  const localMidnightAsUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(localMidnightAsUtc - MAPUTO_OFFSET_MS);
}

/** Instante UTC correspondente ao dia 1, meia-noite local de Maputo, do mês de `date`. */
function startOfMaputoMonth(date: Date): Date {
  const local = new Date(date.getTime() + MAPUTO_OFFSET_MS);
  const localMonthStartAsUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1);
  return new Date(localMonthStartAsUtc - MAPUTO_OFFSET_MS);
}

/** Data (AAAA-MM-DD) em hora local de Maputo que corresponde a um instante UTC qualquer. */
function maputoDateKeyFromInstant(date: Date): string {
  return new Date(date.getTime() + MAPUTO_OFFSET_MS).toISOString().slice(0, 10);
}

async function fetchSalesSummary(tenantId: string, since: Date): Promise<SalesSummary> {
  const rows = await sequelize.query<{ total: string | null; count: string }>(
    `SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS count
     FROM sales
     WHERE tenant_id = :tenantId AND status = :status AND created_at >= :since`,
    {
      replacements: { tenantId, status: SaleStatus.COMPLETED, since },
      type: QueryTypes.SELECT,
    },
  );

  const row = rows[0];
  return {
    totalAmount: Number(row?.total ?? 0),
    count: Number(row?.count ?? 0),
  };
}

async function fetchLast7Days(tenantId: string, since: Date): Promise<DailySales[]> {
  // `AT TIME ZONE 'Africa/Maputo'` converte o timestamptz para a data/hora
  // local antes de extrair o dia — sem isto, uma venda feita às 23h de
  // Maputo (21h UTC) já cai no dia seguinte em UTC e aparecia trocada.
  const rows = await sequelize.query<{ day: string; total: string }>(
    `SELECT DATE(created_at AT TIME ZONE 'Africa/Maputo') AS day, SUM(total_amount) AS total
     FROM sales
     WHERE tenant_id = :tenantId AND status = :status AND created_at >= :since
     GROUP BY DATE(created_at AT TIME ZONE 'Africa/Maputo')
     ORDER BY day ASC`,
    {
      replacements: { tenantId, status: SaleStatus.COMPLETED, since },
      type: QueryTypes.SELECT,
    },
  );

  // `row.day` já é a data local de Maputo (o driver lê "timestamp without
  // time zone" com os campos tal e qual, sem novo deslocamento) — aqui não
  // se aplica outra conversão de fuso, só se lê a data diretamente.
  const totalsByDay = new Map(rows.map((row) => [new Date(row.day).toISOString().slice(0, 10), Number(row.total)]));

  const days: DailySales[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const instant = new Date(since.getTime() + (6 - offset) * 86_400_000);
    const key = maputoDateKeyFromInstant(instant);
    days.push({ date: key, totalAmount: totalsByDay.get(key) ?? 0 });
  }
  return days;
}

async function fetchPaymentMethodBreakdown(tenantId: string, since: Date): Promise<PaymentMethodTotal[]> {
  const rows = await sequelize.query<{ payment_method: PaymentMethod; total: string; count: string }>(
    `SELECT payment_method, SUM(total_amount) AS total, COUNT(*) AS count
     FROM sales
     WHERE tenant_id = :tenantId AND status = :status AND created_at >= :since
     GROUP BY payment_method`,
    {
      replacements: { tenantId, status: SaleStatus.COMPLETED, since },
      type: QueryTypes.SELECT,
    },
  );

  const byMethod = new Map(
    rows.map((row) => [row.payment_method, { totalAmount: Number(row.total), count: Number(row.count) }]),
  );

  return Object.values(PaymentMethod).map((paymentMethod) => ({
    paymentMethod,
    totalAmount: byMethod.get(paymentMethod)?.totalAmount ?? 0,
    count: byMethod.get(paymentMethod)?.count ?? 0,
  }));
}

async function fetchTopProducts(tenantId: string, since: Date): Promise<TopProduct[]> {
  const rows = await sequelize.query<{ product_id: string; name: string; quantity_sold: string }>(
    `SELECT p.id AS product_id, p.name AS name, SUM(si.quantity) AS quantity_sold
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN products p ON p.id = si.product_id
     WHERE s.tenant_id = :tenantId AND s.status = :status AND s.created_at >= :since
     GROUP BY p.id, p.name
     ORDER BY quantity_sold DESC
     LIMIT 5`,
    {
      replacements: { tenantId, status: SaleStatus.COMPLETED, since },
      type: QueryTypes.SELECT,
    },
  );

  return rows.map((row) => ({
    productId: row.product_id,
    name: row.name,
    quantitySold: Number(row.quantity_sold),
  }));
}

async function fetchAgentMarginSummary(tenantId: string, since: Date): Promise<SalesSummary> {
  const rows = await sequelize.query<{ total: string | null; count: string }>(
    `SELECT COALESCE(SUM(agent_margin_amount), 0) AS total, COUNT(*) AS count
     FROM sales
     WHERE tenant_id = :tenantId AND status = :status AND created_at >= :since
       AND mobile_money_flow = :agentFlow`,
    {
      replacements: { tenantId, status: SaleStatus.COMPLETED, since, agentFlow: MobileMoneyFlow.AGENT },
      type: QueryTypes.SELECT,
    },
  );

  const row = rows[0];
  return {
    totalAmount: Number(row?.total ?? 0),
    count: Number(row?.count ?? 0),
  };
}

async function fetchLowStockCount(tenantId: string): Promise<number> {
  const rows = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM products
     WHERE tenant_id = :tenantId AND is_active = true AND stock_quantity <= min_stock_alert`,
    { replacements: { tenantId }, type: QueryTypes.SELECT },
  );

  return Number(rows[0]?.count ?? 0);
}

export async function getDashboardSummary(tenantId: string): Promise<DashboardSummary> {
  const now = new Date();
  const todayStart = startOfMaputoDay(now);
  const monthStart = startOfMaputoMonth(now);
  const sevenDaysAgoStart = new Date(todayStart.getTime() - 6 * 86_400_000);

  const [today, monthRaw, last7Days, paymentMethodBreakdown, topProducts, lowStockCount, agentMarginMonth] =
    await Promise.all([
      fetchSalesSummary(tenantId, todayStart),
      fetchSalesSummary(tenantId, monthStart),
      fetchLast7Days(tenantId, sevenDaysAgoStart),
      fetchPaymentMethodBreakdown(tenantId, monthStart),
      fetchTopProducts(tenantId, monthStart),
      fetchLowStockCount(tenantId),
      fetchAgentMarginSummary(tenantId, monthStart),
    ]);

  const averageTicket = monthRaw.count > 0 ? monthRaw.totalAmount / monthRaw.count : 0;

  return {
    today,
    month: { ...monthRaw, averageTicket },
    last7Days,
    paymentMethodBreakdown,
    topProducts,
    lowStockCount,
    agentMarginMonth,
  };
}
