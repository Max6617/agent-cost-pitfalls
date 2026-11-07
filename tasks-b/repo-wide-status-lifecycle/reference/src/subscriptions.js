/**
 * subscriptions - the billing board.
 *
 * Statuses follow docs/status-lifecycle.md: legacy spellings are accepted on
 * the way in, the canonical status is stored and returned.
 */
import { normaliseStatus, transitionStatus } from './lifecycle.js'
import { idFactory } from './ids.js'

const nextId = idFactory('s')

export function createSubscriptions() {
  const records = new Map()

  function read(id) {
    const record = records.get(id)
    return record ? { ...record } : null
  }

  return {
    kind: 'subscription',

    add(record = {}) {
      const status = normaliseStatus(record.status ?? 'open')
      const id = record.id ?? nextId()
      records.set(id, { ...record, id, kind: 'subscription', status })
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
