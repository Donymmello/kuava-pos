'use strict';

// Tabela nova (2026-09-10): regista de qual lote (product_lots) cada item
// de venda tirou stock, e quanto tirou de cada um. Sem isto, cancelar uma
// venda de um produto com vários lotes não saberia a qual lote devolver a
// quantidade. Ver src/models/SaleItemLot.ts e
// src/services/productLotService.ts.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sale_item_lots', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      sale_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'sale_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      product_lot_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'product_lots', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      quantity: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('sale_item_lots', ['sale_item_id'], {
      name: 'sale_item_lots_sale_item_id',
    });
    await queryInterface.addIndex('sale_item_lots', ['product_lot_id'], {
      name: 'sale_item_lots_product_lot_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sale_item_lots');
  },
};
