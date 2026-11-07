import { clone } from './snapshot.js'

/**
 * The price book, one price per sku. A price carries its unit cost so margin
 * reports can be built off the same record; the cost is policy-redacted in
 * the audit trail (docs/audit-convention.md, rule 4).
 */
export class Pricing {
  constructor({ audit }) {
    this.audit = audit
    this.bySku = new Map()
  }

  set(actor, sku, fields) {
    const existing = this.bySku.get(sku)
    if (!existing) {
      const price = { sku, ...fields }
      this.bySku.set(sku, price)
      this.audit.emit({
        actor, action: 'price.set', entity: 'price', id: sku,
        before: null, after: clone(price),
      })
      return price
    }
    const before = clone(existing)
    Object.assign(existing, fields)
    this.audit.emit({
      actor, action: 'price.set', entity: 'price', id: sku,
      before, after: clone(existing),
    })
    return existing
  }

  /** Apply a batch of updates, then emit the batch in the order it was given. */
  bulkSet(actor, updates) {
    const pending = []
    for (const { sku, fields } of updates) {
      const existing = this.bySku.get(sku)
      const before = existing ? clone(existing) : null
      const price = existing ?? { sku }
      Object.assign(price, fields)
      this.bySku.set(sku, price)
      pending.push({
        actor, action: 'price.set', entity: 'price', id: sku,
        before, after: clone(price),
      })
    }
    for (const event of pending) this.audit.emit(event)
    return updates.map((u) => this.bySku.get(u.sku))
  }

  get(sku) {
    const price = this.bySku.get(sku)
    if (!price) throw new Error('unknown sku: ' + sku)
    return price
  }
}
