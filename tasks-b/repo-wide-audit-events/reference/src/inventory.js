import { clone } from './snapshot.js'

/**
 * Stock on hand, one record per sku. Stock only moves through receive/adjust
 * so the trail can explain every unit; nobody writes onHand directly.
 */
export class Inventory {
  constructor({ audit }) {
    this.audit = audit
    this.bySku = new Map()
  }

  require(sku) {
    const item = this.bySku.get(sku)
    if (!item) throw new Error('unknown sku: ' + sku)
    return item
  }

  register(actor, { sku, name, onHand = 0, supplier }) {
    const item = { sku, name, onHand, supplier }
    this.bySku.set(sku, item)
    this.audit.emit({
      actor, action: 'inventory.register', entity: 'inventory', id: sku,
      before: null, after: clone(item),
    })
    return item
  }

  receive(actor, sku, qty) {
    const item = this.require(sku)
    const before = clone(item)
    item.onHand += qty
    this.audit.emit({
      actor, action: 'inventory.receive', entity: 'inventory', id: sku,
      before, after: clone(item),
    })
    return item
  }

  adjust(actor, sku, delta) {
    const item = this.require(sku)
    const before = clone(item)
    item.onHand += delta
    this.audit.emit({
      actor, action: 'inventory.adjust', entity: 'inventory', id: sku,
      before, after: clone(item),
    })
    return item
  }

  get(sku) {
    return this.require(sku)
  }
}
