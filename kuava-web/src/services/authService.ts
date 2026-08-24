import { api } from './api';
import { ApiSuccessResponse, AuthUser } from '../types';

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export interface RegisterInput {
  tenantName: string;
  nuit: string;
  address?: string;
  phone?: string;
  tenantEmail?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const response = await api.post<ApiSuccessResponse<AuthResult>>('/auth/login', {
    email,
    password,
  });
  return response.data.data;
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const response = await api.post<ApiSuccessResponse<AuthResult>>('/auth/register', input);
  return response.data.data;
}
