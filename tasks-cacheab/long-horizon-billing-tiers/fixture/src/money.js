import { SETTINGS } from './tables.js'

/**
 * Money rounding.
 *
 * Half-up to `dp` places. The naive `Math.round(value * 10**dp) / 10**dp` is
 * wrong for the classic cases — `Math.round(1.005 * 100)` is 100, not 101 —
 * because 1.005 is stored as 1.00499999999999989. Nudging by a relative epsilon
 * before scaling is what makes the half-up rule the customer expects.
 */

/**
 * Round half-up to `dp` decimal places.
 *
 * @param {number} value
 * @param {number} dp
 */
export function roundMoney(value, dp = SETTINGS.roundingDp) {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** dp
  return Math.round(value * factor + (value >= 0 ? 1 : -1) * Number.EPSILON * value * factor) / factor
}

/**
 * Round a list of amounts, then sum — the shape an invoice line grid wants.
 *
 * Only used for display. The figures that get charged are computed from exact
 * amounts and rounded once at the end.
 */
export function roundAndSum(amounts, dp = SETTINGS.roundingDp) {
  return amounts.reduce((total, a) => total + roundMoney(a, dp), 0)
}

/** Two amounts equal at invoice precision? */
export function sameMoney(a, b, dp = SETTINGS.roundingDp) {
  return roundMoney(a, dp) === roundMoney(b, dp)
}
