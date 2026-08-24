'use strict';

// Configuração para o sequelize-cli (migrações/seeders). É um ficheiro
// separado do `database.ts` porque o CLI corre fora do TypeScript/tsx — não
// consegue importar `env.ts` diretamente — mas usa exatamente as mesmas
// variáveis de ambiente, para nunca haver duas fontes de verdade sobre a
// ligação à base de dados.
require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  dialect: 'postgres',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
};

module.exports = {
  development: {
    ...base,
    database: process.env.DB_NAME || 'kuava_pos',
  },
  // Base de dados isolada para os testes automatizados (roadmap item 7) —
  // nunca a mesma que o `development`, para os testes poderem apagar/recriar
  // dados livremente sem arriscar o que está a ser usado à mão.
  test: {
    ...base,
    database: process.env.DB_NAME_TEST || `${process.env.DB_NAME || 'kuava_pos'}_test`,
  },
  production: {
    ...base,
    database: process.env.DB_NAME || 'kuava_pos',
    // Ajusta aqui se a base de produção precisar de SSL (ex.: RDS/Heroku):
    // dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  },
};
