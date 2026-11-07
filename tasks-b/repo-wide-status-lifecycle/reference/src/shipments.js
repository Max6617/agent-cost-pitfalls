/**
 * shipments - the dispatch board.
 *
 * The shipment flow is the shared lifecycle in docs/status-lifecycle.md,
 * errors included.
 */
import { normaliseStatus, transitionStatus } from './lifecycle.js'
import { idFactory } from './ids.js'

const nextId = idFactory('h')

export function createShipments() {
  const records = new Map()

  function read(id) {
    const record = records.get(id)
    return record ? { ...record } : null
  }

  return {
    kind: 'shipment',

    add(record = {}) {
      const status = normaliseStatus(record.status ?? 'open')
      const id = record.id ?? nextId()
      records.set(id, { ...record, id, kind: 'shipment', status })
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
