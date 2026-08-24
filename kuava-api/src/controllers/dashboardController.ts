import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { getDashboardSummary } from '../services/dashboardService';

export async function getDashboardSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const summary = await getDashboardSummary(tenantId);
    sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
}
