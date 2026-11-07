/**
 * swiss — public surface.
 *
 * Everything the league office, the pairings display and the results desk are
 * allowed to import. Modules under src/ that are not re-exported here are
 * internal and may be reorganised freely; the names below may not.
 */
import { Tournament } from './tournament.js'

export { Tournament } from './tournament.js'

/** A new event with an empty roster. */
export function createTournament() {
  return new Tournament()
}
