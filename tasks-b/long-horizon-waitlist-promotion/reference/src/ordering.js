/**
 * Waitlist ordering.
 *
 * The docs are unambiguous about how the line is ordered; this module is the
 * only place that decides it. Positions are 1-based: position 1 is the head
 * of the waitlist.
 */
export const TIER_RANK = { priority: 0, standard: 1 }

/** Anything that is not a paid 'priority' member waits as 'standard'. */
export function normalizeTier(tier) {
  return tier === 'priority' ? 'priority' : 'standard'
}

export function compareEntries(a, b) {
  // tier first; arrival order decides inside a tier
  if (TIER_RANK[a.tier] !== TIER_RANK[b.tier]) return TIER_RANK[a.tier] - TIER_RANK[b.tier]
  return a.seq - b.seq
}
