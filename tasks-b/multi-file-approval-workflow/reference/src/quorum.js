/**
 * Quorum pools: k of the n named seats must approve. Every cast lands in
 * `approvals` as { seat, via, at } — the seat it fills and who actually cast
 * it — and the tier completes when `tally` reaches k.
 */

/** Has this seat already cast in the tier? */
export function hasVoted(tier, seat) {
  return tier.approvals.some((a) => a.seat === seat)
}

/**
 * Record an approval for `seat`, cast by `via`. A delegated approval fills
 * the delegator's seat and counts once, exactly like the member's own would —
 * `have` counts decided seats, never acts. Returns true when the tier has
 * reached k and is complete.
 */
export function castApproval(tier, seat, via, at) {
  tier.approvals.push({ seat, via, at })
  tier.tally += 1
  return tier.tally >= tier.k
}
