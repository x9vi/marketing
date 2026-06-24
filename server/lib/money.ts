export function toNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as { toNumber?: () => number }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value ?? 0);
}

export function currencyFormatter(currencyCode: string) {
  return new Intl.NumberFormat('ar-IQ', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0
  });
}
