/**
 * tickets - the support board.
 *
 * Support has always run a slightly looser flow than the other boards: quick
 * tickets get resolved without ceremony, and a ticket that comes back goes
 * straight onto the board again. The flow table below is what the team has
 * worked to for years.
 */
import { normaliseStatus, IllegalTransitionError } from './lifecycle.js'
import { idFactory } from './ids.js'

const nextId = idFactory('t')

const FLOW = {
  open: ['triaged', 'resolved', 'cancelled'],
  triaged: ['in-progress', 'on-hold', 'cancelled'],
  'in-progress': ['on-hold', 'resolved', 'cancelled'],
  'on-hold': ['in-progress', 'cancelled'],
  reopened: ['triaged', 'in-progress', 'cancelled'],
  resolved: ['closed'],
  closed: ['open', 'reopened'],
  cancelled: ['open'],
}

export function createTickets() {
  const records = new Map()

  function read(id) {
    const record = records.get(id)
    return record ? { ...record } : null
  }

  return {
    kind: 'ticket',

    add(record = {}) {
      const status = normaliseStatus(record.status ?? 'open')
      const id = record.id ?? nextId()
      records.set(id, { ...record, id, kind: 'ticket', status })
      return read(id)
    },

    get: read,

    all() {
      return [...records.values()].map((r) => ({ ...r }))
    },

    list(filter = {}) {
      const want = filter.status === undefined ? null : normaliseStatus(filter.status)
      return [...records.values()]
        .filter((r) => want === null || r.status === want)
        .map((r) => ({ ...r }))
    },

    transition(id, to) {
      const record = records.get(id)
      if (!record) return null
      if (!(FLOW[record.status] ?? []).includes(to)) {
        throw new IllegalTransitionError(record.status, to)
      }
      record.status = to
      return read(id)
    },
  }
}
