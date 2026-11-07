import { clone } from './snapshot.js'

/**
 * The sellable catalog, one product per sku. Catalog writes are upserts: the
 * buyer-facing tools create or replace a product in one call.
 */
export class Catalog {
  constructor({ audit }) {
    this.audit = audit
    this.bySku = new Map()
  }

  require(sku) {
    const product = this.bySku.get(sku)
    if (!product) throw new Error('unknown sku: ' + sku)
    return product
  }

  upsert(actor, { sku, title, category, attributes = {} }) {
    const existing = this.bySku.get(sku)
    if (!existing) {
      const product = { sku, title, category, attributes: clone(attributes), listed: true }
      this.bySku.set(sku, product)
      this.audit.emit({
        actor, action: 'catalog.upsert', entity: 'product', id: sku,
        before: null, after: clone(product),
      })
      return product
    }
    const before = clone(existing)
    Object.assign(existing, { title, category, attributes: clone(attributes) })
    this.audit.emit({
      actor, action: 'catalog.upsert', entity: 'product', id: sku,
      before, after: clone(existing),
    })
    return existing
  }

  get(sku) {
    return this.require(sku)
  }
}
