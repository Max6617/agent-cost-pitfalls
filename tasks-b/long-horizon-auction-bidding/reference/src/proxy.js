/**
 * Settles a proxy contest.
 *
 * Every bid carries a ceiling (`max`, defaulting to the bid amount) — the most
 * that bidder will pay. When two ceilings contest a lot the service bids on
 * each bidder's behalf, up to their ceiling, and the winner is left holding
 * the lot at the settled price.
 */
export function settlePrice(winner, loser, increment) {
  // the winner pays only what is needed to beat the loser, capped at their ceiling
  return Math.min(winner.max, loser.max + increment)
}
