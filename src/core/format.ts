// Single source of truth for NOK currency formatting, so no two screens
// round or display amounts differently.
const currencyFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK',
  maximumFractionDigits: 0,
})

export function formatCurrencyNOK(amount: number): string {
  return currencyFormatter.format(amount)
}
