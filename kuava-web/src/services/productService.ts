import { api } from './api';
import { ApiSuccessResponse, PaginatedResult, Product } from '../types';

export interface ProductInput {
  name: string;
  barcode?: string | null;
  price: number;
  cost_price?: number;
  stock_quantity?: number;
  min_stock_alert?: number;
  tax_rate?: number;
  category?: string | null;
  is_active?: boolean;
}

export async function fetchProducts(search?: string, activeOnly = true): Promise<Product[]> {
  const response = await api.get<ApiSuccessResponse<PaginatedResult<Product>>>('/products', {
    params: { search, pageSize: 200, activeOnly },
  });
  return response.data.data.items;
}

export async function fetchProductByBarcode(barcode: string): Promise<Product> {
  const response = await api.get<ApiSuccessResponse<Product>>(
    `/products/barcode/${encodeURIComponent(barcode)}`,
  );
  return response.data.data;
}

export async function createProduct(payload: ProductInput): Promise<Product> {
  const response = await api.post<ApiSuccessResponse<Product>>('/products', payload);
  return response.data.data;
}

export async function updateProduct(id: string, payload: Partial<ProductInput>): Promise<Product> {
  const response = await api.put<ApiSuccessResponse<Product>>(`/products/${id}`, payload);
  return response.data.data;
}

export async function deactivateProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}
