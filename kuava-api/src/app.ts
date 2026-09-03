import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import routes from './routes';
import { sendSuccess } from './utils/apiResponse';

export function createApp(): Application {
  const app = express();

  // Em produção a API corre atrás de um único reverse proxy (Nginx — ver
  // deploy/). Sem isto, req.ip seria sempre o IP do Nginx e o rate limiting
  // (loginRateLimiter/registerRateLimiter) trataria todos os clientes como
  // se fossem um só. "1" = confia apenas no primeiro hop do
  // X-Forwarded-For, nunca na cadeia toda.
  if (env.nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Log estruturado de cada pedido (método, rota, status, duração). Nunca
  // regista o header Authorization (contém o JWT) nem o corpo do pedido
  // (poderia conter a password em /auth/login ou /auth/register) — só
  // metadados do pedido/resposta. Ignora /health, que pode ser sondado a
  // cada poucos segundos por um monitor externo (ver deploy/README.md) e só
  // acrescentaria ruído.
  app.use(
    pinoHttp({
      logger,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
    }),
  );

  app.get('/health', (_req, res) => {
    sendSuccess(res, { status: 'ok', environment: env.nodeEnv }, 'Kuava API operacional');
  });

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
