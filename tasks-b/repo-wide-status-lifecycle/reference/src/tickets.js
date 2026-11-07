/**
 * tickets - the support board.
 *
 * The ticket flow is the shared lifecycle in docs/status-lifecycle.md —
 * nothing more, nothing less.
 */
import { normaliseStatus, transitionStatus } from './lifecycle.js'
import { idFactory } from './ids.js'

const nextId = idFactory('t')

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
      record.status = transitionStatus(record.status, to)
      return read(id)
    },
  }
}
