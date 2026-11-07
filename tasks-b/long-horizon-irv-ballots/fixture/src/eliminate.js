/**
 * Who leaves the race: the candidate with the fewest preferences this round.
 */
export function pickElimination(counts) {
  let loser = null
  let lowest = Infinity
  for (const [id, n] of counts) {
    if (n < lowest) {
      lowest = n
      loser = id
    }
  }
  return loser
}
