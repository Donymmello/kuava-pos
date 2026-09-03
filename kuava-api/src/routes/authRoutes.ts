import { Router } from 'express';
import { env } from '../config/env';
import { loginHandler, register } from '../controllers/authController';
import { loginRateLimiter, registerRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Em testes de integração (ver tests/helpers.ts) o registo e o login reais
// são chamados dezenas de vezes por ficheiro de teste — o rate limiting em
// si já é verificado isoladamente em tests/rateLimiter.test.ts, por isso
// não se aplica aqui em ambiente de teste, para não tornar a suite
// principal frágil. Fora de "test" aplica-se sempre, incluindo em dev.
if (env.nodeEnv === 'test') {
  router.post('/register', register);
  router.post('/login', loginHandler);
} else {
  router.post('/register', registerRateLimiter, register);
  router.post('/login', loginRateLimiter, loginHandler);
}

export default router;
