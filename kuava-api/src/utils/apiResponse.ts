import { Response } from 'express';

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorBody {
  success: false;
  data: null;
  message: string;
  errors?: unknown;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operação realizada com sucesso',
  statusCode = 200,
): Response<ApiSuccessBody<T>> {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: unknown,
): Response<ApiErrorBody> {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    ...(errors !== undefined ? { errors } : {}),
  });
}
