import { NextFunction, Request, Response } from 'express';
import { ValidationError } from 'sequelize';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/apiResponse';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errors);
    return;
  }

  if (err instanceof ValidationError) {
    sendError(
      res,
      'Erro de validação',
      422,
      err.errors.map((item) => ({ field: item.path, message: item.message })),
    );
    return;
  }

  console.error('[UNHANDLED_ERROR]', err);
  sendError(res, 'Erro interno do servidor', 500);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Rota não encontrada: ${req.method} ${req.originalUrl}`, 404);
}
