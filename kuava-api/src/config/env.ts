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
 * O JWT_SECRET nunca pode cair no valor de exemplo em produção — se isso
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
};
