/**
 * orders - the fulfilment board.
 *
 * The board accepts the legacy spellings from docs/status-lifecycle.md: a lot
 * of the order feed still uses them, so the read paths here are liberal.
 */
import { normaliseStatus, canTransition, IllegalTransitionError } from './lifecycle.js'
import { idFactory } from './ids.js'

const nextId = idFactory('o')

export function createOrders() {
  const records = new Map()

  function read(id) {
    const record = records.get(id)
    return record ? { ...record } : null
  }

  return {
    kind: 'order',

    add(record = {}) {
      const status = record.status ?? 'open'
      normaliseStatus(status) // a spelling we have never seen is refused outright
      const id = record.id ?? nextId()
      records.set(id, { ...record, id, kind: 'order', status })
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
      if (!canTransition(record.status, to)) {
        throw new IllegalTransitionError(normaliseStatus(record.status), normaliseStatus(to))
      }
      record.status = to
      return read(id)
    },
  }
}
