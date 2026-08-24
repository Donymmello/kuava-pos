import { NextFunction, Request, Response } from 'express';
import { Sale, SaleItem, Product, User } from '../models';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';
import { cancelSale, createSale } from '../services/saleService';
import { MobileMoneyFlow, PaymentMethod } from '../types/enums';

export async function registerSale(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const userId = req.user?.id as string;
    const { payment_method, items, client_ref, mobile_money_flow, payment_reference, agent_margin_amount } =
      req.body;

    if (!payment_method || !Array.isArray(items) || items.length === 0) {
      throw new AppError('Campos obrigatórios em falta: payment_method, items[]', 422);
    }

    const agentMarginAmount =
      typeof agent_margin_amount === 'number'
        ? agent_margin_amount
        : typeof agent_margin_amount === 'string' && agent_margin_amount.trim() !== ''
          ? Number(agent_margin_amount)
          : undefined;

    const sale = await createSale({
      tenantId,
      userId,
      paymentMethod: payment_method as PaymentMethod,
      items: items.map((item: { product_id: string; quantity: number }) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
      })),
      clientRef: typeof client_ref === 'string' && client_ref.trim() ? client_ref.trim() : undefined,
      mobileMoneyFlow:
        typeof mobile_money_flow === 'string' && mobile_money_flow.trim()
          ? (mobile_money_flow as MobileMoneyFlow)
          : undefined,
      paymentReference:
        typeof payment_reference === 'string' && payment_reference.trim() ? payment_reference.trim() : undefined,
      agentMarginAmount,
    });

    sendSuccess(res, sale, 'Venda registada com sucesso', 201);
  } catch (error) {
    next(error);
  }
}

export async function listSales(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const { page = '1', pageSize = '50' } = req.query as Record<string, string | undefined>;

    const pageNumber = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const pageSizeNumber = Math.min(Math.max(parseInt(pageSize ?? '50', 10) || 50, 1), 200);

    const { rows, count } = await Sale.findAndCountAll({
      where: { tenant_id: tenantId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }] },
      ],
      order: [['created_at', 'DESC']],
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

export async function getSaleById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const sale = await Sale.findOne({
      where: { id: req.params.id, tenant_id: tenantId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }] },
      ],
    });

    if (!sale) {
      throw new AppError('Venda não encontrada', 404);
    }

    sendSuccess(res, sale);
  } catch (error) {
    next(error);
  }
}

export async function cancelSaleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const sale = await cancelSale(tenantId, req.params.id);
    sendSuccess(res, sale, 'Venda cancelada e stock reposto com sucesso');
  } catch (error) {
    next(error);
  }
}
