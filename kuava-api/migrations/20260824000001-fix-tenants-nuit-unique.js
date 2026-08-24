'use strict';

// Corrige um bug encontrado ao verificar a migração anterior: o
// `unique: 'tenants_nuit_key'` na coluna `nuit` dentro do createTable() da
// migração de baseline não chega a criar a constraint no Postgres (testado
// numa base de dados nova de raiz — dois tenants conseguiam ter o mesmo
// NUIT sem erro nenhum). Esta migração cria a constraint a sério, de forma
// idempotente: só a cria se ainda não existir com este nome (bases de dados
// de desenvolvimento antigas já podem tê-la, resultado da limpeza manual
// dos 7 duplicados de `sync({ alter: true })` — ver notas do projeto).
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $do$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'tenants_nuit_key'
        ) THEN
          ALTER TABLE "tenants" ADD CONSTRAINT "tenants_nuit_key" UNIQUE ("nuit");
        END IF;
      END
      $do$;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "tenants_nuit_key";`);
  },
};
