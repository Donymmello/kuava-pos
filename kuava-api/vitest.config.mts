import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

dotenv.config();

// Base de dados isolada para os testes — nunca a de desenvolvimento, para os
// testes poderem truncar tabelas livremente entre cada caso sem arriscar
// dados a que se esteja a olhar à mão. Mesma variável que o
// src/config/sequelize-cli.config.js usa para o ambiente `test`.
const testDatabaseName = process.env.DB_NAME_TEST || `${process.env.DB_NAME || 'kuava_pos'}_test`;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
    // Os testes de integração partilham uma única base de dados de teste
    // (truncada entre casos) — correr ficheiros de teste em paralelo
    // causaria corridas entre eles.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DB_NAME: testDatabaseName,
    },
  },
});
