'use strict';

// Coluna nova (2026-09-10): controle por lotes, opcional por produto. Ver
// src/models/Product.ts. `false` por omissão, nada muda para quem já
// existe até ser ativado manualmente num produto.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'tracks_batches', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('products', 'tracks_batches');
  },
};
