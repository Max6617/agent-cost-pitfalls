/**
 * orders - order records.
 *
 * An order belongs to a user and may be settled by one payment. Ingest went
 * through the typed-id migration, so records hold canonical ids; the exporter
 * emits them through idkit like everywhere else, so a DTO carries each id
 * canonically, exactly once.
 */
import * as idkit from './idkit.js'
import { toCents, fromCents } from './money.js'

/** The canonical form of an externally supplied order id. */
export function parseOrderId(value) {
  return idkit.parse('order', value)
}

/**
 * An order record. `input.id`, `input.userId` and `input.paymentId` may
 * arrive in any form the convention reads; `input.paymentId` may be null.
 */
export function createOrder(input) {
  return {
    id: idkit.parse('order', input.id),
    userId: idkit.parse('user', input.userId),
    paymentId: input.paymentId == null ? null : idkit.parse('payment', input.paymentId),
    amountCents: toCents(input.amount),
  }
}

/** The public shape of an order, every id in canonical form. */
export function serializeOrder(order) {
  return {
    id: idkit.parse('order', order.id),
    userId: idkit.parse('user', order.userId),
    paymentId: order.paymentId == null ? null : idkit.parse('payment', order.paymentId),
    amount: fromCents(order.amountCents),
  }
}
