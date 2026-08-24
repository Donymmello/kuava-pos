import { useEffect } from 'react';

export type ShortcutHandlers = Partial<Record<'F2' | 'F9' | 'Escape', (event: KeyboardEvent) => void>>;

/**
 * Regista atalhos de teclado globais para o ecrã de Ponto de Venda:
 * F2 (focar busca), F9 (finalizar venda) e Esc (limpar carrinho).
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const handler = handlers[event.key as keyof ShortcutHandlers];
      if (!handler) {
        return;
      }
      event.preventDefault();
      handler(event);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
