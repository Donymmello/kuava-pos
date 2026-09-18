import { Op } from 'sequelize';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { Tenant, User } from '../models';
import { UserRole } from '../types/enums';
import { formatMzn } from '../utils/currency';
import { renderEmailLayout, sendEmail } from './emailService';

/**
 * Aviso automático de fim do período de teste. Não há nada no pedido HTTP
 * que possa disparar isto (o cliente pode simplesmente não entrar na app
 * nos últimos dias do trial, que é precisamente o caso que queremos
 * apanhar), por isso corre num agendador próprio, arrancado em server.ts.
 */

/**
 * Marcos, em dias que faltam, em que se avisa. Do maior para o menor, é
 * dessa ordem que depende a escolha do marco em milestoneFor. O 0 é o
 * aviso de que o trial já terminou e o acesso ficou bloqueado.
 */
const REMINDER_DAYS = [7, 3, 1, 0];

/**
 * Até quantos dias depois do fim ainda se envia o aviso de trial terminado.
 * Existe por uma razão concreta: à data desta funcionalidade a coluna
 * trial_reminder_days_sent está a null para toda a gente, e sem esta janela
 * a primeira passagem escreveria a todos os trials expirados de sempre,
 * incluindo clientes que desistiram há meses. Só se avisa quem acabou de
 * expirar, que é quem o aviso ainda pode recuperar.
 */
const EXPIRED_GRACE_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Qual o marco a que corresponde "faltam N dias": o mais pequeno dos
 * REMINDER_DAYS que já foi alcançado. Com 5 dias a faltar o marco é o de 7
 * (já passou), com 2 é o de 3, com 1 é o de 1, e com 0 ou menos (já
 * terminou) é o de 0. Devolve null se ainda falta mais do que o primeiro
 * marco.
 */
export function milestoneFor(daysLeft: number): number | null {
  const reached = REMINDER_DAYS.filter((day) => daysLeft <= day);
  return reached.length > 0 ? Math.min(...reached) : null;
}

/** Dias inteiros que faltam, arredondados para cima: falta "1 dia" até ao próprio instante do fim. */
export function daysLeftUntil(endsAt: Date, now: Date): number {
  return Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS);
}

function planRowsHtml(mensal: string, anual: string): string {
  return `<table role="presentation" style="width:100%;font-size:14px;border-collapse:collapse;margin:24px 0;">
         <tr><td style="padding:8px 0;color:#666;">Plano mensal</td>
             <td style="padding:8px 0;text-align:right;">${mensal}</td></tr>
         <tr><td style="padding:8px 0;color:#666;border-top:1px solid #eee;">Plano anual</td>
             <td style="padding:8px 0;text-align:right;border-top:1px solid #eee;">${anual}
               <span style="color:#0f6b4f;">· dois meses grátis</span></td></tr>
       </table>`;
}

function ctaHtml(label: string): string {
  return `<a href="${env.appUrl}/subscription" style="display:inline-block;background:#0f6b4f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:15px;">
         ${label}
       </a>`;
}

