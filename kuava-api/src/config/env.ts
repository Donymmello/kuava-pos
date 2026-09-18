import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variável de ambiente obrigatória em falta: ${name}`);
  }
  return value;
}

const nodeEnv = requireEnv('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';

const INSECURE_JWT_SECRET_FALLBACK = 'troque-este-segredo-em-producao';

/**
 * O JWT_SECRET nunca pode cair no valor de exemplo em produção, se isso
 * acontecesse, qualquer pessoa com acesso ao código (ex.: este repositório
 * no GitHub) conseguiria forjar tokens válidos para qualquer utilizador,
 * incluindo SUPERADMIN. Fora de produção mantém-se o fallback por
 * conveniência (dev/test não precisam de configurar isto à mão).
 */
function requireJwtSecret(): string {
  const value = process.env.JWT_SECRET;
  if (isProduction) {
    if (!value || value === INSECURE_JWT_SECRET_FALLBACK) {
      throw new Error(
        'JWT_SECRET em falta (ou a usar o valor de exemplo) com NODE_ENV=production. ' +
          'Define uma variável de ambiente JWT_SECRET forte e única antes de arrancar a aplicação.',
      );
    }
    return value;
  }
  return value ?? INSECURE_JWT_SECRET_FALLBACK;
}

export const env = {
  nodeEnv,
  port: parseInt(requireEnv('PORT', '3333'), 10),

  db: {
    host: requireEnv('DB_HOST', 'localhost'),
    port: parseInt(requireEnv('DB_PORT', '5432'), 10),
    name: requireEnv('DB_NAME', 'kuava_pos'),
    user: requireEnv('DB_USER', 'postgres'),
    password: requireEnv('DB_PASSWORD', 'postgres'),
    logging: requireEnv('DB_LOGGING', 'false') === 'true',
  },

  jwt: {
    secret: requireJwtSecret(),
    expiresIn: requireEnv('JWT_EXPIRES_IN', '8h'),
  },

  corsOrigin: requireEnv('CORS_ORIGIN', 'http://localhost:5173'),

  ivaRate: parseFloat(requireEnv('IVA_RATE', '0.16')),

  // Dados usados na fatura pro-forma da página de assinatura (ver
  // subscriptionService.ts): sem gateway de pagamento, é para onde o
  // cliente transfere manualmente. Os preços por omissão coincidem com os
  // já mostrados na landing page (kuava-web/src/pages/landing/LandingPage.tsx).
  billing: {
    bankName: requireEnv('KUAVA_BANK_NAME', 'PREENCHER_NOME_DO_BANCO'),
    bankAccountHolder: requireEnv('KUAVA_BANK_ACCOUNT_HOLDER', 'PREENCHER_TITULAR_DA_CONTA'),
    bankNib: requireEnv('KUAVA_BANK_NIB', 'PREENCHER_NIB'),
    monthlyPriceMzn: parseFloat(requireEnv('KUAVA_MONTHLY_PRICE_MZN', '1299')),
    annualPriceMzn: parseFloat(requireEnv('KUAVA_ANNUAL_PRICE_MZN', '12990')),
  },

  // SMTP para os avisos ao cliente (ver services/emailService.ts). Tudo
  // opcional de propósito: sem SMTP_HOST o envio fica desligado e a app
  // corre na mesma (é assim em desenvolvimento e nos testes), o email é
  // uma cortesia, nunca um requisito para confirmar um pagamento.
  mail: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(requireEnv('SMTP_PORT', '587'), 10),
    // 465 fala TLS desde o primeiro byte; 587 começa em claro e sobe por
    // STARTTLS, que o nodemailer faz sozinho quando secure=false.
    secure: requireEnv('SMTP_SECURE', 'false') === 'true',
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: requireEnv('SMTP_FROM', 'Kuava POS <notificacoes@vektramz.com>'),
    // Os avisos saem de uma caixa que ninguém lê; quem responder a um deles
    // tem de cair no suporte, não no vazio.
    replyTo: requireEnv('SMTP_REPLY_TO', 'suporte@vektramz.com'),
    // De quantas em quantas horas se procuram trials a terminar (ver
    // services/trialReminderService.ts). 0 desliga o agendador.
    remindersIntervalHours: parseInt(requireEnv('TRIAL_REMINDER_INTERVAL_HOURS', '6'), 10),
  },

  // Usado nos links dentro dos emails, tem de ser o endereço público do
  // frontend (o CORS_ORIGIN já é esse em produção, serve de omissão).
  appUrl: requireEnv('APP_URL', requireEnv('CORS_ORIGIN', 'http://localhost:5173')),
};
