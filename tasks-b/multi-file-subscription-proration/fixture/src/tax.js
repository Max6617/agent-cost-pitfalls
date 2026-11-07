/**
 * Tax. Rates are in basis points (875 = 8.75%). taxCents is exact: the tax on
 * an amount is rounded half-up to the whole cent, once, on the exact value.
 */
export function taxCents(amountCents, basisPoints) {
  if (amountCents <= 0) return 0
  return Math.floor((2 * amountCents * basisPoints + 10000) / 20000)
}
