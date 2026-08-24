import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

/**
 * Extrai o tenant_id do utilizador autenticado (populado pelo authMiddleware
 * a partir do payload do JWT) e injeta-o em req.tenantId, garantindo que
 * todas as operações subsequentes na base de dados fiquem isoladas por
 * estabelecimento comercial (multi-tenant).
 *
 * Deve ser sempre utilizado DEPOIS do authMiddleware na cadeia de rotas.
 */
export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.tenantId) {
    // 403, não 401: o token é válido (o utilizador está autenticado), só não
    // tem acesso a rotas de tenant — é o caso normal de um SUPERADMIN, que
    // nunca tem tenant_id. Um 401 aqui fazia o interceptor global do
    // frontend (kuava-web/src/services/api.ts) tratar isto como "sessão
    // expirada" e terminar a sessão de QUALQUER utilizador, incluindo um
    // superadmin com sessão perfeitamente válida — foi a causa do bug
    // "superadmin entra e sai logo" (2026-08-24).
    throw new AppError('Não foi possível identificar o estabelecimento (tenant) do utilizador', 403);
  }

  req.tenantId = req.user.tenantId;
  next();
}
