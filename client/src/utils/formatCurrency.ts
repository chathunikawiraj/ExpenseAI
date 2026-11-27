const DEFAULT_CURRENCY = 'LKR';

export const formatCurrency = (amount: number, currency = DEFAULT_CURRENCY): string => {
  const normalizedCurrency = currency.trim().toUpperCase();
  const safeCurrency = /^[A-Z]{3}$/.test(normalizedCurrency)
    ? normalizedCurrency
    : DEFAULT_CURRENCY;

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: safeCurrency,
  }).format(amount);
};
