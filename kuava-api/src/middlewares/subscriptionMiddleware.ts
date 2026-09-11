import { NextFunction, Request, Response } from 'express';
import { Tenant } from '../models';
import { hasActiveAccess } from '../services/subscriptionService';
import { AppError } from '../utils/AppError';

/**
 * Bloqueia as rotas de negócio (produtos, vendas, painel, utilizadores)
 * quando o tenant não tem acesso ativo (trial expirado e sem subscrição
 * paga em vigor), decisão de 2026-09-09: o login em si NUNCA mais bloqueia
 * (ver authService.login()), o utilizador entra sempre e o frontend mostra
 * a página de assinatura; isto aqui é a aplicação real do lado do
 * servidor, para que chamar a API diretamente sem passar pelo frontend não
 * contorne o bloqueio. 402 (Payment Required) em vez de 403, para o
 * frontend conseguir distinguir "sem permissão" de "sem assinatura" se um
 * dia precisar.
 *
 * Deve ser sempre utilizado DEPOIS do tenantMiddleware. As rotas de
 * /tenants e /subscription ficam de fora de propósito, o ADMIN precisa de
 * as conseguir usar mesmo bloqueado, para escolher um plano e pagar.
 */
export async function requireActiveSubscription(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const tenant = await Tenant.findByPk(req.tenantId as string);

    if (!tenant) {
      throw new AppError('Estabelecimento não encontrado', 404);
    }

    if (!hasActiveAccess(tenant)) {
      throw new AppError(
        'Este estabelecimento não tem uma assinatura ativa. Escolha um plano para continuar.',
        402,
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}
