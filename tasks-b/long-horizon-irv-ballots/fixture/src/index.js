/**
 * tallyboard - public surface.
 *
 * Everything callers are allowed to import. Modules under src/ that are not
 * re-exported here are internal and may be reorganised freely; the names below
 * may not.
 */
import { Election } from './election.js'

export { Election } from './election.js'
export { validateBallot } from './validate.js'
export { BallotStore } from './store.js'
export { countRound } from './rounds.js'
export { majorityNeeded } from './majority.js'
export { pickElimination } from './eliminate.js'
export { tallyElection } from './tally.js'

/**
 * An election over a fixed field of candidate ids.
 *
 *   const election = createElection({ candidates: ['ada', 'bob', 'cy'] })
 *   election.addBallot({ id: 'b-1', ranks: ['ada', 'bob'] })
 *   election.tally()   // { winner, rounds }
 */
export function createElection(options) {
  return new Election(options)
}
