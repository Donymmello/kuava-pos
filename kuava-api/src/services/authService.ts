import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { sequelize, Tenant, User } from '../models';
import { UserRole } from '../types/enums';
import { AppError } from '../utils/AppError';

const SALT_ROUNDS = 10;

// Fase inicial (2026-08-24): todo o estabelecimento novo entra num período
// de teste gratuito de 7 dias antes de precisar de um plano pago — ver o
// bloqueio no login() abaixo e a ativação manual do plano no painel de
// superadmin (superadminService.setTenantSubscriptionActive).
const TRIAL_PERIOD_DAYS = 7;

function trialEndDate(): Date {
  const end = new Date();
  end.setDate(end.getDate() + TRIAL_PERIOD_DAYS);
  return end;
}

interface RegisterTenantInput {
  tenantName: string;
  nuit: string;
  address?: string;
  phone?: string;
  tenantEmail?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    tenantId: string | null;
  };
}

function issueToken(user: User): string {
  const options: SignOptions = { expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'] };

  return jwt.sign(
    {
      sub: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      email: user.email,
    },
    env.jwt.secret,
    options,
  );
}

export async function registerTenant(input: RegisterTenantInput): Promise<AuthResult> {
  return sequelize.transaction(async (transaction) => {
    const existingTenant = await Tenant.findOne({ where: { nuit: input.nuit }, transaction });
    if (existingTenant) {
      throw new AppError('Já existe um estabelecimento registado com este NUIT', 409);
    }

    // O email do administrador é único em toda a aplicação (não só neste
    // estabelecimento) — ver o comentário no índice do modelo User.
    const existingUser = await User.findOne({ where: { email: input.adminEmail }, transaction });
    if (existingUser) {
      throw new AppError('Já existe um utilizador registado com este email', 409);
    }

    const tenant = await Tenant.create(
      {
        name: input.tenantName,
        nuit: input.nuit,
        address: input.address ?? null,
        phone: input.phone ?? null,
        email: input.tenantEmail ?? null,
        // Fase inicial: começa em teste gratuito, não com um plano pago —
        // ver TRIAL_PERIOD_DAYS acima. A coluna tem defaultValue:true, por
        // isso é preciso passar subscription_active explicitamente aqui.
        trial_ends_at: trialEndDate(),
        subscription_active: false,
      },
      { transaction },
    );

    const passwordHash = await bcrypt.hash(input.adminPassword, SALT_ROUNDS);

    const adminUser = await User.create(
      {
        tenant_id: tenant.id,
        name: input.adminName,
        email: input.adminEmail,
        password_hash: passwordHash,
        role: UserRole.ADMIN,
      },
      { transaction },
    );

    const token = issueToken(adminUser);

    return {
      token,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        tenantId: adminUser.tenant_id,
      },
    };
  });
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await User.findOne({ where: { email: input.email } });

  if (!user || !user.is_active) {
    throw new AppError('Credenciais inválidas', 401);
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Credenciais inválidas', 401);
  }

  // SUPERADMIN não tem tenant_id — só valida o estabelecimento quando o
  // utilizador pertence a um. Sem esta verificação, desativar um tenant no
  // painel de superadmin não bloquearia o login dos utilizadores dele.
  if (user.tenant_id) {
    const tenant = await Tenant.findByPk(user.tenant_id);
    if (!tenant || !tenant.is_active) {
      throw new AppError('Este estabelecimento foi desativado. Contacte o suporte.', 401);
    }

    // Bloqueia o login (não as chamadas de uma sessão já iniciada — mesmo
    // padrão do bloqueio de is_active acima) quando o período de teste
    // gratuito acabou e ninguém ativou um plano pago ainda. Tenants sem
    // trial_ends_at (registados antes desta funcionalidade) nunca são
    // afetados por esta verificação.
    if (!tenant.subscription_active && tenant.trial_ends_at && new Date() > new Date(tenant.trial_ends_at)) {
      throw new AppError(
        'O período de teste gratuito (7 dias) deste estabelecimento terminou. Contacte o suporte para ativar um plano e continuar a usar a Kuava POS.',
        401,
      );
    }
  }

  const token = issueToken(user);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    },
  };
}
