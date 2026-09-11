'use strict';

// Tabela nova (2026-09-10): um lote de stock de um produto com
// tracks_batches = true. Ver src/models/ProductLot.ts.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_lots', {
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
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      quantity: { type: Sequelize.DECIMAL(12, 3), allowNull: false, defaultValue: 0 },
      expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('product_lots', ['product_id', 'expiry_date'], {
      name: 'product_lots_product_id_expiry_date',
    });
    await queryInterface.addIndex('product_lots', ['tenant_id'], {
      name: 'product_lots_tenant_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_lots');
  },
};
