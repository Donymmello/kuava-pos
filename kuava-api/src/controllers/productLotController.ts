import { NextFunction, Request, Response } from 'express';
import * as productLotService from '../services/productLotService';
import { sendSuccess } from '../utils/apiResponse';

export async function listProductLots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const lots = await productLotService.listLots(tenantId, req.params.id);
    sendSuccess(res, lots);
  } catch (error) {
    next(error);
  }
}

export async function createProductLot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const { quantity, expiry_date } = req.body;

    const lot = await productLotService.createLot({
      tenantId,
      productId: req.params.id,
      quantity,
      expiryDate: expiry_date ?? null,
    });

    sendSuccess(res, lot, 'Lote registado com sucesso', 201);
  } catch (error) {
    next(error);
  }
}

export async function deleteProductLot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    await productLotService.deleteLot(tenantId, req.params.id, req.params.lotId);
    sendSuccess(res, null, 'Lote removido com sucesso');
  } catch (error) {
    next(error);
  }
}
