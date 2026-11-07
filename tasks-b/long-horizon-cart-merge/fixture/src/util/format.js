/** Display helpers. Money is integer cents everywhere inside; strings only at the edge. */
export function formatCents(cents) {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const frac = String(abs % 100).padStart(2, '0')
  return `${sign}$${whole}.${frac}`
}
