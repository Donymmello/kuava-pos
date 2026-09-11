import { UniqueConstraintError } from 'sequelize';
import { sequelize, Product, Sale, SaleItem } from '../models';
import { isFractionalUnit, PaymentMethod, SaleStatus } from '../types/enums';
import { AppError } from '../utils/AppError';
import { calculateLineTotals, roundCurrency, roundQuantity } from './ivaService';
import { consumeFromLots, restoreToLots } from './productLotService';

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
   * Opcional, referência livre (ex.: código de confirmação de M-Pesa/e-Mola,
   * ou qualquer outra nota do caixa), só guardada quando paymentMethod é
   * TRANSFER. O Kuava não distingue operadora nem mecanismo (Paga Fácil,
   * agente, PaySuite, transferência bancária), isso é escolha de cada
   * comerciante, ver enums.ts.
   */
  paymentReference?: string;
}

export interface SaleWithItems {
  id: string;
  tenant_id: string;
  user_id: string;
  total_amount: number;
  tax_amount: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  payment_reference: string | null;
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
    payment_reference: string | null;
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
    payment_reference: plain.payment_reference,
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

  // Reenvio de uma venda já sincronizada (ex.: o POS tentou sincronizar,
  // recebeu a resposta mas perdeu a ligação antes de a confirmar, e voltou
  // a tentar), devolve a venda existente em vez de a duplicar.
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

      // Produtos vendidos por unidade inteira (UN) não podem ter quantidade
      // fracionária (ex.: 2.5 latas não faz sentido), só produtos vendidos
      // por peso/comprimento (KG/G/L/M, ver ProductUnit) permitem isso.
      const quantity = isFractionalUnit(product.unit)
        ? roundQuantity(requestedItem.quantity)
        : Math.round(requestedItem.quantity);

      if (!isFractionalUnit(product.unit) && quantity !== requestedItem.quantity) {
        throw new AppError(
          `"${product.name}" vende-se por unidade inteira, indique uma quantidade sem casas decimais`,
          422,
        );
      }

      if (product.stock_quantity < quantity) {
        throw new AppError(
          `Stock insuficiente para "${product.name}". Disponível: ${product.stock_quantity}`,
          409,
        );
      }

      // product.price já inclui IVA (é o preço final cobrado ao cliente),
      // `total` é o valor da linha tal como pago; `taxAmount` é só a fatia de
      // IVA discriminada "para trás" a partir desse valor, para a fatura.
      const { taxAmount: lineTax, total: lineTotal } = calculateLineTotals(
        product.price,
        quantity,
        product.tax_rate,
      );

      totalAmount = roundCurrency(totalAmount + lineTotal);
      taxAmount = roundCurrency(taxAmount + lineTax);

      itemsToCreate.push({
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: product.price,
        subtotal: lineTotal,
      });
    }

    const sale = await Sale.create(
      {
        tenant_id: input.tenantId,
        user_id: input.userId,
        total_amount: totalAmount,
        tax_amount: taxAmount,
        payment_method: input.paymentMethod,
        status: SaleStatus.COMPLETED,
        client_ref: input.clientRef ?? null,
        payment_reference:
          input.paymentMethod === PaymentMethod.TRANSFER ? input.paymentReference?.trim() || null : null,
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

    // Dá baixa automática no stock de cada produto vendido. Produtos com
    // tracks_batches (ver Product.ts) descontam dos lotes por ordem de
    // validade mais próxima primeiro (FEFO) em vez de um decremento direto,
    // ver productLotService.consumeFromLots.
    for (let index = 0; index < itemsToCreate.length; index += 1) {
      const item = itemsToCreate[index];
      const product = productsById.get(item.product_id) as Product;

      if (product.tracks_batches) {
        await consumeFromLots(product.id, item.quantity, createdItems[index].id, transaction);
      } else {
        await product.decrement('stock_quantity', { by: item.quantity, transaction });
      }
    }

    return {
      id: sale.id,
      tenant_id: sale.tenant_id,
      user_id: sale.user_id,
      total_amount: sale.total_amount,
      tax_amount: sale.tax_amount,
      payment_method: sale.payment_method,
      status: sale.status,
      payment_reference: sale.payment_reference,
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
      // O produto pode ter sido desativado entretanto (nunca é apagado de
      // facto, só desativado, ver productService.deleteProduct), mas por
      // segurança: sem produto não há stock nenhum a repor.
      const product = await Product.findOne({
        where: { id: item.product_id, tenant_id: tenantId },
        transaction,
      });

      if (!product) {
        continue;
      }

      if (product.tracks_batches) {
        await restoreToLots(item.id, transaction);
      } else {
        await product.increment('stock_quantity', { by: item.quantity, transaction });
      }
    }

    await sale.update({ status: SaleStatus.CANCELLED }, { transaction });

    return sale;
  });
}
