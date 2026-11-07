/**
 * payments - payment records.
 *
 * Payments arrive from the gateway's webhooks. The module used to coerce
 * whatever showed up in an id field so a webhook was never lost; it now reads
 * ids through idkit, and a malformed or mistyped id is rejected the way the
 * convention says, at the boundary.
 */
import * as idkit from './idkit.js'
import { toCents, fromCents } from './money.js'

/** The canonical form of an externally supplied payment id. */
export function parsePaymentId(value) {
  return idkit.parse('payment', value)
}

/**
 * A payment record. `input.id` is the payment's own id, `input.orderId` the
 * order it settles.
 */
export function createPayment(input) {
  return {
    id: idkit.parse('payment', input.id),
    orderId: idkit.parse('order', input.orderId),
    amountCents: toCents(input.amount),
  }
}

/** The public shape of a payment, ids in canonical form. */
export function serializePayment(payment) {
  return {
    id: idkit.parse('payment', payment.id),
    orderId: idkit.parse('order', payment.orderId),
    amount: fromCents(payment.amountCents),
  }
}
