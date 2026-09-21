import crypto from 'crypto';
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Envio de email transacional por SMTP. Deliberadamente opcional: se
 * SMTP_HOST não estiver definido (desenvolvimento, testes, ou uma
 * instalação que ainda não configurou correio), sendEmail regista a
 * intenção no log e devolve false, sem rebentar. Nenhuma operação de
 * negócio desta app deve depender do email ter chegado.
 */

export const isEmailEnabled = Boolean(env.mail.host);

/**
 * Domínio do remetente, extraído de SMTP_FROM (que tanto pode ser
 * "nome@dominio" como "Nome <nome@dominio>"). Serve para o Message-ID: por
 * omissão o nodemailer usa o hostname da máquina, que dentro de um
 * contentor é um hash tipo "23161ee2daf9" — um Message-ID cujo domínio não
 * existe é sinal clássico de spam para o Gmail. Aqui fica o domínio real.
 */
const FROM_DOMAIN = (env.mail.from.match(/@([^\s>]+)/)?.[1] ?? 'localhost').trim();

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  // Criado à primeira utilização e reutilizado: o nodemailer mantém um pool
  // implícito de ligações, criar um transporter por email abriria uma
  // ligação SMTP nova de cada vez.
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      // Um servidor SMTP interno/sem autenticação é válido; só passamos
      // credenciais se realmente existirem.
      auth: env.mail.user ? { user: env.mail.user, pass: env.mail.password } : undefined,
    });
  }
  return transporter;
}

/**
 * Escapa texto vindo do utilizador antes de entrar no HTML de um email.
 *
 * Não é cosmético: o nome do estabelecimento é editável pelo próprio
 * cliente (tenantService.updateTenant) e o destinatário também
 * (tenant.email). Sem isto, um cliente podia pôr HTML no nome, apontar o
 * email para uma vítima, e usar o Kuava para lhe entregar uma mensagem
 * com conteúdo à escolha dele — assinada por DKIM e com SPF válido do
 * nosso domínio. É um vetor de phishing a montar na nossa reputação.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Devolve true se o email saiu, false se o envio está desligado ou falhou. Nunca lança. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  if (!isEmailEnabled) {
    logger.debug({ to: message.to, subject: message.subject }, 'SMTP não configurado, email não enviado');
    return false;
  }

  try {
    await getTransporter().sendMail({
      from: env.mail.from,
      replyTo: env.mail.replyTo,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      messageId: `<${crypto.randomUUID()}@${FROM_DOMAIN}>`,
      // O Return-Path passa a ser a caixa que se autenticou, e não o alias
      // do cabeçalho From. É sobre este endereço que o SPF é verificado,
      // por isso alinhá-lo com a conta SMTP real evita um SPF a falhar.
      envelope: { from: env.mail.user || env.mail.from, to: message.to },
    });
    logger.info({ to: message.to, subject: message.subject }, 'Email enviado');
    return true;
  } catch (error) {
    // Só log: quem chama está a meio de uma operação que já teve sucesso
    // (ex.: um pagamento confirmado) e não pode ser desfeita por causa de
    // um servidor de correio em baixo.
    logger.error({ err: error, to: message.to, subject: message.subject }, 'Falha ao enviar email');
    return false;
  }
}

/**
 * Molde comum a todos os emails: HTML simples com estilos inline, que é o
 * que os clientes de email (Gmail, Outlook) toleram. Sem imagens nem CSS
 * externo, para não cair em spam nem depender de o destinatário carregar
 * conteúdo remoto.
 */
export function renderEmailLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
  <head><meta charset="utf-8" /><title>${title}</title></head>
  <body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
    <table role="presentation" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 24px;font-size:20px;font-weight:bold;color:#0f6b4f;">Kuava POS</p>
        ${bodyHtml}
        <p style="margin:32px 0 0;font-size:12px;color:#888;border-top:1px solid #eee;padding-top:16px;">
          Email automático do Kuava POS. Precisas de ajuda? Escreve para
          <a href="mailto:${env.mail.replyTo}" style="color:#0f6b4f;">${env.mail.replyTo}</a>.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}
