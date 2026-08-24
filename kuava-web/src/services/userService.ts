import { api } from './api';
import { ApiSuccessResponse, TenantUser, UserRole } from '../types';

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

export async function fetchUsers(): Promise<TenantUser[]> {
  const response = await api.get<ApiSuccessResponse<TenantUser[]>>('/users');
  return response.data.data;
}

export async function createUser(payload: CreateUserInput): Promise<TenantUser> {
  const response = await api.post<ApiSuccessResponse<TenantUser>>('/users', payload);
  return response.data.data;
}

export async function updateUser(id: string, payload: UpdateUserInput): Promise<TenantUser> {
  const response = await api.put<ApiSuccessResponse<TenantUser>>(`/users/${id}`, payload);
  return response.data.data;
}
