import { create } from 'zustand';
import { fetchSubscriptionStatus } from '../services/subscriptionService';
import { SubscriptionStatus } from '../types';

interface SubscriptionState {
  status: SubscriptionStatus | null;
  isLoading: boolean;
  /** true só depois da primeira tentativa (com sucesso ou não), para o guard saber quando decidir. */
  hasLoaded: boolean;
  refresh: () => Promise<void>;
}

/**
 * Estado de assinatura do tenant do utilizador atual, usado por
 * SubscriptionGuard (para bloquear as páginas normais quando não há acesso)
 * e por SubscriptionPage (para mostrar o estado e o pedido pendente, se
 * houver). Um SUPERADMIN nunca chama isto, não tem tenant.
 */
export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  status: null,
  isLoading: false,
  hasLoaded: false,

  refresh: async () => {
    set({ isLoading: true });
    try {
      const status = await fetchSubscriptionStatus();
      set({ status, isLoading: false, hasLoaded: true });
    } catch {
      // Falha a buscar o estado (ex.: rede em baixo): status fica null, e o
      // guard trata null como "não bloquear" (falha aberta) — a aplicação
      // real do bloqueio já está no backend (requireActiveSubscription nas
      // rotas de negócio), não vale a pena trancar alguém fora da app só
      // porque este pedido específico falhou.
      set({ status: null, isLoading: false, hasLoaded: true });
    }
  },
}));
