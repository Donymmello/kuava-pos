import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { sequelize, Tenant, User } from '../models';
import { UserRole } from '../types/enums';
import { AppError } from '../utils/AppError';

const SALT_ROUNDS = 10;

// Fase inicial (2026-08-24): todo o estabelecimento novo entra num período
// de teste gratuito de 7 dias antes de precisar de um plano pago. Desde
// 2026-09-09 isto já não bloqueia o login (ver o comentário em login()
// abaixo), só decide quando a página de assinatura passa a ser obrigatória
// (kuava-web/src/pages/subscription/SubscriptionPage.tsx).
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
    // estabelecimento), ver o comentário no índice do modelo User.
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
        // Começa em teste gratuito, não com um plano pago (ver
        // TRIAL_PERIOD_DAYS acima), subscription_expires_at só passa a ter
        // valor quando o superadmin confirmar um pedido de assinatura.
        trial_ends_at: trialEndDate(),
        subscription_expires_at: null,
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

  // SUPERADMIN não tem tenant_id, só valida o estabelecimento quando o
  // utilizador pertence a um. Sem esta verificação, desativar um tenant no
  // painel de superadmin não bloquearia o login dos utilizadores dele.
  if (user.tenant_id) {
    const tenant = await Tenant.findByPk(user.tenant_id);
    if (!tenant || !tenant.is_active) {
      throw new AppError('Este estabelecimento foi desativado. Contacte o suporte.', 401);
    }

    // Decisão de 2026-09-09: o login deixou de bloquear quando o trial
    // expira sem plano pago, o utilizador entra sempre, e o frontend
    // mostra a página de assinatura em vez das páginas normais (ver
    // SubscriptionGuard.tsx). A aplicação real do bloqueio passou para o
    // requireActiveSubscription nas rotas de negócio (produtos, vendas,
    // painel, utilizadores).
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
