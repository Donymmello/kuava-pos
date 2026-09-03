import { Op, UniqueConstraintError } from 'sequelize';
import { sequelize, Product } from '../models';
import { AppError } from '../utils/AppError';

const DUPLICATE_BARCODE_MESSAGE = 'Já existe um produto com este código de barras';

export interface ListProductsInput {
  tenantId: string;
  search?: string;
  category?: string;
  activeOnly?: string;
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
  const where: Record<string, unknown> = { tenant_id: input.tenantId };

  if (input.activeOnly !== 'false') {
    where.is_active = true;
  }

  if (input.category) {
    where.category = input.category;
  }

  if (input.search) {
    where[Op.or as unknown as string] = [
      { name: { [Op.iLike]: `%${input.search}%` } },
      { barcode: { [Op.iLike]: `%${input.search}%` } },
    ];
  }

  const { rows, count } = await Product.findAndCountAll({
    where,
    order: [['name', 'ASC']],
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
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  if (!input.name || input.price === undefined) {
    throw new AppError('Campos obrigatórios em falta: name, price', 422);
  }

  // Envolvido numa transação (revisão de performance/ACID, 2026-09-01):
  // a verificação de duplicado + a escrita passam a ser uma única unidade
  // de trabalho. Isto sozinho não fecha a corrida entre dois pedidos
  // concorrentes com o mesmo código de barras (o nível de isolamento
  // READ COMMITTED do Postgres deixaria os dois passarem a verificação) —
  // quem garante mesmo a consistência é o índice único
  // `products_tenant_id_barcode_unique` na base de dados. O `catch` abaixo
  // existe para que, no caso raro dessa corrida acontecer de facto, o
  // utilizador continue a ver a mensagem amigável em vez de um erro 422
  // genérico do `errorHandler` — mesmo padrão já usado em
  // `saleService.createSale` para o `client_ref`.
  return sequelize.transaction(async (transaction) => {
    if (input.barcode) {
      const existing = await Product.findOne({
        where: { tenant_id: input.tenantId, barcode: input.barcode },
        transaction,
      });
      if (existing) {
        throw new AppError(DUPLICATE_BARCODE_MESSAGE, 409);
      }
    }

    try {
      return await Product.create(
        {
          tenant_id: input.tenantId,
          barcode: input.barcode ?? null,
          name: input.name,
          price: input.price,
          cost_price: input.cost_price ?? 0,
          stock_quantity: input.stock_quantity ?? 0,
          min_stock_alert: input.min_stock_alert ?? 5,
          tax_rate: input.tax_rate ?? 0.16,
          category: input.category ?? null,
        },
        { transaction },
      );
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new AppError(DUPLICATE_BARCODE_MESSAGE, 409);
      }
      throw error;
    }
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
  is_active?: boolean;
}

export async function updateProduct(input: UpdateProductInput): Promise<Product> {
  // `lock: transaction.LOCK.UPDATE` aqui tem valor real distinto do caso de
  // criação: bloqueia a própria linha do produto durante a transação, o que
  // evita uma segunda atualização concorrente ao MESMO produto perder
  // silenciosamente as alterações da primeira (lost update) — algo que o
  // caso de criação não tem (não há linha nenhuma para bloquear antes de
  // existir). A duplicação de código de barras continua a ser fechada, em
  // último caso, pelo índice único da base de dados — ver nota em
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
          stock_quantity: input.stock_quantity ?? product.stock_quantity,
          min_stock_alert: input.min_stock_alert ?? product.min_stock_alert,
          tax_rate: input.tax_rate ?? product.tax_rate,
          category: input.category ?? product.category,
          is_active: input.is_active ?? product.is_active,
        },
        { transaction },
      );
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new AppError(DUPLICATE_BARCODE_MESSAGE, 409);
      }
      throw error;
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
