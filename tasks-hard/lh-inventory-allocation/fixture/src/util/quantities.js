/**
 * Unit counts.
 *
 * Everything in the engine is a whole number of units. A fractional or
 * non-numeric count is a caller error and is refused loudly rather than rounded
 * to something the warehouse cannot pick.
 */

export function isWhole(value) {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)
}

export function requireQty(value, what = 'quantity') {
  if (!isWhole(value)) {
    throw new TypeError(what + ' must be a whole number of units, got ' + String(value))
  }
  return value
}

export function requirePositiveQty(value, what = 'quantity') {
  const qty = requireQty(value, what)
  if (qty <= 0) throw new RangeError(what + ' must be greater than zero, got ' + qty)
  return qty
}

/** Display form used by the console and the pick sheets. */
export function formatQty(value) {
  return requireQty(value) + 'u'
}
