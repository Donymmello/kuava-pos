'use strict';

// Coluna nova (2026-09-18): qual o último aviso de fim de trial já enviado
// a este estabelecimento, guardado em dias que faltavam (7, 3 ou 1). Null
// significa que ainda não foi enviado nenhum. Serve só para o aviso não se
// repetir a cada passagem do agendador — ver src/services/trialReminderService.ts.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tenants', 'trial_reminder_days_sent', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tenants', 'trial_reminder_days_sent');
  },
};
