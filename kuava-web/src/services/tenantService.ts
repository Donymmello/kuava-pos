import { api } from './api';
import { ApiSuccessResponse, Tenant } from '../types';

export interface UpdateTenantInput {
  name?: string;
  nuit?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  default_tax_rate?: number;
}

export async function fetchTenant(): Promise<Tenant> {
  const response = await api.get<ApiSuccessResponse<Tenant>>('/tenants/me');
  return response.data.data;
}

export async function updateTenant(payload: UpdateTenantInput): Promise<Tenant> {
  const response = await api.put<ApiSuccessResponse<Tenant>>('/tenants/me', payload);
  return response.data.data;
}
