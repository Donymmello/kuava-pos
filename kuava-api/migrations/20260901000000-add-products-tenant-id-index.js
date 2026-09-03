module.exports = {
  async up(queryInterface) {
    // A `products` só tinha um índice único parcial em (tenant_id, barcode)
    // — a consulta mais comum do sistema (abrir o inventário ou o POS, sem
    // pesquisa nem filtro de categoria: `WHERE tenant_id = ? AND is_active
    // = true`, ver productController.listProducts) não tinha nenhum índice
    // a servi-la, obrigando a um table scan sequencial à tabela inteira
    // (todos os tenants juntos) sempre que qualquer utilizador a abre.
    // Invisível com poucos produtos, mas é a lacuna de índice mais barata e
    // de maior valor a corrigir — identificada numa revisão de performance
    // (2026-09-01), ver project memory para o detalhe completo.
    await queryInterface.addIndex('products', ['tenant_id'], {
      name: 'products_tenant_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('products', 'products_tenant_id');
  },
};
