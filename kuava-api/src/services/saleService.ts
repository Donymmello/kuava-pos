import { UniqueConstraintError } from 'sequelize';
import { sequelize, Product, Sale, SaleItem } from '../models';
import { MobileMoneyFlow, PaymentMethod, SaleStatus } from '../types/enums';
import { AppError } from '../utils/AppError';
import { calculateLineTotals, roundCurrency } from './ivaService';

const MOBILE_MONEY_METHODS: ReadonlySet<PaymentMethod> = new Set([PaymentMethod.MPESA, PaymentMethod.EMOLA]);

export interface SaleItemInput {
  product_id: string;
  quantity: number;
}

export interface CreateSaleInput {
  tenantId: string;
  userId: string;
  paymentMethod: PaymentMethod;
  items: SaleItemInput[];
  /**
   * Chave de idempotência opcional (ex.: vendas feitas offline no POS e
   * sincronizadas mais tarde). Um pedido repetido com o mesmo clientRef
   * devolve a venda já existente em vez de a duplicar.
   */
  clientRef?: string;
  /**
   * Opcional, só relevante quando paymentMethod é MPESA/EMOLA: distingue
   * transferência normal de levantamento como agente — não existe API C2B
   * simples para um POS pequeno se ligar, por isso a confirmação é sempre
   * manual. Fica de fora deliberadamente do fluxo obrigatório de finalizar a
   * venda, para não atrasar o caixa; quando indicado, tem de ser válido.
   */
  mobileMoneyFlow?: MobileMoneyFlow;
  /** Opcional — referência da SMS de confirmação, quando mobileMoneyFlow é TRANSFER. */
  paymentReference?: string;
  /** Opcional — margem/comissão retida pela loja, quando mobileMoneyFlow é AGENT; se indicada, não pode ser negativa. */
  agentMarginAmount?: number;
}

export interface SaleWithItems {
  id: string;
  tenant_id: string;
  user_id: string;
  total_amount: number;
  tax_amount: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  mobile_money_flow: MobileMoneyFlow | null;
  payment_reference: string | null;
  agent_margin_amount: number | null;
  created_at: Date;
  items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

async function findSaleWithItemsByClientRef(
  tenantId: string,
  clientRef: string,
): Promise<SaleWithItems | null> {
  interface PlainSaleWithItems {
    id: string;
    tenant_id: string;
    user_id: string;
    total_amount: number;
    tax_amount: number;
    payment_method: PaymentMethod;
    status: SaleStatus;
    mobile_money_flow: MobileMoneyFlow | null;
    payment_reference: string | null;
    agent_margin_amount: number | null;
    created_at: Date;
    items: Array<{
      id: string;
      product_id: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
      product?: { name: string } | null;
    }>;
  }

  const sale = await Sale.findOne({
    where: { tenant_id: tenantId, client_ref: clientRef },
    include: [{ model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }] }],
  });

  if (!sale) {
    return null;
  }

  const plain = sale.get({ plain: true }) as unknown as PlainSaleWithItems;

  return {
    id: plain.id,
    tenant_id: plain.tenant_id,
    user_id: plain.user_id,
    total_amount: plain.total_amount,
    tax_amount: plain.tax_amount,
    payment_method: plain.payment_method,
    status: plain.status,
    mobile_money_flow: plain.mobile_money_flow,
    payment_reference: plain.payment_reference,
    agent_margin_amount: plain.agent_margin_amount,
    created_at: plain.created_at,
    items: plain.items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product?.name ?? 'Produto removido',
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    })),
  };
}

