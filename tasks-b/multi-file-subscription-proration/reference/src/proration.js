/**
 * Proration: scaling an amount by the fraction of a billing period that
 * remains, rounded half-up to whole cents on the exact value.
 */

/**
 * proratedCents(amountCents, remainingDays, periodDays) is amountCents scaled
 * by remainingDays / periodDays. The rounding is half-up on the exact rational
 * value, done in integer arithmetic so a value like 899.5 can never fall below
 * the tie in binary floating point.
 */
export function proratedCents(amountCents, remainingDays, periodDays) {
  if (periodDays <= 0) throw new Error('periodDays must be positive')
  if (remainingDays <= 0) return 0
  if (remainingDays >= periodDays) return amountCents
  return Math.floor((2 * amountCents * remainingDays + periodDays) / (2 * periodDays))
}
