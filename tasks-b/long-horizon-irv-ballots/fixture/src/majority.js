/**
 * The bar a candidate must reach to win a round: strictly more than half of
 * the ballots in the count. Exactly half is not a majority.
 */
export function majorityNeeded({ accepted, continuing }) {
  return Math.floor(accepted / 2) + 1
}
