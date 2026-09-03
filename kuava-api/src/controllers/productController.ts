import { NextFunction, Request, Response } from 'express';
import * as productService from '../services/productService';
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

    const result = await productService.listProducts({
      tenantId,
      search,
      category,
      activeOnly,
      page: pageNumber,
      pageSize: pageSizeNumber,
    });

    sendSuccess(res, result);
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
    const { barcode, name, price, cost_price, stock_quantity, min_stock_alert, tax_rate, category } =
      req.body;

    const product = await productService.createProduct({
      tenantId,
      barcode,
      name,
      price,
      cost_price,
      stock_quantity,
      min_stock_alert,
      tax_rate,
      category,
    });

    sendSuccess(res, product, 'Produto criado com sucesso', 201);
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
      is_active,
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
      is_active,
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
