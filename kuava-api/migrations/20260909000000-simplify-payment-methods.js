'use strict';

// Decisão de 2026-09-09: o Kuava deixa de distinguir M-Pesa/e-Mola, e o
// conceito de "loja como agente a reter margem" deixa de existir. Motivo:
// o Paga Fácil (M-Pesa) e o equivalente da e-Mola já resolvem "receber por
// transferência" de graça e sem nenhuma integração possível do lado do
// Kuava (o dinheiro cai direto na conta do comerciante); qual operadora ou
// mecanismo o comerciante usa é escolha dele, não algo que o Kuava precise
// de rastrear. MPESA e EMOLA fundem-se num único TRANSFER genérico, que
// mantém `payment_reference` como campo de referência livre e opcional.
// `mobile_money_flow`/`agent_margin_amount` deixam de ter sentido e são
// removidos.
//
// Nota sobre o `down`: ao reverter, não há como saber se um TRANSFER
// específico era originalmente MPESA ou EMOLA (essa distinção já foi
// perdida), por isso volta sempre como MPESA — é uma reversão com perda de
// informação, aceitável só para desfazer a migração em desenvolvimento,
// nunca pensada para reverter dados reais de produção.
module.exports = {
  async up(queryInterface) {
    // Recriar o tipo ENUM de `payment_method` sem poder usar ALTER TYPE ...
    // ADD VALUE seguido de uso na mesma transação (o Postgres não permite
    // usar um valor de ENUM recém-adicionado antes de fazer commit) — por
    // isso cria-se um tipo novo já com o conjunto final de valores, migra-se
    // a coluna para ele, e o tipo antigo é descartado.
    await queryInterface.sequelize.query(
      `CREATE TYPE "enum_sales_payment_method_new" AS ENUM ('CASH', 'CARD', 'TRANSFER');`,
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "sales" ADD COLUMN "payment_method_new" "enum_sales_payment_method_new";`,
    );
    await queryInterface.sequelize.query(`
      UPDATE "sales" SET "payment_method_new" = CASE
        WHEN "payment_method"::text IN ('MPESA', 'EMOLA') THEN 'TRANSFER'::"enum_sales_payment_method_new"
        ELSE "payment_method"::text::"enum_sales_payment_method_new"
      END;
    `);
    await queryInterface.sequelize.query(`ALTER TABLE "sales" ALTER COLUMN "payment_method_new" SET NOT NULL;`);
    await queryInterface.sequelize.query(`ALTER TABLE "sales" DROP COLUMN "payment_method";`);
    await queryInterface.sequelize.query(
      `ALTER TABLE "sales" RENAME COLUMN "payment_method_new" TO "payment_method";`,
    );
    await queryInterface.sequelize.query(`DROP TYPE "enum_sales_payment_method";`);
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_sales_payment_method_new" RENAME TO "enum_sales_payment_method";`,
    );

    await queryInterface.removeColumn('sales', 'mobile_money_flow');
    await queryInterface.removeColumn('sales', 'agent_margin_amount');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_mobile_money_flow";');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('sales', 'agent_margin_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('sales', 'mobile_money_flow', {
      type: Sequelize.ENUM('TRANSFER', 'AGENT'),
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      `CREATE TYPE "enum_sales_payment_method_old" AS ENUM ('CASH', 'MPESA', 'EMOLA', 'CARD');`,
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "sales" ADD COLUMN "payment_method_old" "enum_sales_payment_method_old";`,
    );
    // Ver nota no topo do ficheiro: um TRANSFER revertido não tem como saber
    // se era MPESA ou EMOLA, assume-se sempre MPESA.
    await queryInterface.sequelize.query(`
      UPDATE "sales" SET "payment_method_old" = CASE
        WHEN "payment_method"::text = 'TRANSFER' THEN 'MPESA'::"enum_sales_payment_method_old"
        ELSE "payment_method"::text::"enum_sales_payment_method_old"
      END;
    `);
    await queryInterface.sequelize.query(`ALTER TABLE "sales" ALTER COLUMN "payment_method_old" SET NOT NULL;`);
    await queryInterface.sequelize.query(`ALTER TABLE "sales" DROP COLUMN "payment_method";`);
    await queryInterface.sequelize.query(
      `ALTER TABLE "sales" RENAME COLUMN "payment_method_old" TO "payment_method";`,
    );
    await queryInterface.sequelize.query(`DROP TYPE "enum_sales_payment_method";`);
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_sales_payment_method_old" RENAME TO "enum_sales_payment_method";`,
    );
  },
};
