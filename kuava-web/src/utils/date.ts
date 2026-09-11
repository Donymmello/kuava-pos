export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'short' }).format(date);
}
