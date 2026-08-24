import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';
import { login, registerTenant } from '../services/authService';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantName, nuit, address, phone, tenantEmail, adminName, adminEmail, adminPassword } =
      req.body;

    if (!tenantName || !nuit || !adminName || !adminEmail || !adminPassword) {
      throw new AppError(
        'Campos obrigatórios em falta: tenantName, nuit, adminName, adminEmail, adminPassword',
        422,
      );
    }

    const result = await registerTenant({
      tenantName,
      nuit,
      address,
      phone,
      tenantEmail,
      adminName,
      adminEmail,
      adminPassword,
    });

    sendSuccess(res, result, 'Estabelecimento registado com sucesso', 201);
  } catch (error) {
    next(error);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email e senha são obrigatórios', 422);
    }

    const result = await login({ email, password });

    sendSuccess(res, result, 'Autenticado com sucesso');
  } catch (error) {
    next(error);
  }
}
