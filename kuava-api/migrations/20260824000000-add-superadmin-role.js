'use strict';

// Acrescenta o papel SUPERADMIN (a conta do dono da plataforma, para gerir
// os tenants/clientes) e torna users.tenant_id opcional — só SUPERADMIN não
// pertence a nenhum estabelecimento.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'SUPERADMIN';`,
    );

    // SQL direto em vez de queryInterface.changeColumn(): o changeColumn do
    // Sequelize para Postgres, ao repetir `references`, cria uma SEGUNDA
    // constraint de foreign key em vez de reaproveitar a existente
    // (confirmado ao correr esta migração) — o mesmo tipo de acumulação de
    // cruft que já aconteceu antes com `sync({ alter: true })`. Isto muda só
    // a obrigatoriedade da coluna, sem tocar na FK.
    await queryInterface.sequelize.query(`ALTER TABLE "users" ALTER COLUMN "tenant_id" DROP NOT NULL;`);
  },

  async down(queryInterface) {
    // O Postgres não suporta remover um valor de um tipo ENUM diretamente
    // (só recriando o tipo, o que exigiria mover todas as tabelas/colunas
    // que o usam). Por segurança, o down() não tenta desfazer o
    // ALTER TYPE — só reverte tenant_id para obrigatório, o que falha (como
    // esperado) se ainda existir algum utilizador SUPERADMIN com
    // tenant_id null.
    await queryInterface.sequelize.query(`ALTER TABLE "users" ALTER COLUMN "tenant_id" SET NOT NULL;`);
  },
};
