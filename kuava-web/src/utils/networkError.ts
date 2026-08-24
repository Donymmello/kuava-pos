interface AxiosLikeError {
  isAxiosError?: boolean;
  response?: unknown;
}

/**
 * Verdadeiro quando o erro indica falta de ligação ou servidor inacessível
 * (o axios não recebeu resposta alguma) — distingue de uma rejeição
 * legítima da API (stock insuficiente, validação, permissões, etc.), que
 * deve continuar a ser mostrada ao utilizador em vez de cair para o modo
 * offline.
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as AxiosLikeError;
  return candidate.isAxiosError === true && !candidate.response;
}

export function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message;
  }
  return undefined;
}
