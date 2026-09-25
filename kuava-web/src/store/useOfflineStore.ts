import { create } from 'zustand';
import { offlineDb, PendingSale } from '../db/offlineDb';
import { registerSale, RegisterSalePayload } from '../services/saleService';
import { extractErrorMessage, isNetworkError } from '../utils/networkError';
import { useAuthStore } from './useAuthStore';
import { UserRole } from '../types';

interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  /** Regista os listeners de online/offline e tenta sincronizar uma vez. Chamar só uma vez, ao arrancar a app. */
  init: () => void;
  refreshPendingCount: () => Promise<void>;
  /** Guarda uma venda localmente para sincronizar mais tarde; devolve o registo criado (com a chave de idempotência). */
  queueSale: (payload: RegisterSalePayload) => Promise<PendingSale>;
  /** Tenta enviar todas as vendas pendentes para o servidor. Para na primeira falha de rede (ainda sem ligação). */
  syncNow: () => Promise<{ synced: number; failed: number }>;
}

let listenersRegistered = false;

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: navigator.onLine,
  pendingCount: 0,
  isSyncing: false,

  init: () => {
    get().refreshPendingCount();

    if (listenersRegistered) {
      return;
    }
    listenersRegistered = true;

    window.addEventListener('online', () => {
      set({ isOnline: true });
      get().syncNow();
    });
    window.addEventListener('offline', () => set({ isOnline: false }));

    if (navigator.onLine) {
      get().syncNow();
    }
  },

  refreshPendingCount: async () => {
    const count = await offlineDb.pendingSales.count();
    set({ pendingCount: count });
  },

  queueSale: async (payload) => {
    const clientRef =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const pendingSale: PendingSale = {
      clientRef,
      paymentMethod: payload.payment_method,
      items: payload.items,
      createdAt: new Date().toISOString(),
      status: 'pending',
      paymentReference: payload.payment_reference,
    };

    const localId = await offlineDb.pendingSales.add(pendingSale);
    await get().refreshPendingCount();
    return { ...pendingSale, localId };
  },

  syncNow: async () => {
    if (get().isSyncing) {
      return { synced: 0, failed: 0 };
    }

    // Sincronizar vendas offline só faz sentido para um utilizador de um
    // estabelecimento (tenant), um SUPERADMIN nunca tem tenant_id, por isso
    // qualquer venda pendente aqui é sempre "lixo" de testes anteriores numa
    // sessão diferente. Tentar sincronizá-la geraria um 403 do
    // tenantMiddleware; isto é só uma segunda camada de proteção (a
    // verdadeira correção é o tenantMiddleware devolver 403 em vez de 401,
    // ver kuava-api/src/middlewares/tenantMiddleware.ts).
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || currentUser.role === UserRole.SUPERADMIN) {
      return { synced: 0, failed: 0 };
    }

    set({ isSyncing: true });
    let synced = 0;
    let failed = 0;

    try {
      // 'syncing' entra aqui de propósito: esse estado é escrito mesmo antes
      // do envio, e se a app morrer nesse intervalo (recarregamento, separador
      // fechado, tablet sem bateria) a venda ficava presa nele para sempre —
      // não estava em 'pending' nem em 'error', e nada a voltava a apanhar.
      // Um 'syncing' que sobreviva a um arranque é, por definição, obsoleto:
      // nenhuma sincronização decorre num processo que já não existe.
      // Reenviar é seguro porque o client_ref é chave de idempotência — se a
      // venda chegou mesmo a ser gravada, o servidor devolve a existente em
      // vez de a duplicar (ver saleService.createSale).
      const pending = await offlineDb.pendingSales
        .where('status')
        .anyOf(['pending', 'error', 'syncing'])
        .toArray();

      for (const sale of pending) {
        try {
          await offlineDb.pendingSales.update(sale.localId as number, { status: 'syncing' });
          await registerSale({
            payment_method: sale.paymentMethod,
            items: sale.items,
            client_ref: sale.clientRef,
            payment_reference: sale.paymentReference,
          });
          await offlineDb.pendingSales.delete(sale.localId as number);
          synced += 1;
        } catch (error) {
          failed += 1;

          if (isNetworkError(error)) {
            // Ainda sem ligação, repõe o estado e não tenta as restantes agora.
            await offlineDb.pendingSales.update(sale.localId as number, { status: 'pending' });
            set({ isOnline: false });
            break;
          }

          // Rejeição real da API (ex.: produto entretanto desativado), fica
          // marcada como erro para o utilizador decidir o que fazer.
          await offlineDb.pendingSales.update(sale.localId as number, {
            status: 'error',
            errorMessage: extractErrorMessage(error) ?? 'Falha ao sincronizar esta venda',
          });
        }
      }
    } finally {
      await get().refreshPendingCount();
      set({ isSyncing: false });
    }

    return { synced, failed };
  },
}));