export async function createSale(input: CreateSaleInput): Promise<SaleWithItems> {
  if (!input.items || input.items.length === 0) {
    throw new AppError('A venda deve conter pelo menos um item', 422);
  }

  if (!Object.values(PaymentMethod).includes(input.paymentMethod)) {
    throw new AppError('Método de pagamento inválido', 422);
  }

  // M-Pesa/e-Mola não têm uma API C2B simples de ligar a um POS pequeno —
  // a confirmação é sempre manual, e distinguimos como o dinheiro chegou:
  // transferência normal (com referência da SMS) ou levantamento como agente
  // (com a margem/comissão que a loja fica a reter). Nada disto é obrigatório
  // — o caixa pode finalizar sem indicar nada, para não travar o atendimento —
  // mas se ele indicar alguma coisa, tem de fazer sentido.
  if (MOBILE_MONEY_METHODS.has(input.paymentMethod)) {
    if (input.mobileMoneyFlow && !Object.values(MobileMoneyFlow).includes(input.mobileMoneyFlow)) {
      throw new AppError('Fluxo de pagamento M-Pesa/e-Mola inválido', 422);
    }

    if (
      input.mobileMoneyFlow === MobileMoneyFlow.AGENT &&
      input.agentMarginAmount !== undefined &&
      input.agentMarginAmount !== null &&
      (Number.isNaN(input.agentMarginAmount) || input.agentMarginAmount < 0)
    ) {
      throw new AppError('O valor da margem cobrada não pode ser negativo', 422);
    }
  }

  // Reenvio de uma venda já sincronizada (ex.: o POS tentou sincronizar,
  // recebeu a resposta mas perdeu a ligação antes de a confirmar, e voltou
  // a tentar) — devolve a venda existente em vez de a duplicar.
  if (input.clientRef) {
    const existing = await findSaleWithItemsByClientRef(input.tenantId, input.clientRef);
    if (existing) {
      return existing;
    }
  }

  try {
    return await createSaleInternal(input);
  } catch (error) {
    if (error instanceof UniqueConstraintError && input.clientRef) {
      // Corrida: duas tentativas com o mesmo clientRef quase em simultâneo.
      const existing = await findSaleWithItemsByClientRef(input.tenantId, input.clientRef);
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
}

async function createSaleInternal(input: CreateSaleInput): Promise<SaleWithItems> {
  return sequelize.transaction(async (transaction) => {
    const productIds = input.items.map((item) => item.product_id);

    // Bloqueia as linhas dos produtos envolvidos para evitar condições de
    // corrida em vendas concorrentes sobre o mesmo stock.
    const products = await Product.findAll({
      where: { id: productIds, tenant_id: input.tenantId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const productsById = new Map(products.map((product) => [product.id, product]));

    let totalAmount = 0;
    let taxAmount = 0;
    const itemsToCreate: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }> = [];

    for (const requestedItem of input.items) {
      const product = productsById.get(requestedItem.product_id);

      if (!product || !product.is_active) {
        throw new AppError(`Produto não encontrado: ${requestedItem.product_id}`, 404);
      }

      if (requestedItem.quantity <= 0) {
        throw new AppError(`Quantidade inválida para o produto "${product.name}"`, 422);
      }

      if (product.stock_quantity < requestedItem.quantity) {
        throw new AppError(
          `Stock insuficiente para "${product.name}". Disponível: ${product.stock_quantity}`,
          409,
        );
      }

      const { subtotal, taxAmount: lineTax } = calculateLineTotals(
        product.price,
        requestedItem.quantity,
        product.tax_rate,
      );

      totalAmount = roundCurrency(totalAmount + subtotal + lineTax);
      taxAmount = roundCurrency(taxAmount + lineTax);

      itemsToCreate.push({
        product_id: product.id,
        product_name: product.name,
        quantity: requestedItem.quantity,
        unit_price: product.price,
        subtotal,
      });
    }

    const isMobileMoney = MOBILE_MONEY_METHODS.has(input.paymentMethod);

    const sale = await Sale.create(
      {
        tenant_id: input.tenantId,
        user_id: input.userId,
        total_amount: totalAmount,
        tax_amount: taxAmount,
        payment_method: input.paymentMethod,
        status: SaleStatus.COMPLETED,
        client_ref: input.clientRef ?? null,
        mobile_money_flow: isMobileMoney ? input.mobileMoneyFlow ?? null : null,
        payment_reference:
          isMobileMoney && input.mobileMoneyFlow === MobileMoneyFlow.TRANSFER
            ? input.paymentReference?.trim() || null
            : null,
        agent_margin_amount:
          isMobileMoney && input.mobileMoneyFlow === MobileMoneyFlow.AGENT
            ? input.agentMarginAmount ?? null
            : null,
      },
      { transaction },
    );

    const createdItems = await SaleItem.bulkCreate(
      itemsToCreate.map((item) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      })),
      { transaction },
    );

    // Dá baixa automática no stock de cada produto vendido.
    for (const item of itemsToCreate) {
      const product = productsById.get(item.product_id) as Product;
      await product.decrement('stock_quantity', { by: item.quantity, transaction });
    }

    return {
      id: sale.id,
      tenant_id: sale.tenant_id,
      user_id: sale.user_id,
      total_amount: sale.total_amount,
      tax_amount: sale.tax_amount,
      payment_method: sale.payment_method,
      status: sale.status,
      mobile_money_flow: sale.mobile_money_flow,
      payment_reference: sale.payment_reference,
      agent_margin_amount: sale.agent_margin_amount,
      created_at: sale.created_at,
      items: createdItems.map((created, index) => ({
        id: created.id,
        product_id: created.product_id,
        product_name: itemsToCreate[index].product_name,
        quantity: created.quantity,
        unit_price: created.unit_price,
        subtotal: created.subtotal,
      })),
    };
  });
}

export async function cancelSale(tenantId: string, saleId: string): Promise<Sale> {
  return sequelize.transaction(async (transaction) => {
    const sale = await Sale.findOne({
      where: { id: saleId, tenant_id: tenantId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!sale) {
      throw new AppError('Venda não encontrada', 404);
    }

    if (sale.status === SaleStatus.CANCELLED) {
      throw new AppError('Esta venda já se encontra cancelada', 409);
    }

    const items = await SaleItem.findAll({ where: { sale_id: sale.id }, transaction });

    for (const item of items) {
      await Product.increment('stock_quantity', {
        by: item.quantity,
        where: { id: item.product_id, tenant_id: tenantId },
        transaction,
      });
    }

    await sale.update({ status: SaleStatus.CANCELLED }, { transaction });

    return sale;
  });
}
