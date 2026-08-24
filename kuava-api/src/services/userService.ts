import bcrypt from 'bcryptjs';
import { User } from '../models';
import { UserRole } from '../types/enums';
import { AppError } from '../utils/AppError';

const SALT_ROUNDS = 10;

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  is_active?: boolean;
  password?: string;
}

export async function listUsers(tenantId: string): Promise<User[]> {
  return User.findAll({
    where: { tenant_id: tenantId },
    attributes: { exclude: ['password_hash'] },
    order: [['name', 'ASC']],
  });
}

export async function createUser(tenantId: string, input: CreateUserInput): Promise<User> {
  // SUPERADMIN nunca pode ser atribuído por aqui — esta rota é sempre
  // tenant-scoped (tenantMiddleware), e SUPERADMIN é a conta do dono da
  // plataforma, sem tenant_id. Um ADMIN de estabelecimento não pode
  // promover-se a si próprio (ou a outro) a superadmin desta forma.
  if (!Object.values(UserRole).includes(input.role) || input.role === UserRole.SUPERADMIN) {
    throw new AppError('Perfil inválido', 422);
  }

  // O email é único em toda a aplicação (não só neste estabelecimento) —
  // ver o comentário no índice do modelo User para o porquê.
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) {
    throw new AppError('Já existe um utilizador registado com este email', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await User.create({
    tenant_id: tenantId,
    name: input.name,
    email: input.email,
    password_hash: passwordHash,
    role: input.role,
  });

  return user;
}

export async function updateUser(
  tenantId: string,
  userId: string,
  actingUserId: string,
  input: UpdateUserInput,
): Promise<User> {
  const user = await User.findOne({ where: { id: userId, tenant_id: tenantId } });

  if (!user) {
    throw new AppError('Utilizador não encontrado', 404);
  }

  if (input.role && (!Object.values(UserRole).includes(input.role) || input.role === UserRole.SUPERADMIN)) {
    throw new AppError('Perfil inválido', 422);
  }

  if (userId === actingUserId && input.is_active === false) {
    throw new AppError('Não pode desativar a sua própria conta', 400);
  }

  if (input.email && input.email !== user.email) {
    const existing = await User.findOne({ where: { email: input.email } });
    if (existing && existing.id !== user.id) {
      throw new AppError('Já existe um utilizador registado com este email', 409);
    }
  }

  const passwordHash = input.password ? await bcrypt.hash(input.password, SALT_ROUNDS) : undefined;

  await user.update({
    name: input.name ?? user.name,
    email: input.email ?? user.email,
    role: input.role ?? user.role,
    is_active: input.is_active ?? user.is_active,
    password_hash: passwordHash ?? user.password_hash,
  });

  return user;
}
