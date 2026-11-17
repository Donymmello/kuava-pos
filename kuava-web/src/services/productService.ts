import { api } from './api';
import { ApiSuccessResponse, PaginatedResult, Product, ProductUnit } from '../types';

export interface ProductInput {
  name: string;
  barcode?: string | null;
  price: number;
  cost_price?: number;
  stock_quantity?: number;
  min_stock_alert?: number;
  tax_rate?: number;
  category?: string | null;
  unit?: ProductUnit;
  /** "AAAA-MM-DD", ou null para remover a validade. */
  expiry_date?: string | null;
  is_active?: boolean;
  tracks_batches?: boolean;
}

export interface FetchProductsParams {
  search?: string;
  category?: string;
  status?: 'all' | 'active' | 'inactive';
  activeOnly?: boolean;
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  startDate?: string;
  endDate?: string;
  sortBy?: 'name' | 'created_at' | 'price' | 'stock_quantity' | 'expiry_date';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  pageSize?: number;
}

export async function fetchProductsPaginated(
  params: FetchProductsParams = {},
): Promise<PaginatedResult<Product>> {
  const queryParams: Record<string, unknown> = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 50,
  };

  if (params.search?.trim()) queryParams.search = params.search.trim();
  if (params.category && params.category !== 'all') queryParams.category = params.category;
  if (params.status) queryParams.status = params.status;
  if (params.activeOnly !== undefined) queryParams.activeOnly = params.activeOnly;
  if (params.stockStatus && params.stockStatus !== 'all') queryParams.stockStatus = params.stockStatus;
  if (params.startDate) queryParams.startDate = params.startDate;
  if (params.endDate) queryParams.endDate = params.endDate;
  if (params.sortBy) queryParams.sortBy = params.sortBy;
  if (params.sortOrder) queryParams.sortOrder = params.sortOrder;

  const response = await api.get<ApiSuccessResponse<PaginatedResult<Product>>>('/products', {
    params: queryParams,
  });
  return response.data.data;
}

export async function fetchCategories(): Promise<string[]> {
  const response = await api.get<ApiSuccessResponse<string[]>>('/products/categories');
  return response.data.data;
}

export async function fetchAllActiveProducts(): Promise<Product[]> {
  let page = 1;
  const pageSize = 1000;
  let allItems: Product[] = [];

  while (true) {
    const result = await fetchProductsPaginated({
      activeOnly: true,
      status: 'active',
      page,
      pageSize,
    });
    allItems = allItems.concat(result.items);
    if (allItems.length >= result.pagination.total || result.items.length === 0) {
      break;
    }
    page += 1;
  }

  return allItems;
}

export async function fetchProducts(search?: string, activeOnly = true): Promise<Product[]> {
  const result = await fetchProductsPaginated({
    search,
    activeOnly,
    status: activeOnly ? 'active' : 'all',
    pageSize: 1000,
  });
  return result.items;
}

export async function fetchProductByBarcode(barcode: string): Promise<Product> {
  const response = await api.get<ApiSuccessResponse<Product>>(
    `/products/barcode/${encodeURIComponent(barcode)}`,
  );
  return response.data.data;
}

export interface AddStockPayload {
  quantity: number;
  cost_price?: number;
  expiry_date?: string | null;
}

export async function addProductStock(id: string, payload: AddStockPayload): Promise<Product> {
  const response = await api.post<ApiSuccessResponse<Product>>(`/products/${id}/stock`, payload);
  return response.data.data;
}

export async function createProduct(payload: ProductInput): Promise<Product & { message?: string }> {
  const response = await api.post<ApiSuccessResponse<Product>>('/products', payload);
  const product = response.data.data;
  return Object.assign(product, { message: response.data.message });
}

export async function updateProduct(id: string, payload: Partial<ProductInput>): Promise<Product> {
  const response = await api.put<ApiSuccessResponse<Product>>(`/products/${id}`, payload);
  return response.data.data;
}

export async function deactivateProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}
