import { withContext } from '../logger.js'

/**
 * Order lifecycle.
 *
 * Orders are append-only: an amendment writes a new revision and the previous
 * one stays readable for audit. Everything here is exercised by support.
 */

export class OrderStore {
  constructor({ logger = withContext() } = {}) {
    this.logger = logger
    this.orders = new Map()
  }

  create(order) {
    const stored = { ...order, revision: 1 }
    this.orders.set(order.id, [stored])
    return stored
  }

  current(id) {
    const revisions = this.orders.get(id)
    return revisions ? revisions[revisions.length - 1] : null
  }

  amend(id, fields) {
    const previous = this.current(id)
    if (!previous) return null
    const next = { ...previous, ...fields, revision: previous.revision + 1 }
    this.orders.get(id).push(next)
    this.logger.warn('order ' + id + ' amended: ' + Object.keys(fields).join(','))
    return next
  }

  cancel(id, reason) {
    const previous = this.current(id)
    if (!previous) return null
    const next = { ...previous, cancelled: true, cancelReason: reason, revision: previous.revision + 1 }
    this.orders.get(id).push(next)
    this.logger.warn('order ' + id + ' cancelled (' + reason + ')')
    return next
  }
}
