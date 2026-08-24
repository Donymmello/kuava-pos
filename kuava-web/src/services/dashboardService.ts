import { api } from './api';
import { ApiSuccessResponse, DashboardSummary } from '../types';

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await api.get<ApiSuccessResponse<DashboardSummary>>('/dashboard/summary');
  return response.data.data;
}
