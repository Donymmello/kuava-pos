import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse';

function tooManyRequestsHandler(_req: Request, res: Response): void {
  sendError(res, 'Demasiadas tentativas. Aguarda alguns minutos antes de tentar novamente.', 429);
}

/**
 * Limite de tentativas de login por IP — mitiga ataques de força bruta a
 * senhas. 10 tentativas em 15 minutos é folgado para um utilizador real
 * (que na pior das hipóteses erra a senha uma ou duas vezes), mas
 * incomodativo para um script a tentar adivinhar credenciais.
 *
 * Não inclui lógica de "skip" para testes aqui de propósito — este
 * middleware é uma unidade pura e testável (ver tests/rateLimiter.test.ts).
 * Quem decide SE se aplica em cada ambiente é o router (ver authRoutes.ts).
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler,
});

/**
 * Limite de registos de novos estabelecimentos por IP — mitiga spam de
 * tenants (cada registo cria uma conta com 7 dias de trial, ver
 * authService.ts).
 */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler,
});
