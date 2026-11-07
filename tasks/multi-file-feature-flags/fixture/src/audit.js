/**
 * Flag changes are audited.
 *
 * One entry per change, with the actor and the moment. The log is what answers
 * "who turned this on and when" during an incident, so entries are never
 * rewritten or removed.
 */
import { toTimestamp } from './clock.js'

export class FlagAudit {
  constructor({ clock = () => Date.now() } = {}) {
    this.entries = []
    this.clock = clock
  }

  record(action, flag, actor, details = {}) {
    const entry = { at: new Date(this.clock()).toUTCString(), action, flag, actor, details }
    this.entries.push(entry)
    return entry
  }

  /** Every change to one flag, oldest first. */
  history(flag) {
    return this.entries.filter((e) => e.flag === flag)
  }

  /** Who last changed this flag? */
  lastActor(flag) {
    const history = this.history(flag)
    return history.length ? history[history.length - 1].actor : null
  }
}
