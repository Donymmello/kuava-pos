module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tenants', 'trial_ends_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // NOT NULL com defaultValue: true — tenants já existentes ficam
    // automaticamente `subscription_active: true` (o Postgres preenche a
    // coluna nova com o default nas linhas já existentes), para não afetar
    // quem já estava registado antes desta funcionalidade (trial_ends_at
    // fica null para eles, por isso a verificação de trial no login nunca
    // se aplica). Só o registo de um NOVO tenant (authService.registerTenant)
    // é que passa explicitamente `subscription_active: false` para entrar
    // em período de teste.
    await queryInterface.addColumn('tenants', 'subscription_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tenants', 'subscription_active');
    await queryInterface.removeColumn('tenants', 'trial_ends_at');
  },
};
