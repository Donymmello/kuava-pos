import { api } from './api';
import { ApiSuccessResponse, ProductLot } from '../types';

export interface ProductLotInput {
  quantity: number;
  /** "AAAA-MM-DD", ou null quando este lote não tem validade indicada. */
  expiry_date: string | null;
}

export async function fetchProductLots(productId: string): Promise<ProductLot[]> {
  const response = await api.get<ApiSuccessResponse<ProductLot[]>>(`/products/${productId}/lots`);
  return response.data.data;
}

export async function createProductLot(productId: string, payload: ProductLotInput): Promise<ProductLot> {
  const response = await api.post<ApiSuccessResponse<ProductLot>>(`/products/${productId}/lots`, payload);
  return response.data.data;
}

export async function deleteProductLot(productId: string, lotId: string): Promise<void> {
  await api.delete(`/products/${productId}/lots/${lotId}`);
}
