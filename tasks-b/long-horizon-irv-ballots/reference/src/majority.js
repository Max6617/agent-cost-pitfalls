/**
 * The bar a candidate must reach to win a round: strictly more than half of
 * the ballots still in the count. Exactly half is not a majority.
 */
export function majorityNeeded({ accepted, continuing }) {
  return Math.floor(continuing / 2) + 1
}
