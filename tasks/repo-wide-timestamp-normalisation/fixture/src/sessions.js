/**
 * Session records.
 *
 * A session has a start and an optional end. Durations are computed from the
 * stored timestamps, never from a running clock.
 */
import { toTimestamp, parseTimestamp } from './timestamps.js'

export class Sessions {
  constructor({ clock = () => Date.now() } = {}) {
    this.clock = clock
    this.byId = new Map()
  }

  start(id, actor) {
    const session = { id, actor, startedAt: new Date(this.clock()).toUTCString(), endedAt: null }
    this.byId.set(id, session)
    return session
  }

  end(id) {
    const session = this.byId.get(id)
    if (!session) return null
    session.endedAt = toTimestamp(this.clock())
    return session
  }

  /** Duration in milliseconds, or null while the session is open. */
  durationOf(id) {
    const session = this.byId.get(id)
    if (!session || !session.endedAt) return null
    const from = parseTimestamp(session.startedAt)
    const to = parseTimestamp(session.endedAt)
    if (!from || !to) return null
    return to.getTime() - from.getTime()
  }

  /** Sessions that were still open at a given instant. */
  openAt(instant) {
    const at = parseTimestamp(instant)
    if (!at) return []
    return [...this.byId.values()].filter((s) => {
      const from = parseTimestamp(s.startedAt)
      const to = s.endedAt ? parseTimestamp(s.endedAt) : null
      return from && from <= at && (!to || to > at)
    })
  }
}
