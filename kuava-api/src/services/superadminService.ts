import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Tenant, User } from '../models';
import { UserRole } from '../types/enums';
import { AppError } from '../utils/AppError';

const SALT_ROUNDS = 10;

// Sem os caracteres ambíguos (0/O, 1/l/I) — esta senha vai ser lida e
// digitada à mão pelo superadmin e depois pelo cliente ao telefone.
const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateTemporaryPassword(length = 10): string {
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i += 1) {
    password += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }
  return password;
}

/**
 * Serviços exclusivos do painel de superadmin (o dono da plataforma Kuava a
 * gerir os seus clientes/tenants) — nunca tenant-scoped, ao contrário de
 * praticamente todos os outros serviços da app.
 */
export async function listTenants(): Promise<Tenant[]> {
  return Tenant.findAll({ order: [['created_at', 'DESC']] });
}

export async function setTenantActive(tenantId: string, isActive: boolean): Promise<Tenant> {
  const tenant = await Tenant.findByPk(tenantId);

  if (!tenant) {
    throw new AppError('Estabelecimento não encontrado', 404);
  }

  tenant.is_active = isActive;
  await tenant.save();

  return tenant;
}

/**
 * Marca manualmente se um tenant tem um plano pago ativo — mecanismo de
 * confirmação de pagamento deste projeto: sem gateway integrado (mesmo
 * padrão do M-Pesa/e-Mola), o cliente paga por fora e o superadmin ativa o
 * plano aqui. Ativar sempre restaura o login mesmo que o trial de 7 dias já
 * tenha terminado — ver o bloqueio em authService.login().
 */
export async function setTenantSubscriptionActive(tenantId: string, active: boolean): Promise<Tenant> {
  const tenant = await Tenant.findByPk(tenantId);

  if (!tenant) {
    throw new AppError('Estabelecimento não encontrado', 404);
  }

  tenant.subscription_active = active;
  await tenant.save();

  return tenant;
}

/**
 * Único mecanismo de "esqueci a senha" para um ADMIN de estabelecimento:
 * sem serviço de email configurado no projeto, a reposição é sempre manual
 * — o superadmin gera uma senha temporária aqui e passa-a ao cliente por
 * fora da app (telefone, WhatsApp, etc.). Repõe a senha de TODOS os
 * ADMINs ativos do tenant (normalmente só um) para a mesma senha
 * temporária, porque não há como saber de fora qual deles está a pedir
 * ajuda — qualquer um consegue entrar com ela e depois trocar a senha.
 */
export async function resetTenantAdminPassword(
  tenantId: string,
): Promise<{ temporaryPassword: string; adminEmails: string[] }> {
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    throw new AppError('Estabelecimento não encontrado', 404);
  }

  const admins = await User.findAll({
    where: { tenant_id: tenantId, role: UserRole.ADMIN, is_active: true },
  });

  if (admins.length === 0) {
    throw new AppError('Este estabelecimento não tem nenhum ADMIN ativo para repor a senha', 404);
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);

  await Promise.all(admins.map((admin) => admin.update({ password_hash: passwordHash })));

  return { temporaryPassword, adminEmails: admins.map((admin) => admin.email) };
}
