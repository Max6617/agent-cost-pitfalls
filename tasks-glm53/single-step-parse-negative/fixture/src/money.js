/**
 * Money handling for the storefront.
 *
 * Amounts are read back from the payment provider as free-form strings, so the
 * parser has to cope with a few shapes we have seen in the wild:
 *
 *   "$12.50"      standard
 *   "1,234.56"    thousands separator
 *   "-12.50"      an adjustment / refund line
 *   "(12.50)"     accounting negative, what the legacy till emits
 *   " 12.50 USD"  padded, with a trailing currency code
 *
 * Internally everything is a plain number of currency units. We deliberately do
 * NOT use integer cents: the reporting layer rounds at the end and the finance
 * team has signed off on that.
 */

const CURRENCY_CHARS = /[^0-9.\-]/g

/**
 * Parse an amount as printed by the provider or the till.
 *
 * @param {string|number} value
 * @returns {number} the amount; NaN when it cannot be read
 */
export function parseAmount(value) {
  if (typeof value === 'number') return value
  if (value == null) return NaN
  const text = String(value).trim()
  if (!text) return NaN
  const digits = text.replace(CURRENCY_CHARS, '')
  return parseFloat(digits)
}

/** Round to the currency's two decimal places. */
export function roundMoney(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

/**
 * Render an amount the way the invoice template wants it.
 * Negative amounts keep their sign in front of the symbol: "-$4.00".
 */
export function formatMoney(amount, symbol = '$') {
  const n = roundMoney(amount)
  const sign = n < 0 ? '-' : ''
  return sign + symbol + Math.abs(n).toFixed(2)
}

/** Sum a list of amounts, rounding only at the end. */
export function sumAmounts(amounts) {
  return roundMoney(amounts.reduce((total, a) => total + a, 0))
}
