import { afterAll, beforeEach } from 'vitest';
import { sequelize } from '../src/models';

// Cada teste começa com a base de dados de teste vazia — mais simples e mais
// previsível do que tentar fazer rollback de transações aninhadas (os
// próprios serviços já abrem as suas próprias transações, ex.: createSale).
beforeEach(async () => {
  await sequelize.query(
    'TRUNCATE TABLE sale_items, sales, products, users, tenants RESTART IDENTITY CASCADE;',
  );
});

afterAll(async () => {
  await sequelize.close();
});
