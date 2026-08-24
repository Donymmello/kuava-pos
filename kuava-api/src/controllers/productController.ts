import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Product } from '../models';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const { search, category, activeOnly, page = '1', pageSize = '50' } = req.query as Record<
      string,
      string | undefined
    >;

    const pageNumber = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const pageSizeNumber = Math.min(Math.max(parseInt(pageSize ?? '50', 10) || 50, 1), 200);

    const where: Record<string, unknown> = { tenant_id: tenantId };

    if (activeOnly !== 'false') {
      where.is_active = true;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where[Op.or as unknown as string] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Product.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit: pageSizeNumber,
      offset: (pageNumber - 1) * pageSizeNumber,
    });

    sendSuccess(res, {
      items: rows,
      pagination: {
        page: pageNumber,
        pageSize: pageSizeNumber,
        total: count,
        totalPages: Math.ceil(count / pageSizeNumber),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const product = await Product.findOne({ where: { id: req.params.id, tenant_id: tenantId } });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
}

export async function getProductByBarcode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const product = await Product.findOne({
      where: { barcode: req.params.barcode, tenant_id: tenantId, is_active: true },
    });

    if (!product) {
      throw new AppError('Produto não encontrado para este código de barras', 404);
    }

    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const { barcode, name, price, cost_price, stock_quantity, min_stock_alert, tax_rate, category } =
      req.body;

    if (!name || price === undefined) {
      throw new AppError('Campos obrigatórios em falta: name, price', 422);
    }

    if (barcode) {
      const existing = await Product.findOne({ where: { tenant_id: tenantId, barcode } });
      if (existing) {
        throw new AppError('Já existe um produto com este código de barras', 409);
      }
    }

    const product = await Product.create({
      tenant_id: tenantId,
      barcode: barcode ?? null,
      name,
      price,
      cost_price: cost_price ?? 0,
      stock_quantity: stock_quantity ?? 0,
      min_stock_alert: min_stock_alert ?? 5,
      tax_rate: tax_rate ?? 0.16,
      category: category ?? null,
    });

    sendSuccess(res, product, 'Produto criado com sucesso', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const product = await Product.findOne({ where: { id: req.params.id, tenant_id: tenantId } });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    const {
      barcode,
      name,
      price,
      cost_price,
      stock_quantity,
      min_stock_alert,
      tax_rate,
      category,
      is_active,
    } = req.body;

    if (barcode && barcode !== product.barcode) {
      const existing = await Product.findOne({
        where: { tenant_id: tenantId, barcode, id: { [Op.ne]: product.id } },
      });
      if (existing) {
        throw new AppError('Já existe um produto com este código de barras', 409);
      }
    }

    await product.update({
      barcode: barcode ?? product.barcode,
      name: name ?? product.name,
      price: price ?? product.price,
      cost_price: cost_price ?? product.cost_price,
      stock_quantity: stock_quantity ?? product.stock_quantity,
      min_stock_alert: min_stock_alert ?? product.min_stock_alert,
      tax_rate: tax_rate ?? product.tax_rate,
      category: category ?? product.category,
      is_active: is_active ?? product.is_active,
    });

    sendSuccess(res, product, 'Produto atualizado com sucesso');
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const product = await Product.findOne({ where: { id: req.params.id, tenant_id: tenantId } });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Soft delete: preserva o histórico de vendas associado a este produto.
    await product.update({ is_active: false });

    sendSuccess(res, null, 'Produto removido com sucesso');
  } catch (error) {
    next(error);
  }
}
