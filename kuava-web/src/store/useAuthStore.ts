import { create } from 'zustand';
import {
  login as loginRequest,
  register as registerRequest,
  RegisterInput,
} from '../services/authService';
import { clearSession, getStoredUser, saveSession, SESSION_EXPIRED_EVENT } from '../utils/session';
import { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const result = await loginRequest(email, password);
      saveSession(result.token, result.user);
      set({ user: result.user, isLoading: false });
      return true;
    } catch (error) {
      // O backend já distingue senha errada de motivos de conta/negócio
      // (estabelecimento desativado, trial de 7 dias terminado sem plano
      // ativo — ver authService.login()) com mensagens diferentes; mostrar
      // sempre a mesma frase genérica escondia isso do utilizador, que via
      // "credenciais inválidas" mesmo quando o problema era não ter pago.
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Credenciais inválidas. Verifique o email e a senha.';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  register: async (input) => {
    set({ isLoading: true, error: null });

    try {
      const result = await registerRequest(input);
      saveSession(result.token, result.user);
      set({ user: result.user, isLoading: false });
      return true;
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Não foi possível registar o estabelecimento. Tente novamente.';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  logout: () => {
    clearSession();
    set({ user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));

// Uma resposta 401 da API (token expirado/inválido) despoleta este evento a
// partir do interceptor do axios (src/services/api.ts); aqui limpamos a
// sessão guardada para que as rotas protegidas redirecionem para o login.
window.addEventListener(SESSION_EXPIRED_EVENT, () => {
  useAuthStore.setState({ user: null });
});
