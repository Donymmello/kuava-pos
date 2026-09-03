import pino from 'pino';
import { env } from './env';

/**
 * Logger estruturado central da app. Em desenvolvimento imprime em formato
 * legível a cores (pino-pretty, só devDependency — nunca corre na imagem de
 * produção, onde NODE_ENV=production desliga este transport); em produção
 * escreve JSON linha-a-linha em stdout, o formato normal para qualquer
 * ferramenta de agregação de logs (Docker, Grafana Loki, etc.) consumir.
 */
export const logger = pino({
  // Em teste (vitest, ver tests/), silenciado — os 29 casos fazem dezenas de
  // pedidos HTTP reais contra o app (ver tests/helpers.ts), e um log por
  // pedido só tornaria a saída dos testes difícil de ler sem acrescentar
  // nada — os próprios testes já verificam o comportamento.
  level: env.nodeEnv === 'test' ? 'silent' : env.nodeEnv === 'production' ? 'info' : 'debug',
  transport:
    env.nodeEnv === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
});