/** O aviso de que o trial já terminou e o acesso está bloqueado agora. */
function buildExpiredMessage(tenant: Tenant, to: string, endsAt: Date) {
  const dataFim = new Intl.DateTimeFormat('pt-MZ', { day: '2-digit', month: 'long', year: 'numeric' }).format(endsAt);
  const mensal = formatMzn(env.billing.monthlyPriceMzn);
  const anual = formatMzn(env.billing.annualPriceMzn);

  return {
    to,
    subject: 'O teu período de teste do Kuava POS terminou',
    text: [
      `Olá, ${tenant.name}.`,
      '',
      `O período de teste gratuito terminou a ${dataFim} e o acesso está suspenso:`,
      'as vendas, o stock e os relatórios ficam bloqueados até haver um plano ativo.',
      '',
      'Nada se perdeu. Os produtos, o histórico de vendas e os utilizadores continuam',
      'todos lá, exatamente como os deixaste, e voltam assim que ativares um plano.',
      '',
      `Plano mensal: ${mensal}`,
      `Plano anual: ${anual} (dois meses grátis)`,
      '',
      `Entra em ${env.appUrl}/subscription — geras uma fatura pro-forma com os dados`,
      'bancários e uma referência, pagas por transferência e nós ativamos assim que o pagamento entrar.',
    ].join('\n'),
    html: renderEmailLayout(
      'O teu período de teste terminou',
      `<p style="margin:0 0 16px;font-size:16px;">Olá, <strong>${tenant.name}</strong>.</p>
       <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
         O período de teste gratuito terminou a <strong>${dataFim}</strong> e o acesso está suspenso:
         as vendas, o stock e os relatórios ficam bloqueados até haver um plano ativo.
       </p>
       <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
         <strong>Nada se perdeu.</strong> Os produtos, o histórico de vendas e os utilizadores continuam
         todos lá, exatamente como os deixaste, e voltam assim que ativares um plano.
       </p>
       ${planRowsHtml(mensal, anual)}
       ${ctaHtml('Reativar o acesso')}`,
    ),
  };
}

/** O aviso de que o trial está prestes a terminar (marcos de 7, 3 e 1 dia). */
function buildEndingMessage(tenant: Tenant, to: string, daysLeft: number, endsAt: Date) {
  const quando = daysLeft === 1 ? 'amanhã' : `daqui a ${daysLeft} dias`;
  const dataFim = new Intl.DateTimeFormat('pt-MZ', { day: '2-digit', month: 'long', year: 'numeric' }).format(endsAt);
  const mensal = formatMzn(env.billing.monthlyPriceMzn);
  const anual = formatMzn(env.billing.annualPriceMzn);

  return {
    to,
    subject:
      daysLeft === 1
        ? 'O teu período de teste do Kuava POS termina amanhã'
        : `Faltam ${daysLeft} dias de teste do Kuava POS`,
    text: [
      `Olá, ${tenant.name}.`,
      '',
      `O período de teste gratuito termina ${quando}, a ${dataFim}.`,
      'Quando terminar, as vendas, o stock e os relatórios ficam bloqueados até haver um plano ativo.',
      'Os teus dados não se perdem, ficam à espera.',
      '',
      `Plano mensal: ${mensal}`,
      `Plano anual: ${anual} (dois meses grátis)`,
      '',
      `Escolhe um plano em ${env.appUrl}/subscription — geras uma fatura pro-forma com os dados`,
      'bancários e uma referência, pagas por transferência e nós ativamos assim que o pagamento entrar.',
    ].join('\n'),
    html: renderEmailLayout(
      'O teu período de teste está a terminar',
      `<p style="margin:0 0 16px;font-size:16px;">Olá, <strong>${tenant.name}</strong>.</p>
       <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
         O período de teste gratuito termina <strong>${quando}</strong>, a ${dataFim}. Quando terminar,
         as vendas, o stock e os relatórios ficam bloqueados até haver um plano ativo.
         Os teus dados não se perdem, ficam à espera.
       </p>
       ${planRowsHtml(mensal, anual)}
       ${ctaHtml('Escolher um plano')}`,
    ),
  };
}

function buildMessage(tenant: Tenant, to: string, daysLeft: number, endsAt: Date) {
  return daysLeft <= 0
    ? buildExpiredMessage(tenant, to, endsAt)
    : buildEndingMessage(tenant, to, daysLeft, endsAt);
}

/**
 * Para onde vai o aviso: o email do estabelecimento se estiver preenchido,
 * senão o do ADMIN, que é obrigatório e único. Igual ao critério usado na
 * confirmação de pagamento (subscriptionService.ts).
 */
async function resolveRecipient(tenant: Tenant): Promise<string | null> {
  if (tenant.email) {
    return tenant.email;
  }
  const admin = await User.findOne({
    where: { tenant_id: tenant.id, role: UserRole.ADMIN, is_active: true },
    order: [['created_at', 'ASC']],
  });
  return admin?.email ?? null;
}

