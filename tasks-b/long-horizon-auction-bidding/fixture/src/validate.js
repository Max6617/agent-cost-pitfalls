/**
 * Shape checks for an incoming bid. Anything structural is decided here,
 * before the auction's own rules (increments, ceilings, deadlines) apply.
 */
export function validateBid({ bidder, amount, max }) {
  if (typeof bidder !== 'string' || bidder.length === 0) return 'invalid'
  if (!Number.isInteger(amount) || amount < 0) return 'invalid'
  if (max !== undefined && max !== null && (!Number.isInteger(max) || max < amount)) return 'invalid'
  return null
}
