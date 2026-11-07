/**
 * subscriptions - the billing board.
 *
 * Written after the legacy-spelling incident that double-billed a quarter of
 * the base: every status that enters this board is required to be canonical
 * already. Anything else is refused before it touches a record.
 */
import { STATUSES, UnknownStatusError, transitionStatus } from './lifecycle.js'
import { idFactory } from './ids.js'

const nextId = idFactory('s')

function canonicalOnly(status) {
  if (!STATUSES.includes(status)) throw new UnknownStatusError(status)
  return status
}

export function createSubscriptions() {
  const records = new Map()

  function read(id) {
    const record = records.get(id)
    return record ? { ...record } : null
  }

  return {
    kind: 'subscription',

    add(record = {}) {
      const status = canonicalOnly(record.status ?? 'open')
      const id = record.id ?? nextId()
      records.set(id, { ...record, id, kind: 'subscription', status })
      return read(id)
    },

    get: read,

    all() {
      return [...records.values()].map((r) => ({ ...r }))
    },

    list(filter = {}) {
      const want = filter.status === undefined ? null : canonicalOnly(filter.status)
      return [...records.values()]
        .filter((r) => want === null || r.status === want)
        .map((r) => ({ ...r }))
    },

    transition(id, to) {
      const record = records.get(id)
      if (!record) return null
      record.status = transitionStatus(record.status, canonicalOnly(to))
      return read(id)
    },
  }
}
