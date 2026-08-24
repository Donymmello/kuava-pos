'use strict';

// Migração de baseline: recria exatamente o esquema que já existia na base
// de dados de desenvolvimento (construído até aqui via `sequelize.sync({
// alter: true })`). A partir desta migração, o esquema passa a ser
// controlado só por ficheiros de migração — o `sync` deixa de correr.
//
// Numa base de dados que já tenha estas tabelas (qualquer ambiente que já
// corria a app antes desta migração existir), esta migração NÃO deve ser
// executada a sério — em vez disso marca-se como já aplicada, inserindo o
// nome do ficheiro na tabela `SequelizeMeta`. Ver README/instruções de
// migração para o comando exato.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tenants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      nuit: { type: Sequelize.STRING(20), allowNull: false, unique: 'tenants_nuit_key' },
      address: { type: Sequelize.STRING(255), allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      email: { type: Sequelize.STRING(150), allowNull: true },
      default_tax_rate: { type: Sequelize.DECIMAL(5, 4), allowNull: false, defaultValue: 0.16 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('users', {
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
      name: { type: Sequelize.STRING(150), allowNull: false },
      email: { type: Sequelize.STRING(150), allowNull: false },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      role: {
        type: Sequelize.ENUM('ADMIN', 'CASHIER', 'MANAGER'),
        allowNull: false,
        defaultValue: 'CASHIER',
      },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Único em toda a aplicação, não só por estabelecimento — ver o
    // comentário em src/models/User.ts sobre o porquê (o login não pede para
    // escolher o estabelecimento, só email+senha).
    await queryInterface.addIndex('users', ['email'], {
      unique: true,
      name: 'users_email_unique',
    });

    await queryInterface.createTable('products', {
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
      barcode: { type: Sequelize.STRING(64), allowNull: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      cost_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      stock_quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      min_stock_alert: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
      tax_rate: { type: Sequelize.DECIMAL(5, 4), allowNull: false, defaultValue: 0.16 },
      category: { type: Sequelize.STRING(100), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('products', ['tenant_id', 'barcode'], {
      unique: true,
      name: 'products_tenant_id_barcode_unique',
      where: { barcode: { [Sequelize.Op.ne]: null } },
    });

    await queryInterface.createTable('sales', {
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
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      total_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      tax_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      payment_method: {
        type: Sequelize.ENUM('CASH', 'MPESA', 'EMOLA', 'CARD'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('COMPLETED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'COMPLETED',
      },
      // Chave de idempotência opcional (vendas offline sincronizadas depois)
      // — ver services/saleService.ts.
      client_ref: { type: Sequelize.STRING(64), allowNull: true },
      // M-Pesa/e-Mola: confirmação sempre manual, sem API C2B — ver
      // src/types/enums.ts e o comentário em src/models/Sale.ts.
      mobile_money_flow: {
        type: Sequelize.ENUM('TRANSFER', 'AGENT'),
        allowNull: true,
      },
      payment_reference: { type: Sequelize.STRING(64), allowNull: true },
      agent_margin_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('sales', ['tenant_id'], { name: 'sales_tenant_id' });
    await queryInterface.addIndex('sales', ['tenant_id', 'created_at'], {
      name: 'sales_tenant_id_created_at',
    });
    await queryInterface.addIndex('sales', ['tenant_id', 'client_ref'], {
      unique: true,
      name: 'sales_tenant_id_client_ref_unique',
      where: { client_ref: { [Sequelize.Op.ne]: null } },
    });

    await queryInterface.createTable('sale_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      sale_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'sales', key: 'id' },
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
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      subtotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('sale_items', ['sale_id'], { name: 'sale_items_sale_id' });
    await queryInterface.addIndex('sale_items', ['product_id'], { name: 'sale_items_product_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sale_items');
    await queryInterface.dropTable('sales');
    await queryInterface.dropTable('products');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('tenants');

    // dropTable não apaga os tipos ENUM do Postgres por si só.
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_mobile_money_flow";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_payment_method";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
  },
};
