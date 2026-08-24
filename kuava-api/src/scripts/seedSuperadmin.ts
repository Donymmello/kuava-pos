/**
 * Cria (ou atualiza a senha de) a conta de superadmin da plataforma —
 * corre-se uma vez, fora da app, nunca por um endpoint público de registo.
 *
 * Uso: SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... npm run seed:superadmin
 * (SUPERADMIN_NAME é opcional.)
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sequelize, User } from '../models';
import { UserRole } from '../types/enums';

const SALT_ROUNDS = 10;

async function main(): Promise<void> {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME ?? 'Superadmin';

  if (!email || !password) {
    console.error(
      'Defina SUPERADMIN_EMAIL e SUPERADMIN_PASSWORD antes de correr este script (ex.: ' +
        'SUPERADMIN_EMAIL=dono@kuava.co.mz SUPERADMIN_PASSWORD=senha-forte npm run seed:superadmin).',
    );
    process.exitCode = 1;
    return;
  }

  if (password.length < 8) {
    console.error('SUPERADMIN_PASSWORD deve ter pelo menos 8 caracteres.');
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const existing = await User.findOne({ where: { email } });

  if (existing) {
    await existing.update({
      name,
      password_hash: passwordHash,
      role: UserRole.SUPERADMIN,
      tenant_id: null,
      is_active: true,
    });
    console.log(`Conta de superadmin atualizada: ${email}`);
  } else {
    await User.create({
      tenant_id: null,
      name,
      email,
      password_hash: passwordHash,
      role: UserRole.SUPERADMIN,
    });
    console.log(`Conta de superadmin criada: ${email}`);
  }
}

main()
  .catch((error) => {
    console.error('Falha ao criar/atualizar o superadmin:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
