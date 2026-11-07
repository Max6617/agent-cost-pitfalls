/**
 * lifecycle - the shared status lifecycle, docs/status-lifecycle.md in code.
 *
 * One vocabulary, one transition map, one pair of errors for every board.
 * Boards accept the legacy spellings from the alias table on the way in and
 * store and emit only the canonical status.
 */

export class IllegalTransitionError extends Error {
  constructor(from, to) {
    super(`illegal transition: ${from} -> ${to}`)
    this.name = 'IllegalTransitionError'
    this.code = 'illegal-transition'
    this.from = from
    this.to = to
  }
}

export class UnknownStatusError extends Error {
  constructor(status) {
    super(`unknown status: ${status}`)
    this.name = 'UnknownStatusError'
    this.code = 'unknown-status'
    this.status = status
  }
}

export const STATUSES = [
  'open',
  'triaged',
  'in-progress',
  'on-hold',
  'resolved',
  'closed',
  'reopened',
  'cancelled',
]

export const TRANSITIONS = {
  open: ['triaged', 'cancelled'],
  triaged: ['in-progress', 'on-hold', 'cancelled'],
  'in-progress': ['on-hold', 'resolved', 'cancelled'],
  'on-hold': ['in-progress', 'cancelled'],
  reopened: ['triaged', 'in-progress', 'cancelled'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  cancelled: [],
}

export const ALIASES = {
  new: 'open',
  assessed: 'triaged',
  wip: 'in-progress',
  dispatched: 'in-progress',
  shipped: 'in-progress',
  paused: 'on-hold',
  held: 'on-hold',
  done: 'resolved',
  complete: 'resolved',
  shut: 'closed',
  archived: 'closed',
  reopen: 'reopened',
  void: 'cancelled',
  dropped: 'cancelled',
}

export function isCanonical(status) {
  return STATUSES.includes(status)
}

/** canonical status for a canonical or legacy spelling; refuses anything else */
export function normaliseStatus(status) {
  if (typeof status === 'string') {
    if (isCanonical(status)) return status
    const canonical = ALIASES[status]
    if (canonical) return canonical
  }
  throw new UnknownStatusError(status)
}

export function canTransition(from, to) {
  const f = normaliseStatus(from)
  const t = normaliseStatus(to)
  return TRANSITIONS[f].includes(t)
}

/** the canonical status the record lands on; refuses an illegal move */
export function transitionStatus(from, to) {
  const f = normaliseStatus(from)
  const t = normaliseStatus(to)
  if (!TRANSITIONS[f].includes(t)) throw new IllegalTransitionError(f, t)
  return t
}

/** still in play: anything except closed and cancelled */
export function isActive(status) {
  const s = normaliseStatus(status)
  return s !== 'closed' && s !== 'cancelled'
}
