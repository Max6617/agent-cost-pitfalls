import { RATES } from './tables.js'
import { roundMoney } from './money.js'

/**
 * Currency conversion.
 *
 * The table is quoted as units of the target currency per one USD, so the
 * multiply/divide direction matters and getting it backwards is invisible until
 * someone reconciles a foreign-currency invoice.
 */

/** The rate for a currency, or null when treasury has not published one. */
export function rateFor(currency) {
  return RATES[currency] ?? null
}

/**
 * Convert `amount` from `from` into `to`.
 *
 * Converting to the same currency is a no-op: the amount is returned exactly as
 * it arrived, not re-rounded.
 *
 * @param {number} amount
 * @param {string} from
 * @param {string} to
 */
export function convert(amount, from, to) {
  if (from === to) return amount
  const rate = rateFor(to)
  if (rate == null) throw new Error('no published rate for ' + to)
  return amount * rate
}

/** Convert and round in one step, for display only. */
export function convertAndRound(amount, from, to, dp) {
  return roundMoney(convert(amount, from, to), dp)
}
