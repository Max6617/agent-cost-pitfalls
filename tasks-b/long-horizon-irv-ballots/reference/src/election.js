import { validateBallot } from './validate.js'
import { BallotStore } from './store.js'
import { tallyElection } from './tally.js'

/**
 * A ranked-choice election. Ballots arrive over time - the service ingests a
 * ballot here, a batch there - and the count is read off with tally().
 */
export class Election {
  constructor({ candidates } = {}) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new TypeError('an election needs at least one candidate')
    }
    if (new Set(candidates).size !== candidates.length) {
      throw new TypeError('candidate ids must be unique')
    }
    this.field = candidates.slice()
    this.fieldSet = new Set(candidates)
    this.store = new BallotStore()
    this._tally = null
  }

  /**
   * Take one ballot. Returns { id, status } - 'accepted', 'invalid' or
   * 'duplicate'; see docs/tally-rules.md for what each means.
   */
  addBallot(ballot) {
    const check = validateBallot(ballot, this.fieldSet)
    if (!check.ok) return { id: ballot && ballot.id ? ballot.id : null, status: 'invalid', reason: check.reason }
    if (!this.store.add(ballot)) return { id: ballot.id, status: 'duplicate' }
    this._tally = null
    return { id: ballot.id, status: 'accepted' }
  }

  addBallots(ballots) {
    return ballots.map((ballot) => this.addBallot(ballot))
  }

  /** How many ballots have been accepted. */
  ballotCount() {
    return this.store.size
  }

  /** The count. Tallies are expensive, so the result is remembered. */
  tally() {
    if (this._tally === null) this._tally = tallyElection(this.field, this.store.all())
    return this._tally
  }
}
