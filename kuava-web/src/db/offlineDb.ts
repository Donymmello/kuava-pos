import Dexie, { Table } from 'dexie';
import { MobileMoneyFlow, PaymentMethod, Product, Tenant } from '../types';

export interface PendingSaleItem {
  product_id: string;
  quantity: number;
}

export type PendingSaleStatus = 'pending' | 'syncing' | 'error';

/** Uma venda registada no POS enquanto offline, à espera de sincronizar. */
export interface PendingSale {
  localId?: number;
  /** Chave de idempotência — evita duplicar a venda se a sincronização for repetida. */
  clientRef: string;
  paymentMethod: PaymentMethod;
  items: PendingSaleItem[];
  createdAt: string;
  status: PendingSaleStatus;
  errorMessage?: string;
  /** Só preenchidos quando paymentMethod é MPESA/EMOLA — ver types/index.ts. */
  mobileMoneyFlow?: MobileMoneyFlow;
  paymentReference?: string;
  agentMarginAmount?: number;
}

interface CachedTenant extends Tenant {
  cacheKey: 'current';
}

/**
 * Base de dados local (IndexedDB, via Dexie) usada para operação offline-first
 * no balcão: cache do catálogo de produtos para pesquisa/venda sem rede, fila
 * de vendas por sincronizar, e cache dos dados do estabelecimento (para o
 * cabeçalho da fatura/recibo mesmo sem ligação).
 */
class OfflineDatabase extends Dexie {
  products!: Table<Product, string>;
  pendingSales!: Table<PendingSale, number>;
  tenant!: Table<CachedTenant, string>;

  constructor() {
    super('kuava-pos-offline');
    this.version(1).stores({
      products: 'id, barcode, name',
      pendingSales: '++localId, clientRef, status, createdAt',
      tenant: 'cacheKey',
    });
  }
}

export const offlineDb = new OfflineDatabase();

export async function cacheProducts(products: Product[]): Promise<void> {
  await offlineDb.transaction('rw', offlineDb.products, async () => {
    await offlineDb.products.clear();
    await offlineDb.products.bulkPut(products);
  });
}

export async function getCachedProducts(): Promise<Product[]> {
  return offlineDb.products.toArray();
}

/**
 * Dá baixa de stock na cache local depois de registar uma venda offline, para
 * que vendas seguintes na mesma sessão (ainda sem ligação) não vendam stock
 * que já foi comprometido localmente.
 */
export async function decrementCachedStock(items: PendingSaleItem[]): Promise<void> {
  await offlineDb.transaction('rw', offlineDb.products, async () => {
    for (const item of items) {
      const product = await offlineDb.products.get(item.product_id);
      if (product) {
        await offlineDb.products.update(item.product_id, {
          stock_quantity: Math.max(0, product.stock_quantity - item.quantity),
        });
      }
    }
  });
}

export async function cacheTenant(tenant: Tenant): Promise<void> {
  await offlineDb.tenant.put({ ...tenant, cacheKey: 'current' });
}

export async function getCachedTenant(): Promise<Tenant | null> {
  const record = await offlineDb.tenant.get('current');
  if (!record) {
    return null;
  }
  const { cacheKey: _cacheKey, ...tenant } = record;
  return tenant;
}
