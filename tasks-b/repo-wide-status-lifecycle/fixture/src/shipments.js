/**
 * shipments - the dispatch board.
 *
 * Ops treats a held shipment as parked: it either gets cancelled or it sits.
 * The flow table below is theirs, and the board refuses anything off it.
 */
import { normaliseStatus } from './lifecycle.js'
import { idFactory } from './ids.js'

const nextId = idFactory('h')

const FLOW = {
  open: ['triaged', 'cancelled'],
  triaged: ['in-progress', 'on-hold', 'cancelled'],
  'in-progress': ['on-hold', 'resolved', 'cancelled'],
  'on-hold': ['cancelled'],
  reopened: ['triaged', 'in-progress', 'cancelled'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  cancelled: [],
}

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
      const target = normaliseStatus(to)
      if (!(FLOW[record.status] ?? []).includes(target)) {
        throw new Error(`shipment ${id} cannot move from ${record.status} to ${target}`)
      }
      record.status = target
      return read(id)
    },
  }
}
