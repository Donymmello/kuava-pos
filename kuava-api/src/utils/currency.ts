/**
 * Formata um valor numérico como Metical moçambicano (MZN).
 * Exemplo: formatMzn(1500) => "1.500,00 MT"
 */
export function formatMzn(value: number): string {
  const formatted = new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `${formatted} MT`;
}
