/**
 * Who leaves the race: the fewest preferences this round. A tie is broken by
 * transfer count - the continuing ballots that rank the tied candidate below
 * the preference they currently count for, i.e. the support the candidate
 * still has coming - and then by candidate id; see docs/tally-rules.md.
 */
export function pickElimination(counts, ballots, excluded) {
  let lowest = Infinity
  for (const n of counts.values()) {
    if (n < lowest) lowest = n
  }
  const tied = [...counts.keys()].filter((id) => counts.get(id) === lowest)
  if (tied.length === 1) return tied[0]

  const transfers = new Map(tied.map((id) => [id, 0]))
  for (const ballot of ballots) {
    const at = ballot.ranks.findIndex((id) => !excluded.has(id))
    if (at === -1) continue
    for (let i = at + 1; i < ballot.ranks.length; i++) {
      if (transfers.has(ballot.ranks[i])) {
        transfers.set(ballot.ranks[i], transfers.get(ballot.ranks[i]) + 1)
      }
    }
  }

  let loser = tied[0]
  for (const id of tied) {
    if (transfers.get(id) < transfers.get(loser)) loser = id
    else if (transfers.get(id) === transfers.get(loser) && id < loser) loser = id
  }
  return loser
}
