import { NextFunction, Request, Response } from 'express';
import { User } from '../models';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';
import { createUser, listUsers, updateUser } from '../services/userService';
import { UserRole } from '../types/enums';

function serializeUser(user: User) {
  return {
    id: user.id,
    tenant_id: user.tenant_id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
  };
}

export async function listUsersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const users = await listUsers(tenantId);
    sendSuccess(res, users.map(serializeUser));
  } catch (error) {
    next(error);
  }
}

export async function createUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      throw new AppError('Campos obrigatórios em falta: name, email, password, role', 422);
    }

    const user = await createUser(tenantId, { name, email, password, role: role as UserRole });
    sendSuccess(res, serializeUser(user), 'Utilizador criado com sucesso', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId as string;
    const actingUserId = req.user?.id as string;
    const { name, email, role, is_active, password } = req.body;

    const user = await updateUser(tenantId, req.params.id, actingUserId, {
      name,
      email,
      role: role as UserRole | undefined,
      is_active,
      password,
    });

    sendSuccess(res, serializeUser(user), 'Utilizador atualizado com sucesso');
  } catch (error) {
    next(error);
  }
}
