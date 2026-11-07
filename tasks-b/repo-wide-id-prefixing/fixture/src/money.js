/**
 * money - the decimal-string <-> cents helper for the money fields.
 *
 * Amounts cross the public surface as decimal strings with exactly two places
 * ('10.00') so they never pick up binary floating point error; records hold
 * integer cents.
 */

const AMOUNT = /^(\d+)\.(\d{2})$/

export function toCents(amount) {
  const m = typeof amount === 'string' ? AMOUNT.exec(amount) : null
  if (m === null) {
    throw new RangeError('an amount is a decimal string with exactly two places: ' + String(amount))
  }
  return Number(m[1]) * 100 + Number(m[2])
}

export function fromCents(cents) {
  const whole = Math.floor(cents / 100)
  const part = cents - whole * 100
  return String(whole) + '.' + String(part).padStart(2, '0')
}
