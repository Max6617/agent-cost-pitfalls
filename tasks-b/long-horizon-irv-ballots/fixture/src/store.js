/**
 * The ballots an election has accepted, keyed by ballot id. A ballot id is
 * stable for the life of the ballot, so an id already in the store is that
 * same ballot arriving again.
 */
export class BallotStore {
  constructor() {
    this.byId = new Map()
  }

  has(id) {
    return this.byId.has(id)
  }

  /** False when the id is already stored; the first ballot stands. */
  add(ballot) {
    if (this.byId.has(ballot.id)) return false
    this.byId.set(ballot.id, ballot)
    return true
  }

  get size() {
    return this.byId.size
  }

  all() {
    return [...this.byId.values()]
  }
}
