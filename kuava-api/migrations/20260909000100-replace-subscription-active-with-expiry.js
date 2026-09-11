'use strict';

// Substitui tenants.subscription_active (booleano) por
// tenants.subscription_expires_at (data), decisão de 2026-09-09: para
// suportar planos mensal/anual a sério (cada confirmação estende a data por
// 30 ou 365 dias, ver subscriptionService.ts), um simples ativo/inativo já
// não chega.
//
// null passa a significar "sem subscrição paga ativa" (só o trial conta, se
// ainda válido); uma data no futuro significa "pago até lá". Para não
// afetar quem já tinha o plano ativado manualmente (subscription_active
// true) antes desta mudança, esses tenants ficam com uma data bem no
// futuro (SENTINEL_FAR_FUTURE), como se tivessem uma assinatura vitalícia
// grandfathered — nunca mais precisam de nada até decidirem mudar de plano.
const SENTINEL_FAR_FUTURE = '2099-12-31';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tenants', 'subscription_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      `UPDATE tenants SET subscription_expires_at = :sentinel WHERE subscription_active = true`,
      { replacements: { sentinel: SENTINEL_FAR_FUTURE } },
    );

    await queryInterface.removeColumn('tenants', 'subscription_active');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('tenants', 'subscription_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // Reversão com perda: não há como distinguir "grandfathered" de "pagou
    // um plano real" só a partir da data, tudo o que ainda está no futuro
    // volta a ficar ativo, o resto inativo.
    await queryInterface.sequelize.query(
      `UPDATE tenants SET subscription_active = (subscription_expires_at IS NOT NULL AND subscription_expires_at > NOW())`,
    );

    await queryInterface.removeColumn('tenants', 'subscription_expires_at');
  },
};
