'use strict';

// Tabela nova (2026-09-09): um pedido de assinatura criado quando um ADMIN
// escolhe um plano na página de assinatura. Ver src/models/SubscriptionRequest.ts.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subscription_requests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      plan: {
        type: Sequelize.ENUM('MONTHLY', 'ANNUAL'),
        allowNull: false,
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      reference: { type: Sequelize.STRING(20), allowNull: false, unique: 'subscription_requests_reference_key' },
      status: {
        type: Sequelize.ENUM('PENDING', 'CONFIRMED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      confirmed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('subscription_requests', ['tenant_id', 'status'], {
      name: 'subscription_requests_tenant_id_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('subscription_requests');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_subscription_requests_plan";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_subscription_requests_status";');
  },
};
