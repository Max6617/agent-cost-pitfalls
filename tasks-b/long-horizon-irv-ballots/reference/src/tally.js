import { countRound } from './rounds.js'
import { majorityNeeded } from './majority.js'
import { pickElimination } from './eliminate.js'

/**
 * Run the instant-runoff count over the accepted ballots. Never more rounds
 * than there are candidates: each round either crowns a winner or strikes
 * one candidate from the field.
 */
export function tallyElection(field, ballots) {
  const rounds = []
  const excluded = new Set()

  for (let roundNo = 1; roundNo <= field.length; roundNo++) {
    const { counts, continuing } = countRound(ballots, excluded)
    if (continuing === 0) break
    for (const id of field) {
      if (!excluded.has(id) && !counts.has(id)) counts.set(id, 0)
    }
    const majority = majorityNeeded({ accepted: ballots.length, continuing })
    const winner = [...counts].find(([, n]) => n >= majority)?.[0] ?? null
    if (winner !== null) {
      rounds.push({ round: roundNo, counts: Object.fromEntries(counts), continuing, majority, eliminated: [], winner })
      return { winner, rounds }
    }
    const loser = pickElimination(counts, ballots, excluded)
    rounds.push({ round: roundNo, counts: Object.fromEntries(counts), continuing, majority, eliminated: [loser], winner: null })
    excluded.add(loser)
  }

  return { winner: null, rounds }
}
