import { Op, QueryTypes, Transaction } from 'sequelize';
import { sequelize, Product, ProductLot, SaleItemLot } from '../models';
import { AppError } from '../utils/AppError';
import { roundQuantity } from './ivaService';

/**
 * Recalcula stock_quantity e expiry_date do produto a partir da soma e da
 * validade mais próxima entre os seus lotes com stock (`quantity > 0`),
 * dentro da mesma transação que alterou os lotes. Mantém os dois campos do
 * produto sincronizados de propósito, para o resto do sistema (POS,
 * dashboard, faturas) continuar a ler `stock_quantity`/`expiry_date`
 * diretamente sem precisar de saber se há lotes por trás.
 */
export async function syncProductFromLots(productId: string, transaction: Transaction): Promise<void> {
  const rows = await sequelize.query<{ total_quantity: string | null; earliest_expiry: string | null }>(
    `SELECT COALESCE(SUM(quantity), 0) AS total_quantity, MIN(expiry_date) AS earliest_expiry
     FROM product_lots
     WHERE product_id = :productId AND quantity > 0`,
    { replacements: { productId }, type: QueryTypes.SELECT, transaction },
  );

  await Product.update(
    {
      stock_quantity: roundQuantity(Number(rows[0]?.total_quantity ?? 0)),
      expiry_date: rows[0]?.earliest_expiry ?? null,
    },
    { where: { id: productId }, transaction },
  );
}

/**
 * Confirma que o produto existe, pertence ao tenant, e tem o controle por
 * lotes ativado. Quando chamado com uma transação, bloqueia a linha do
 * produto até esta terminar, para serializar criações/remoções de lotes
 * concorrentes sobre o mesmo produto (sem isto, duas transações a somar os
 * lotes ao mesmo tempo podiam perder a contribuição uma da outra).
 */
async function findBatchTrackedProduct(
  tenantId: string,
  productId: string,
  transaction?: Transaction,
): Promise<Product> {
  const product = await Product.findOne({
    where: { id: productId, tenant_id: tenantId },
    transaction,
    lock: transaction?.LOCK.UPDATE,
  });

  if (!product) {
    throw new AppError('Produto não encontrado', 404);
  }

  if (!product.tracks_batches) {
    throw new AppError('Este produto não tem o controle por lotes ativado', 422);
  }

  return product;
}

export async function listLots(tenantId: string, productId: string): Promise<ProductLot[]> {
  await findBatchTrackedProduct(tenantId, productId);

  return ProductLot.findAll({
    where: { tenant_id: tenantId, product_id: productId, quantity: { [Op.gt]: 0 } },
    order: [['expiry_date', 'ASC']],
  });
}

export interface CreateLotInput {
  tenantId: string;
  productId: string;
  quantity: number;
  expiryDate: string | null;
}

async function createLotInTransaction(input: CreateLotInput, transaction: Transaction): Promise<ProductLot> {
  const lot = await ProductLot.create(
    {
      tenant_id: input.tenantId,
      product_id: input.productId,
      quantity: roundQuantity(input.quantity),
      expiry_date: input.expiryDate,
    },
    { transaction },
  );

  await syncProductFromLots(input.productId, transaction);

  return lot;
}

export async function createLot(input: CreateLotInput): Promise<ProductLot> {
  if (!input.quantity || input.quantity <= 0) {
    throw new AppError('A quantidade do lote deve ser maior que zero', 422);
  }

  return sequelize.transaction(async (transaction) => {
    await findBatchTrackedProduct(input.tenantId, input.productId, transaction);
    return createLotInTransaction(input, transaction);
  });
}

/**
 * Usado só na transição de um produto para tracks_batches = true (ver
 * productService.ts): o stock e a validade que ele já tinha viram o
 * primeiro lote, para não se perder nada. Ao contrário de `createLot`, não
 * valida tracks_batches (é chamado exatamente enquanto essa mudança está a
 * ser aplicada) nem abre transação própria, corre dentro da mesma
 * transação do create/update do produto.
 */
