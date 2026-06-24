export function toNumber(value) {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string')
        return Number(value);
    if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
        return value.toNumber();
    }
    return Number(value ?? 0);
}
export function currencyFormatter(currencyCode) {
    return new Intl.NumberFormat('ar-IQ', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0
    });
}
