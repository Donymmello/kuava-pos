/**
 * Formata uma quantidade para exibição, removendo zeros à direita
 * desnecessários (2 em vez de 2.000, 2.5 em vez de 2.500), quantidades
 * fracionárias (produtos vendidos por kg/g/l/m, ver ProductUnit) são
 * guardadas com até 3 casas decimais, mas isso não deve aparecer sempre.
 */
export function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pt-MZ', { maximumFractionDigits: 3 }).format(value);
}