export async function createInitialLotForExistingStock(
  tenantId: string,
  productId: string,
  quantity: number,
  expiryDate: string | null,
  transaction: Transaction,
): Promise<void> {
  if (!quantity || quantity <= 0) {
    return;
  }

  await createLotInTransaction({ tenantId, productId, quantity, expiryDate }, transaction);
}

export async function deleteLot(tenantId: string, productId: string, lotId: string): Promise<void> {
  return sequelize.transaction(async (transaction) => {
    await findBatchTrackedProduct(tenantId, productId, transaction);

    const lot = await ProductLot.findOne({
      where: { id: lotId, tenant_id: tenantId, product_id: productId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lot) {
      throw new AppError('Lote não encontrado', 404);
    }

    // Só deixa apagar um lote que nunca foi tocado por nenhuma venda, serve
    // para corrigir um lote registado por engano. Um lote já parcialmente
    // vendido não pode ser apagado (perderia o histórico de que um
    // cancelamento de venda precisa para repor a quantidade certa), só
    // esvazia sozinho por vendas normais.
    const consumed = await SaleItemLot.sum('quantity', {
      where: { product_lot_id: lot.id },
      transaction,
    });

    if (consumed && consumed > 0) {
      throw new AppError('Este lote já tem vendas associadas e não pode ser apagado', 409);
    }

    await lot.destroy({ transaction });
    await syncProductFromLots(productId, transaction);
  });
}

/**
 * Desconta `quantity` dos lotes do produto por ordem de validade mais
 * próxima primeiro (FEFO). No Postgres, ORDER BY ... ASC já deixa os NULLs
 * por último, por isso lotes sem validade registada ficam para o fim, sem
 * SQL extra. Atravessa quantos lotes forem precisos e regista em
 * sale_item_lots de qual lote saiu quanto, para `restoreToLots` poder
 * repor no sítio certo se a venda for cancelada. Chamado já dentro da
 * transação da venda, com o produto já bloqueado por `createSaleInternal`
 * (ver saleService.ts).
 */
export async function consumeFromLots(
  productId: string,
  quantity: number,
  saleItemId: string,
  transaction: Transaction,
): Promise<void> {
  const lots = await ProductLot.findAll({
    where: { product_id: productId, quantity: { [Op.gt]: 0 } },
    order: [['expiry_date', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  let remaining = quantity;

  for (const lot of lots) {
    if (remaining <= 0) {
      break;
    }

    const takenFromLot = Math.min(lot.quantity, remaining);

    await lot.decrement('quantity', { by: takenFromLot, transaction });
    await SaleItemLot.create(
      { sale_item_id: saleItemId, product_lot_id: lot.id, quantity: takenFromLot },
      { transaction },
    );

    remaining = roundQuantity(remaining - takenFromLot);
  }

  if (remaining > 0) {
    // Não devia acontecer: createSaleInternal já validou stock_quantity (a
    // soma dos lotes) antes de chegar aqui. Falha alto em vez de vender
    // mais do que existe, no caso raro de os dois ficarem dessincronizados.
    throw new AppError('Stock insuficiente nos lotes deste produto', 409);
  }

  await syncProductFromLots(productId, transaction);
}

/**
 * Reverte exatamente o que `consumeFromLots` fez para este item de venda,
 * usado por `cancelSale` (ver saleService.ts).
 */
export async function restoreToLots(saleItemId: string, transaction: Transaction): Promise<void> {
  const consumptions = await SaleItemLot.findAll({
    where: { sale_item_id: saleItemId },
    transaction,
  });

  let productId: string | null = null;

  for (const consumption of consumptions) {
    const lot = await ProductLot.findOne({
      where: { id: consumption.product_lot_id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (lot) {
      await lot.increment('quantity', { by: consumption.quantity, transaction });
      productId = lot.product_id;
    }

    await consumption.destroy({ transaction });
  }

  if (productId) {
    await syncProductFromLots(productId, transaction);
  }
}
