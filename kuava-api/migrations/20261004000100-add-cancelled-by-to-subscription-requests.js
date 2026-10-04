'use strict';

// Colunas novas (2026-10-04): quem cancelou um pedido de assinatura, e
// porquê. Espelho do confirmed_by, com uma diferença que obriga às duas
// colunas: há dois caminhos que cancelam.
//
//   SUPERADMIN  um humano carregou em cancelar no painel; cancelled_by diz quem
//   REPLACED    o cliente gerou um pedido novo e o sistema descartou o
//               anterior sozinho (ver subscriptionService.createSubscriptionRequest);
//               não há autor, e cancelled_by fica a null legitimamente
//
// Sem a razão, um cancelled_by a null seria ambíguo entre "foi automático" e
// "alguém cancelou e não ficou registado" — pior do que não ter coluna
// nenhuma, porque daria ilusão de auditoria.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('subscription_requests', 'cancelled_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      // Apagar um utilizador nunca pode apagar o histórico do pedido.
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('subscription_requests', 'cancelled_reason', {
      type: Sequelize.ENUM('SUPERADMIN', 'REPLACED'),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subscription_requests', 'cancelled_by');
    await queryInterface.removeColumn('subscription_requests', 'cancelled_reason');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_subscription_requests_cancelled_reason";',
    );
  },
};
