import { withContext } from '../logger.js'

/**
 * Inventory reservations.
 *
 * Stock is decremented optimistically: the warehouse system is authoritative
 * but it only reconciles every fifteen minutes, so a reservation can be short.
 */
export class Inventory {
  constructor({ logger = withContext() } = {}) {
    this.logger = logger
    this.onHand = new Map()
  }

  /** Load a snapshot from the warehouse feed. */
  load(snapshot) {
    for (const [sku, units] of Object.entries(snapshot)) this.onHand.set(sku, units)
    return this
  }

  available(sku) {
    return this.onHand.get(sku) ?? 0
  }

  /**
   * Reserve `units` of `sku`. Returns how many were actually reserved; the
   * caller decides whether a short reservation is fatal.
   */
  reserve(sku, units) {
    const have = this.available(sku)
    if (units > have) {
      this.logger.warn('inventory: stock discrepancy for ' + sku + ' missing=' + (units - have) + ' onHand=' + have)
    }
    const taken = Math.min(units, have)
    this.onHand.set(sku, have - taken)
    return taken
  }
}
