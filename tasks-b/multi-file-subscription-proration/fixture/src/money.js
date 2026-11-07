/**
 * Money helpers. Amounts inside the service are integer cents; dollars only
 * ever appear for display, so the display helpers live here too.
 */
export function toDollars(cents) {
  return cents / 100
}

export function dollarsToCents(dollars) {
  return Math.round(Number(dollars.toFixed(2)) * 100)
}

export function formatCents(cents) {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const part = String(abs % 100).padStart(2, '0')
  return `${sign}$${whole}.${part}`
}
