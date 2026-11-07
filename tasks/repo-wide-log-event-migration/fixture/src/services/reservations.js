import { withContext } from '../logger.js'

/**
 * Reservation worker.
 *
 * Pulls one batch off the queue at a time. The queue itself is not modelled
 * here; `next()` is the seam the tests replace.
 */
export class ReservationWorker {
  constructor({ inventory, queue, logger = withContext() } = {}) {
    this.inventory = inventory
    this.queue = queue
    this.logger = logger.child({ worker: 'reservation' })
  }

  /** Handle one message. Returns what was actually reserved. */
  handle(message) {
    const reserved = {}
    for (const line of message.lines ?? []) {
      const taken = this.inventory.reserve(line.sku, line.qty)
      if (taken > 0) {
        this.logger.warn('reserved ' + taken + ' x ' + line.sku)
        reserved[line.sku] = taken
      }
    }
    return reserved
  }

  /** Drain up to `limit` messages. */
  drain(limit = 10) {
    const handled = []
    for (let i = 0; i < limit; i++) {
      const message = this.queue.next()
      if (!message) break
      handled.push(this.handle(message))
    }
    return handled
  }
}
