import { NextFunction, Request, Response } from 'express';
import { ValidationError } from 'sequelize';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/apiResponse';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
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

  // req.log (pino-http) inclui o id do pedido — permite encontrar todos os
  // logs de um pedido específico que rebentou, não só esta linha isolada.
  // Cai para o logger simples se, por algum motivo, pino-http não tiver
  // corrido antes disto (ex.: um teste a chamar isto diretamente).
  (req.log ?? logger).error({ err }, 'Erro não tratado');
  sendError(res, 'Erro interno do servidor', 500);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Rota não encontrada: ${req.method} ${req.originalUrl}`, 404);
}
