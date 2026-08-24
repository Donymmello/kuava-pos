import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variável de ambiente obrigatória em falta: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: requireEnv('NODE_ENV', 'development'),
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
    secret: requireEnv('JWT_SECRET', 'troque-este-segredo-em-producao'),
    expiresIn: requireEnv('JWT_EXPIRES_IN', '8h'),
  },

  corsOrigin: requireEnv('CORS_ORIGIN', 'http://localhost:5173'),

  ivaRate: parseFloat(requireEnv('IVA_RATE', '0.16')),
};
