/**
 * orders - order records.
 *
 * An order belongs to a user and may be settled by one payment. Ingest went
 * through the typed-id migration, so records hold canonical ids. The exporter
 * is older: it was written when records held bare bodies and it still stamps
 * the prefix on the way out.
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

/** The public shape of an order, stamped for the wire. */
export function serializeOrder(order) {
  return {
    id: 'ord_' + order.id,
    userId: 'usr_' + order.userId,
    paymentId: order.paymentId == null ? null : 'pay_' + order.paymentId,
    amount: fromCents(order.amountCents),
  }
}
