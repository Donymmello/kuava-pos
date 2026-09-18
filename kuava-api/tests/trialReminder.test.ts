import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTestTenant, setTenantSubscriptionExpiry } from './helpers';
import { Tenant } from '../src/models';
import { sendEmail } from '../src/services/emailService';
import { daysLeftUntil, milestoneFor, sendDueTrialReminders } from '../src/services/trialReminderService';

// vi.mock é içado acima dos imports, por isso o sendEmail acima já é o duplo.
vi.mock('../src/services/emailService', () => ({
  isEmailEnabled: true,
  sendEmail: vi.fn(async () => true),
  renderEmailLayout: (_title: string, body: string) => body,
}));

const sendEmailMock = vi.mocked(sendEmail);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Põe o trial a acabar dentro de N dias (e limpa o marco já avisado). */
async function setTrialEndingIn(tenantId: string, days: number, reminderSent: number | null = null): Promise<void> {
  await Tenant.update(
    {
      trial_ends_at: new Date(Date.now() + days * DAY_MS),
      trial_reminder_days_sent: reminderSent,
    },
    { where: { id: tenantId } },
  );
}

describe('aviso de fim de trial', () => {
  beforeEach(() => {
    sendEmailMock.mockClear();
    sendEmailMock.mockResolvedValue(true);
  });

  it('escolhe o marco certo para os dias que faltam', () => {
    // Ainda longe do primeiro marco: não se avisa nada.
    expect(milestoneFor(30)).toBeNull();
    expect(milestoneFor(8)).toBeNull();
    // Entre 7 e 4 dias estamos no marco dos 7.
    expect(milestoneFor(7)).toBe(7);
    expect(milestoneFor(5)).toBe(7);
    // Entre 3 e 2, no dos 3.
    expect(milestoneFor(3)).toBe(3);
    expect(milestoneFor(2)).toBe(3);
    // No último dia, no de 1.
    expect(milestoneFor(1)).toBe(1);
    // Já terminou: marco 0, o aviso de acesso bloqueado.
    expect(milestoneFor(0)).toBe(0);
    expect(milestoneFor(-2)).toBe(0);
  });

  it('conta como "1 dia" enquanto o trial ainda não acabou', () => {
    const now = new Date('2026-09-18T08:00:00Z');
    // Faltam poucas horas, mas ainda falta: arredonda para cima, não para zero.
    expect(daysLeftUntil(new Date('2026-09-18T20:00:00Z'), now)).toBe(1);
    expect(daysLeftUntil(new Date('2026-09-25T08:00:00Z'), now)).toBe(7);
  });

  it('avisa a 7 dias do fim e guarda o marco, sem repetir na passagem seguinte', async () => {
    const tenant = await registerTestTenant();
    await setTrialEndingIn(tenant.tenantId, 6);

    expect(await sendDueTrialReminders()).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][0].to).toBe(tenant.adminEmail);

    const saved = await Tenant.findByPk(tenant.tenantId);
    expect(saved?.trial_reminder_days_sent).toBe(7);

    // Segunda passagem no mesmo dia: nada de novo.
    sendEmailMock.mockClear();
    expect(await sendDueTrialReminders()).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('volta a avisar quando se atinge um marco mais próximo do fim', async () => {
    const tenant = await registerTestTenant();
    // Já foi avisado aos 7; agora faltam 2 dias, ou seja, marco dos 3.
    await setTrialEndingIn(tenant.tenantId, 2, 7);

    expect(await sendDueTrialReminders()).toBe(1);
    expect(await Tenant.findByPk(tenant.tenantId).then((t) => t?.trial_reminder_days_sent)).toBe(3);

    // E outra vez no último dia.
    await Tenant.update({ trial_ends_at: new Date(Date.now() + 0.5 * DAY_MS) }, { where: { id: tenant.tenantId } });
    sendEmailMock.mockClear();
    expect(await sendDueTrialReminders()).toBe(1);
    expect(sendEmailMock.mock.calls[0][0].subject).toContain('amanhã');
  });

  it('ignora quem já tem plano pago em vigor', async () => {
    const tenant = await registerTestTenant();
    await setTrialEndingIn(tenant.tenantId, 2);
    await setTenantSubscriptionExpiry(tenant.tenantId, new Date(Date.now() + 40 * DAY_MS));

    expect(await sendDueTrialReminders()).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('ignora um trial que ainda vai longe', async () => {
    const tenant = await registerTestTenant();
    await setTrialEndingIn(tenant.tenantId, 20);

    expect(await sendDueTrialReminders()).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('não marca como avisado quando o email não chega a sair', async () => {
    const tenant = await registerTestTenant();
    await setTrialEndingIn(tenant.tenantId, 2);
    // É o que acontece com SMTP por configurar: sendEmail devolve false.
    sendEmailMock.mockResolvedValue(false);

    expect(await sendDueTrialReminders()).toBe(0);

    const saved = await Tenant.findByPk(tenant.tenantId);
    expect(saved?.trial_reminder_days_sent).toBeNull();

    // Assim que o correio voltar, o aviso sai na mesma.
    sendEmailMock.mockResolvedValue(true);
    expect(await sendDueTrialReminders()).toBe(1);
  });

  it('avisa quando o trial já terminou, com o marco 0', async () => {
    const tenant = await registerTestTenant();
    // Terminou ontem, e já tinha sido avisado no último dia.
    await setTrialEndingIn(tenant.tenantId, -1, 1);

    expect(await sendDueTrialReminders()).toBe(1);
    expect(sendEmailMock.mock.calls[0][0].subject).toContain('terminou');
    expect(sendEmailMock.mock.calls[0][0].text).toContain('Nada se perdeu');

    const saved = await Tenant.findByPk(tenant.tenantId);
    expect(saved?.trial_reminder_days_sent).toBe(0);

    // É o último aviso: mais nenhuma passagem escreve a este cliente.
    sendEmailMock.mockClear();
    expect(await sendDueTrialReminders()).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('avisa do fim mesmo a quem nunca recebeu nenhum aviso anterior', async () => {
    const tenant = await registerTestTenant();
    await setTrialEndingIn(tenant.tenantId, -1, null);

    expect(await sendDueTrialReminders()).toBe(1);
    expect(sendEmailMock.mock.calls[0][0].subject).toContain('terminou');
  });

  it('não escreve a quem expirou há muito tempo, para a primeira passagem não varrer o histórico', async () => {
    const tenant = await registerTestTenant();
    // Desistiu há um mês: não é para esse que este aviso serve.
    await setTrialEndingIn(tenant.tenantId, -30, null);

    expect(await sendDueTrialReminders()).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('ignora um trial terminado se entretanto já houver plano pago', async () => {
    const tenant = await registerTestTenant();
    await setTrialEndingIn(tenant.tenantId, -1, 1);
    await setTenantSubscriptionExpiry(tenant.tenantId, new Date(Date.now() + 30 * DAY_MS));

    expect(await sendDueTrialReminders()).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
