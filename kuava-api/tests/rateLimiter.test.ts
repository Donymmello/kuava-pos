import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { loginRateLimiter, registerRateLimiter } from '../src/middlewares/rateLimiter';

// Testado isoladamente com um app Express descartável (sem base de dados) em
// vez de através do app real — o app real desliga este middleware em
// NODE_ENV=test propositadamente, porque tests/helpers.ts chama
// /api/auth/register e /api/auth/login dezenas de vezes por ficheiro de
// teste (ver authRoutes.ts). Aqui testamos o middleware em si, a sério, via
// pedidos HTTP reais (supertest), não mockado.
function buildTestApp(limiter: express.RequestHandler) {
  const app = express();
  app.get('/limited', limiter, (_req, res) => res.status(200).json({ ok: true }));
  return request(app);
}

describe('rate limiting', () => {
  it('deixa passar até ao limite de tentativas de login e bloqueia com 429 a seguir', async () => {
    const api = buildTestApp(loginRateLimiter);

    for (let i = 0; i < 10; i += 1) {
      const res = await api.get('/limited');
      expect(res.status).toBe(200);
    }

    const blocked = await api.get('/limited');
    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.message).toMatch(/demasiadas tentativas/i);
  });

  it('deixa passar até ao limite de registos e bloqueia com 429 a seguir', async () => {
    const api = buildTestApp(registerRateLimiter);

    for (let i = 0; i < 5; i += 1) {
      const res = await api.get('/limited');
      expect(res.status).toBe(200);
    }

    const blocked = await api.get('/limited');
    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
  });
});
