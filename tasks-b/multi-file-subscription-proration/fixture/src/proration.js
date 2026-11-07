/**
 * Proration: scaling an amount by the fraction of a billing period that
 * remains, rounded to whole cents.
 */
import { toDollars, dollarsToCents } from './money.js'

/**
 * proratedCents(amountCents, remainingDays, periodDays) is amountCents scaled
 * by remainingDays / periodDays, rounded to the nearest cent.
 */
export function proratedCents(amountCents, remainingDays, periodDays) {
  if (periodDays <= 0) throw new Error('periodDays must be positive')
  if (remainingDays <= 0) return 0
  if (remainingDays >= periodDays) return amountCents
  const exact = toDollars(amountCents) * (remainingDays / periodDays)
  return dollarsToCents(exact)
}
