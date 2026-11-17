import { Op, UniqueConstraintError } from 'sequelize';
import { sequelize, Product } from '../models';
import { AppError } from '../utils/AppError';
import { ProductUnit } from '../types/enums';
import { roundQuantity } from './ivaService';
import { createInitialLotForExistingStock } from './productLotService';

const DUPLICATE_BARCODE_MESSAGE = 'Já existe um produto com este código de barras';

export interface ListProductsInput {
  tenantId: string;
  search?: string;
  category?: string;
  activeOnly?: string;
  status?: 'all' | 'active' | 'inactive';
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  startDate?: string;
  endDate?: string;
  sortBy?: 'name' | 'created_at' | 'price' | 'stock_quantity' | 'expiry_date';
  sortOrder?: 'ASC' | 'DESC';
  page: number;
  pageSize: number;
}

export interface ListProductsResult {
  items: Product[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export async function listProducts(input: ListProductsInput): Promise<ListProductsResult> {
  const where: Record<string | symbol, unknown> = { tenant_id: input.tenantId };

  if (input.status === 'active' || (input.activeOnly === 'true' && !input.status)) {
    where.is_active = true;
  } else if (input.status === 'inactive') {
    where.is_active = false;
  } else if (input.status === 'all' || input.activeOnly === 'false') {
    // Não filtra is_active (mostra todos)
  } else {
    // Por omissão, filtra apenas produtos ativos (ex.: chamadas antigas sem activeOnly nem status)
    where.is_active = true;
  }

  if (input.category && input.category !== 'all') {
    if (input.category === '__none__') {
      where.category = { [Op.or]: [null, ''] };
    } else {
      where.category = input.category;
    }
  }

  if (input.search && input.search.trim()) {
    const term = input.search.trim();
    where[Op.or] = [
      { name: { [Op.iLike]: `%${term}%` } },
      { barcode: { [Op.iLike]: `%${term}%` } },
      { category: { [Op.iLike]: `%${term}%` } },
    ];
  }

  const andConditions: unknown[] = [];

  if (input.stockStatus === 'out_of_stock') {
    where.stock_quantity = { [Op.lte]: 0 };
  } else if (input.stockStatus === 'in_stock') {
    where.stock_quantity = { [Op.gt]: 0 };
  } else if (input.stockStatus === 'low_stock') {
    andConditions.push(
      { stock_quantity: { [Op.gt]: 0 } },
      sequelize.where(sequelize.col('stock_quantity'), '<=', sequelize.col('min_stock_alert')),
    );
  }

  if (input.startDate || input.endDate) {
    const dateCondition: Record<string | symbol, unknown> = {};
    if (input.startDate) {
      dateCondition[Op.gte] = new Date(`${input.startDate}T00:00:00.000Z`);
    }
    if (input.endDate) {
      dateCondition[Op.lte] = new Date(`${input.endDate}T23:59:59.999Z`);
    }
    where.created_at = dateCondition;
  }

  if (andConditions.length > 0) {
    where[Op.and] = andConditions;
  }

  const allowedSortFields = ['name', 'created_at', 'price', 'stock_quantity', 'expiry_date'];
  const sortBy = allowedSortFields.includes(input.sortBy ?? '') ? input.sortBy! : 'name';
  const sortOrder = input.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const order: [string, string][] = [[sortBy, sortOrder]];
  if (sortBy !== 'name') {
    order.push(['name', 'ASC']);
  }

  const { rows, count } = await Product.findAndCountAll({
    where,
    order,
    limit: input.pageSize,
    offset: (input.page - 1) * input.pageSize,
  });

  return {
    items: rows,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total: count,
      totalPages: Math.ceil(count / input.pageSize),
    },
  };
}

export async function listCategories(tenantId: string): Promise<string[]> {
  const products = await Product.findAll({
    where: {
      tenant_id: tenantId,
      category: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
    },
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
    order: [[sequelize.col('category'), 'ASC']],
    raw: true,
  });

  return (products as unknown as Array<{ category: string }>)
    .map((p) => p.category?.trim())
    .filter((cat): cat is string => Boolean(cat));
}

export async function getProductById(tenantId: string, id: string): Promise<Product> {
  const product = await Product.findOne({ where: { id, tenant_id: tenantId } });

  if (!product) {
    throw new AppError('Produto não encontrado', 404);
  }

  return product;
}

export async function getProductByBarcode(tenantId: string, barcode: string): Promise<Product> {
  const product = await Product.findOne({
    where: { barcode, tenant_id: tenantId, is_active: true },
  });

  if (!product) {
    throw new AppError('Produto não encontrado para este código de barras', 404);
  }

  return product;
}

export interface CreateProductInput {
  tenantId: string;
  barcode?: string | null;
  name: string;
  price: number;
  cost_price?: number;
  stock_quantity?: number;
  min_stock_alert?: number;
  tax_rate?: number;
  category?: string | null;
  unit?: ProductUnit;
  /** "AAAA-MM-DD", ou null para "sem validade a controlar". */
  expiry_date?: string | null;
  /** Controle por lotes (ver Product.ts), false por omissão. */
  tracks_batches?: boolean;
}

export interface CreateProductResult {
  product: Product;
  wasMerged: boolean;
  addedStock: number;
}

export async function createProduct(input: CreateProductInput): Promise<CreateProductResult> {
  if (!input.name || input.price === undefined) {
    throw new AppError('Campos obrigatórios em falta: name, price', 422);
  }

  if (input.unit !== undefined && !Object.values(ProductUnit).includes(input.unit)) {
    throw new AppError('Unidade de medida inválida', 422);
  }

  const trimmedName = input.name.trim();
  const cleanBarcode = input.barcode?.trim() || null;

  return sequelize.transaction(async (transaction) => {
    let existing: Product | null = null;

    // 1. Procura por código de barras existente (se fornecido)
    if (cleanBarcode) {
      existing = await Product.findOne({
        where: { tenant_id: input.tenantId, barcode: cleanBarcode },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
    }

    // 2. Se não encontrou por código, procura por nome com mesma grafia (case-insensitive e sem espaços extras)
    if (!existing) {
      existing = await Product.findOne({
        where: {
          tenant_id: input.tenantId,
          [Op.and]: [
            sequelize.where(
              sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('name'))),
              trimmedName.toLowerCase(),
            ),
          ],
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
    }

    // Se o produto já existir, evita duplicação e soma o stock recebido
    if (existing) {
      const addedStock = roundQuantity(input.stock_quantity ?? 0);

      if (existing.tracks_batches) {
        if (addedStock > 0) {
          await createInitialLotForExistingStock(
            input.tenantId,
            existing.id,
            addedStock,
            input.expiry_date ?? null,
            transaction,
          );
        }
      } else {
        const nextStock = roundQuantity(existing.stock_quantity + addedStock);
        existing.stock_quantity = nextStock;
        if (input.expiry_date !== undefined && input.expiry_date) {
          existing.expiry_date = input.expiry_date;
        }
      }

      if (!existing.is_active) {
        existing.is_active = true;
      }

      if (cleanBarcode && !existing.barcode) {
        existing.barcode = cleanBarcode;
      }

      if (input.category && !existing.category) {
        existing.category = input.category;
      }

      if (input.price !== undefined && input.price > 0) {
        existing.price = input.price;
      }

      if (input.cost_price !== undefined && input.cost_price > 0) {
        existing.cost_price = input.cost_price;
      }

      await existing.save({ transaction });
      await existing.reload({ transaction });

      return {
        product: existing,
        wasMerged: true,
        addedStock,
      };
    }

    let product: Product;

    try {
      product = await Product.create(
        {
          tenant_id: input.tenantId,
          barcode: cleanBarcode,
          name: trimmedName,
          price: input.price,
          cost_price: input.cost_price ?? 0,
          stock_quantity: roundQuantity(input.stock_quantity ?? 0),
          min_stock_alert: roundQuantity(input.min_stock_alert ?? 5),
          tax_rate: input.tax_rate ?? 0.16,
          category: input.category ?? null,
          unit: input.unit ?? ProductUnit.UN,
          expiry_date: input.expiry_date ?? null,
          tracks_batches: input.tracks_batches ?? false,
        },
        { transaction },
      );
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new AppError(DUPLICATE_BARCODE_MESSAGE, 409);
      }
      throw error;
    }

    if (product.tracks_batches && product.stock_quantity > 0) {
      await createInitialLotForExistingStock(
        input.tenantId,
        product.id,
        product.stock_quantity,
        product.expiry_date,
        transaction,
      );
      await product.reload({ transaction });
    }

    return {
      product,
      wasMerged: false,
      addedStock: product.stock_quantity,
    };
  });
}

export interface AddStockInput {
  tenantId: string;
  id: string;
  quantity: number;
  costPrice?: number;
  expiryDate?: string | null;
}

export async function addStock(input: AddStockInput): Promise<Product> {
  if (!input.quantity || input.quantity <= 0) {
    throw new AppError('A quantidade a adicionar deve ser maior que zero', 422);
  }

  return sequelize.transaction(async (transaction) => {
    const product = await Product.findOne({
      where: { id: input.id, tenant_id: input.tenantId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    const added = roundQuantity(input.quantity);

    if (product.tracks_batches) {
      await createInitialLotForExistingStock(
        input.tenantId,
        product.id,
        added,
        input.expiryDate ?? null,
        transaction,
      );
    } else {
      const newStock = roundQuantity(product.stock_quantity + added);
      await product.update(
        {
          stock_quantity: newStock,
          cost_price: input.costPrice !== undefined && input.costPrice > 0 ? input.costPrice : product.cost_price,
          expiry_date: input.expiryDate !== undefined ? input.expiryDate : product.expiry_date,
          is_active: true,
        },
        { transaction },
      );
    }

    await product.reload({ transaction });
    return product;
  });
}

export interface UpdateProductInput {
  tenantId: string;
  id: string;
  barcode?: string | null;
  name?: string;
  price?: number;
  cost_price?: number;
  stock_quantity?: number;
  min_stock_alert?: number;
  tax_rate?: number;
  category?: string | null;
  unit?: ProductUnit;
  expiry_date?: string | null;
  is_active?: boolean;
  tracks_batches?: boolean;
}

export async function updateProduct(input: UpdateProductInput): Promise<Product> {
  if (input.unit !== undefined && !Object.values(ProductUnit).includes(input.unit)) {
    throw new AppError('Unidade de medida inválida', 422);
  }

  // `lock: transaction.LOCK.UPDATE` aqui tem valor real distinto do caso de
  // criação: bloqueia a própria linha do produto durante a transação, o que
  // evita uma segunda atualização concorrente ao MESMO produto perder
  // silenciosamente as alterações da primeira (lost update), algo que o
  // caso de criação não tem (não há linha nenhuma para bloquear antes de
  // existir). A duplicação de código de barras continua a ser fechada, em
  // último caso, pelo índice único da base de dados, ver nota em
  // `createProduct`.
  return sequelize.transaction(async (transaction) => {
    const product = await Product.findOne({
      where: { id: input.id, tenant_id: input.tenantId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    const wasTrackingBatches = product.tracks_batches;
    const willTrackBatches = input.tracks_batches ?? product.tracks_batches;

    // Enquanto o controle por lotes está ativo (já estava, e continua a
    // estar), stock e validade vêm dos lotes, não são um campo solto para
    // editar aqui, ver productLotService.ts.
    if (willTrackBatches && wasTrackingBatches && (input.stock_quantity !== undefined || input.expiry_date !== undefined)) {
      throw new AppError(
        'Este produto controla stock por lotes: o stock e a validade vêm dos lotes, registe um novo lote em vez de editar isto diretamente.',
        422,
      );
    }

    const previousStockQuantity = product.stock_quantity;
    const previousExpiryDate = product.expiry_date;

    if (input.barcode && input.barcode !== product.barcode) {
      const existing = await Product.findOne({
        where: { tenant_id: input.tenantId, barcode: input.barcode, id: { [Op.ne]: product.id } },
        transaction,
      });
      if (existing) {
        throw new AppError(DUPLICATE_BARCODE_MESSAGE, 409);
      }
    }

    try {
      await product.update(
        {
          barcode: input.barcode ?? product.barcode,
          name: input.name ?? product.name,
          price: input.price ?? product.price,
          cost_price: input.cost_price ?? product.cost_price,
          stock_quantity:
            input.stock_quantity !== undefined ? roundQuantity(input.stock_quantity) : product.stock_quantity,
          min_stock_alert:
            input.min_stock_alert !== undefined ? roundQuantity(input.min_stock_alert) : product.min_stock_alert,
          tax_rate: input.tax_rate ?? product.tax_rate,
          category: input.category ?? product.category,
          unit: input.unit ?? product.unit,
          expiry_date: input.expiry_date !== undefined ? input.expiry_date : product.expiry_date,
          is_active: input.is_active ?? product.is_active,
          tracks_batches: willTrackBatches,
        },
        { transaction },
      );
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new AppError(DUPLICATE_BARCODE_MESSAGE, 409);
      }
      throw error;
    }

    // Ativou agora o controle por lotes (não estava ativo antes): o stock e
    // a validade que já tinha viram o primeiro lote, para não se perder
    // nada na transição, depois recarrega para devolver os valores certos
    // (podem já ter mudado, ver syncProductFromLots).
    if (willTrackBatches && !wasTrackingBatches) {
      await createInitialLotForExistingStock(
        input.tenantId,
        product.id,
        previousStockQuantity,
        previousExpiryDate,
        transaction,
      );
      await product.reload({ transaction });
    }

    return product;
  });
}

export async function deleteProduct(tenantId: string, id: string): Promise<void> {
  const product = await Product.findOne({ where: { id, tenant_id: tenantId } });

  if (!product) {
    throw new AppError('Produto não encontrado', 404);
  }

  // Soft delete: preserva o histórico de vendas associado a este produto.
  await product.update({ is_active: false });
}