/**
 * Percorre os trials a terminar (ou acabados de terminar) e envia o aviso
 * do marco correspondente. Devolve quantos emails saíram. Idempotente:
 * trial_reminder_days_sent guarda o último marco já enviado, por isso
 * correr isto várias vezes no mesmo dia não duplica nada.
 *
 * A coluna só é gravada quando o email sai mesmo (sendEmail devolve true),
 * caso contrário um SMTP mal configurado marcaria como avisados clientes
 * que nunca receberam nada.
 */
export async function sendDueTrialReminders(now: Date = new Date()): Promise<number> {
  const horizon = new Date(now.getTime() + REMINDER_DAYS[0] * DAY_MS);
  // O limite de trás existe para não escrever a quem expirou há muito tempo,
  // ver EXPIRED_GRACE_DAYS.
  const floor = new Date(now.getTime() - EXPIRED_GRACE_DAYS * DAY_MS);

  const tenants = await Tenant.findAll({
    where: {
      is_active: true,
      trial_ends_at: { [Op.gt]: floor, [Op.lte]: horizon },
      // Quem já tem plano pago em vigor não precisa de ser avisado de nada,
      // o fim do trial não lhe tira o acesso.
      [Op.or]: [{ subscription_expires_at: null }, { subscription_expires_at: { [Op.lte]: now } }],
    },
  });

  let sent = 0;

  for (const tenant of tenants) {
    const endsAt = new Date(tenant.trial_ends_at as Date);
    const daysLeft = daysLeftUntil(endsAt, now);
    const milestone = milestoneFor(daysLeft);

    if (milestone === null) {
      continue;
    }
    // Já foi avisado neste marco (ou num mais próximo do fim): nada a fazer.
    const alreadySent = tenant.trial_reminder_days_sent;
    if (alreadySent !== null && alreadySent !== undefined && alreadySent <= milestone) {
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const to = await resolveRecipient(tenant);
    if (!to) {
      logger.warn({ tenantId: tenant.id }, 'Sem destinatário para o aviso de fim de trial');
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const delivered = await sendEmail(buildMessage(tenant, to, daysLeft, endsAt));
    if (!delivered) {
      continue;
    }

    tenant.trial_reminder_days_sent = milestone;
    // eslint-disable-next-line no-await-in-loop
    await tenant.save();
    sent += 1;
  }

  if (sent > 0) {
    logger.info({ sent }, 'Avisos de fim de trial enviados');
  }
  return sent;
}

/**
 * Arranca a passagem periódica. Corre uma vez ao arrancar (um reinício a
 * meio do dia não faz perder o aviso desse dia) e depois de X em X horas.
 *
 * ponytail: agendador em memória, assume uma só instância da API — é o que
 * o docker-compose.prod.yml corre hoje. Com duas instâncias as duas fariam
 * a passagem e algum cliente podia receber o aviso duas vezes; nessa
 * altura, trocar por um cron externo a chamar sendDueTrialReminders, ou um
 * SELECT ... FOR UPDATE SKIP LOCKED sobre os tenants.
 */
export function startTrialReminderScheduler(): NodeJS.Timeout | null {
  if (env.mail.remindersIntervalHours <= 0) {
    logger.info('Agendador de avisos de fim de trial desligado por configuração');
    return null;
  }

  const run = () => {
    sendDueTrialReminders().catch((error) => {
      // Nunca deixar uma falha aqui derrubar o processo: é uma tarefa de
      // fundo, a API tem de continuar a servir pedidos na mesma.
      logger.error({ err: error }, 'Falha na passagem de avisos de fim de trial');
    });
  };

  run();
  const timer = setInterval(run, env.mail.remindersIntervalHours * 60 * 60 * 1000);
  // Não segurar o processo aberto só por causa deste temporizador.
  timer.unref();
  logger.info(
    { intervalHours: env.mail.remindersIntervalHours },
    'Agendador de avisos de fim de trial iniciado',
  );
  return timer;
}
