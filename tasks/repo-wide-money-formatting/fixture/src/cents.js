/**
 * The single money formatting routine.
 *
 * Money travels through the app as an exact number of currency units and is
 * rounded exactly once, here, on the way out. Nothing else may build a currency
 * string by hand.
 */

/**
 * Round to `dp` places.
 *
 * @param {number} value
 * @param {number} dp
 */
export function round(value, dp = 2) {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** dp
  return Math.round(value * factor) / factor
}
/** Group the integer part in threes. */
function group(digits) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Render an amount.
 *
 * The sign always goes in front of the symbol: `-$4.00`, never `$-4.00`.
 *
 * @param {number} amount
 * @param {{ symbol?: string, dp?: number }} [options]
 */
export function format(amount, options = {}) {
  const symbol = options.symbol ?? '$'
  const dp = options.dp ?? 2
  const rounded = round(amount, dp)
  if (rounded === 0) return symbol + (0).toFixed(dp)

  const sign = rounded < 0 ? '-' : ''
  const [whole, fraction] = Math.abs(rounded).toFixed(dp).split('.')
  return sign + symbol + group(whole) + (fraction ? '.' + fraction : '')
}

/** Sum exact amounts, rounding once at the end. */
export function sum(amounts, dp = 2) {
  return round((amounts ?? []).reduce((total, a) => total + (Number(a) || 0), 0), dp)
}
/**
 * Split an amount into `parts` equal shares, distributing the remainder a cent
 * at a time so the shares add back up to the original.
 */
export function split(amount, parts, dp = 2) {
  if (!Number.isInteger(parts) || parts < 1) throw new Error('parts must be a positive integer')
  const total = round(amount, dp)
  const each = round(total / parts, dp)
  return new Array(parts).fill(each)
}
