import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import './models';

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();
    console.log('[DB] Ligação à base de dados estabelecida com sucesso.');

    // O esquema já não é gerido por `sequelize.sync()` — passou a ser
    // controlado por ficheiros de migração em migrations/ (sequelize-cli),
    // para nenhuma alteração de coluna/índice se perder silenciosamente como
    // acontecia com `sync({ alter: true })`. Corre `npm run migrate` antes
    // de arrancar o servidor sempre que houver migrações novas por aplicar.
    const app = createApp();

    app.listen(env.port, () => {
      console.log(`[SERVER] Kuava API a correr na porta ${env.port} (${env.nodeEnv})`);
    });
  } catch (error) {
    console.error('[SERVER] Falha ao iniciar a aplicação:', error);
    process.exit(1);
  }
}

bootstrap();
