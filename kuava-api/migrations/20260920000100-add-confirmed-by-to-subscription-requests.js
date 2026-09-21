'use strict';

// Coluna nova (2026-09-20): qual o SUPERADMIN que confirmou o pagamento,
// a par do confirmed_at que já existia. Confirmar um pedido é o único
// ponto da app que move dinheiro, e até aqui não ficava registo de quem o
// fez — com mais do que uma pessoa com acesso ao painel, uma confirmação
// indevida era indistinguível de uma legítima.
//
// ON DELETE SET NULL de propósito: apagar um utilizador nunca pode apagar
// o histórico de um pagamento, perde-se só o nome de quem confirmou.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('subscription_requests', 'confirmed_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subscription_requests', 'confirmed_by');
  },
};
