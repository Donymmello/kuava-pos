import { api } from './api';
import { ApiSuccessResponse, SuperadminTenant } from '../types';

export async function fetchAllTenants(): Promise<SuperadminTenant[]> {
  const response = await api.get<ApiSuccessResponse<SuperadminTenant[]>>('/superadmin/tenants');
  return response.data.data;
}

export async function setTenantActive(tenantId: string, isActive: boolean): Promise<SuperadminTenant> {
  const response = await api.put<ApiSuccessResponse<SuperadminTenant>>(`/superadmin/tenants/${tenantId}`, {
    is_active: isActive,
  });
  return response.data.data;
}

export async function setTenantSubscriptionActive(
  tenantId: string,
  active: boolean,
): Promise<SuperadminTenant> {
  const response = await api.put<ApiSuccessResponse<SuperadminTenant>>(`/superadmin/tenants/${tenantId}`, {
    subscription_active: active,
  });
  return response.data.data;
}

export interface ResetAdminPasswordResult {
  temporaryPassword: string;
  adminEmails: string[];
}

export async function resetTenantAdminPassword(tenantId: string): Promise<ResetAdminPasswordResult> {
  const response = await api.post<ApiSuccessResponse<ResetAdminPasswordResult>>(
    `/superadmin/tenants/${tenantId}/reset-admin-password`,
  );
  return response.data.data;
}
