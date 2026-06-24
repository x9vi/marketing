export function formatCurrency(value: number | string | undefined, currencyCode = 'IQD') {
  const numeric = typeof value === 'string' ? Number(value) : value ?? 0;
  return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(numeric);
}

export function formatDate(value: string | number | Date) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}
