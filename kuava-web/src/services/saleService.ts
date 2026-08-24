import { api } from './api';
import { ApiSuccessResponse, MobileMoneyFlow, PaginatedResult, PaymentMethod, Sale } from '../types';

export interface RegisterSalePayload {
  payment_method: PaymentMethod;
  items: Array<{ product_id: string; quantity: number }>;
  /** Chave de idempotência opcional — usada ao sincronizar uma venda feita offline. */
  client_ref?: string;
  /** Obrigatório quando payment_method é MPESA/EMOLA — ver types/index.ts. */
  mobile_money_flow?: MobileMoneyFlow;
  /** Obrigatório quando mobile_money_flow é TRANSFER. */
  payment_reference?: string;
  /** Obrigatório quando mobile_money_flow é AGENT. */
  agent_margin_amount?: number;
}

export async function registerSale(payload: RegisterSalePayload): Promise<Sale> {
  const response = await api.post<ApiSuccessResponse<Sale>>('/sales', payload);
  return response.data.data;
}

export async function fetchSales(page = 1, pageSize = 50): Promise<PaginatedResult<Sale>> {
  const response = await api.get<ApiSuccessResponse<PaginatedResult<Sale>>>('/sales', {
    params: { page, pageSize },
  });
  return response.data.data;
}

export async function fetchSaleById(id: string): Promise<Sale> {
  const response = await api.get<ApiSuccessResponse<Sale>>(`/sales/${id}`);
  return response.data.data;
}

export async function cancelSale(id: string): Promise<Sale> {
  const response = await api.post<ApiSuccessResponse<Sale>>(`/sales/${id}/cancel`);
  return response.data.data;
}
