import { clone } from './snapshot.js'

/**
 * Orders. An order starts pending and walks its statuses via transition();
 * cancel() is a terminal transition that also records the reason. revision
 * counts the mutations the order has been through, including creation.
 */
export class Orders {
  constructor({ audit, ids }) {
    this.audit = audit
    this.ids = ids
    this.byId = new Map()
  }

  require(id) {
    const order = this.byId.get(id)
    if (!order) throw new Error('unknown order: ' + id)
    return order
  }

  create(actor, { customer, items, payment }) {
    const order = { id: this.ids('ord'), customer, items, payment, status: 'pending', revision: 1 }
    this.byId.set(order.id, order)
    this.audit.emit({
      actor, action: 'order.create', entity: 'order', id: order.id,
      before: null, after: clone(order),
    })
    return order
  }

  transition(actor, id, status) {
    const order = this.require(id)
    const before = clone(order)
    order.status = status
    order.revision += 1
    this.audit.emit({
      actor, action: 'order.transition', entity: 'order', id,
      before, after: clone(order),
    })
    return order
  }

  cancel(actor, id, reason) {
    const order = this.require(id)
    const before = clone(order)
    order.status = 'cancelled'
    order.cancelReason = reason
    order.revision += 1
    this.audit.emit({
      actor, action: 'order.cancel', entity: 'order', id,
      before, after: clone(order),
    })
    return order
  }

  get(id) {
    return this.require(id)
  }
}
