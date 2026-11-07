/**
 * Format a signed cent amount for display: -1234 -> '-12.34', 50 -> '0.50'.
 * Integer arithmetic only; used by the summary screen.
 */
export function formatCents(cents) {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const frac = String(abs % 100).padStart(2, '0')
  return sign + whole + '.' + frac
}
