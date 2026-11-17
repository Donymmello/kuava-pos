import { NextFunction, Request, Response } from 'express';
import * as productService from '../services/productService';
import { sendSuccess } from '../utils/apiResponse';

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const {
      search,
      category,
      activeOnly,
      status,
      stockStatus,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      page = '1',
      pageSize = '50',
    } = req.query as Record<string, string | undefined>;

    const pageNumber = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const pageSizeNumber = Math.min(Math.max(parseInt(pageSize ?? '50', 10) || 50, 1), 1000);

    const result = await productService.listProducts({
      tenantId,
      search,
      category,
      activeOnly,
      status: status as 'all' | 'active' | 'inactive' | undefined,
      stockStatus: stockStatus as 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | undefined,
      startDate,
      endDate,
      sortBy: sortBy as 'name' | 'created_at' | 'price' | 'stock_quantity' | 'expiry_date' | undefined,
      sortOrder: sortOrder as 'ASC' | 'DESC' | undefined,
      page: pageNumber,
      pageSize: pageSizeNumber,
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const categories = await productService.listCategories(tenantId);
    sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const product = await productService.getProductById(tenantId, req.params.id);
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
    const product = await productService.getProductByBarcode(tenantId, req.params.barcode);
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const {
      barcode,
      name,
      price,
      cost_price,
      stock_quantity,
      min_stock_alert,
      tax_rate,
      category,
      unit,
      expiry_date,
      tracks_batches,
    } = req.body;

    const result = await productService.createProduct({
      tenantId,
      barcode,
      name,
      price,
      cost_price,
      stock_quantity,
      min_stock_alert,
      tax_rate,
      category,
      unit,
      expiry_date,
      tracks_batches,
    });

    const message = result.wasMerged
      ? `Produto "${result.product.name}" já existia no sistema. O stock foi somado (+${result.addedStock} ${result.product.unit}), ficando com ${result.product.stock_quantity} ${result.product.unit}, sem duplicar o produto.`
      : 'Produto criado com sucesso';

    sendSuccess(res, result.product, message, result.wasMerged ? 200 : 201);
  } catch (error) {
    next(error);
  }
}

export async function addProductStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const { quantity, cost_price, expiry_date } = req.body;

    const product = await productService.addStock({
      tenantId,
      id: req.params.id,
      quantity: Number(quantity),
      costPrice: cost_price !== undefined ? Number(cost_price) : undefined,
      expiryDate: expiry_date || undefined,
    });

    sendSuccess(
      res,
      product,
      `Entrada de stock (+${quantity} ${product.unit}) registada com sucesso. Novo stock: ${product.stock_quantity} ${product.unit}.`,
    );
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const {
      barcode,
      name,
      price,
      cost_price,
      stock_quantity,
      min_stock_alert,
      tax_rate,
      category,
      unit,
      expiry_date,
      is_active,
      tracks_batches,
    } = req.body;

    const product = await productService.updateProduct({
      tenantId,
      id: req.params.id,
      barcode,
      name,
      price,
      cost_price,
      stock_quantity,
      min_stock_alert,
      tax_rate,
      category,
      unit,
      expiry_date,
      is_active,
      tracks_batches,
    });

    sendSuccess(res, product, 'Produto atualizado com sucesso');
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    await productService.deleteProduct(tenantId, req.params.id);
    sendSuccess(res, null, 'Produto removido com sucesso');
  } catch (error) {
    next(error);
  }
}
