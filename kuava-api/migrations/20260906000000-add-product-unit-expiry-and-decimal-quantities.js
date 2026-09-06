'use strict';

// Resolve duas fraquezas reais identificadas para negócios fora do perfil
// "vende por unidade inteira":
//
// 1. Ferragens (e semelhantes) vendem muitas vezes por peso/comprimento
//    (arame por metro, prego por kg, tinta por litro) — precisam de
//    quantidades fracionárias, que `INTEGER` não permite.
// 2. Farmácias precisam de saber quando um produto se aproxima da validade —
//    não existia nenhum campo de data de validade no catálogo.
//
// stock_quantity/min_stock_alert (products) e quantity (sale_items) passam
// de INTEGER para DECIMAL(12,3) — 3 casas decimais chega para kg/litro/metro
// no varejo (ex.: 2.350 kg) sem introduzir erros de vírgula flutuante.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'unit', {
      type: Sequelize.ENUM('UN', 'KG', 'G', 'L', 'M'),
      allowNull: false,
      defaultValue: 'UN',
    });

    await queryInterface.addColumn('products', 'expiry_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.changeColumn('products', 'stock_quantity', {
      type: Sequelize.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.changeColumn('products', 'min_stock_alert', {
      type: Sequelize.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 5,
    });

    await queryInterface.changeColumn('sale_items', 'quantity', {
      type: Sequelize.DECIMAL(12, 3),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('sale_items', 'quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.changeColumn('products', 'min_stock_alert', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 5,
    });

    await queryInterface.changeColumn('products', 'stock_quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.removeColumn('products', 'expiry_date');
    await queryInterface.removeColumn('products', 'unit');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_products_unit";');
  },
};
