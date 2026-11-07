/**
 * One round of the count: every ballot counts one preference for the
 * highest-ranked candidate who is not excluded, and a ballot with nobody
 * left to count for sits the round out.
 *
 * Returns { counts, continuing }: counts maps candidate -> preferences, in
 * the order candidates first received one; continuing is the number of
 * ballots that counted.
 */
export function countRound(ballots, excluded) {
  const counts = new Map()
  let continuing = 0
  for (const ballot of ballots) {
    const pick = ballot.ranks.find((id) => !excluded.has(id))
    if (pick === undefined) continue
    counts.set(pick, (counts.get(pick) ?? 0) + 1)
    continuing++
  }
  return { counts, continuing }
}
