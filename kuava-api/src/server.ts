import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';
import './models';

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();
    logger.info('Ligação à base de dados estabelecida com sucesso.');

    // O esquema já não é gerido por `sequelize.sync()` — passou a ser
    // controlado por ficheiros de migração em migrations/ (sequelize-cli),
    // para nenhuma alteração de coluna/índice se perder silenciosamente como
    // acontecia com `sync({ alter: true })`. Corre `npm run migrate` antes
    // de arrancar o servidor sempre que houver migrações novas por aplicar.
    const app = createApp();

    app.listen(env.port, () => {
      logger.info(`Kuava API a correr na porta ${env.port} (${env.nodeEnv})`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Falha ao iniciar a aplicação');
    process.exit(1);
  }
}

bootstrap();
