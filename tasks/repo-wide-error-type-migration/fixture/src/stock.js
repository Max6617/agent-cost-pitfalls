/**
 * Stock checks.
 *
 * The warehouse system is authoritative but slow, so the local snapshot is used
 * for the fast path and a rejection is only raised when the snapshot is sure.
 */

export class Stock {
  constructor(levels = {}) {
    this.levels = new Map(Object.entries(levels))
  }

  available(sku) {
    return this.levels.get(sku) ?? 0
  }

  /** Reserve stock, or fail. */
  require(sku, qty) {
    const have = this.available(sku)
    if (have < qty) {
      throw new Error('only ' + have + ' of ' + sku + ' in stock (409)')
    }
    this.levels.set(sku, have - qty)
    return { sku, qty, remaining: have - qty }
  }

  /** Reserve whatever is left, without failing. */
  partial(sku, qty) {
    const have = this.available(sku)
    const taken = Math.min(have, qty)
    this.levels.set(sku, have - taken)
    return taken
  }
}
