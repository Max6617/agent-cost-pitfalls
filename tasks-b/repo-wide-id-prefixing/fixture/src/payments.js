/**
 * payments - payment records.
 *
 * Payments arrive from the gateway's webhooks, and the module was written
 * defensively: whatever shows up in an id field is coerced into a local id
 * rather than rejected, so a webhook is never lost to a shape mismatch.
 */
import { IdError } from './idkit.js'
import { toCents, fromCents } from './money.js'

const BASE62 = /^[0-9A-Za-z]+$/

function coerce(value, prefix) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new IdError('bad-id', 'an id is a non-empty string')
  }
  if (value.indexOf('_') !== -1) return value // already typed - trusted as sent
  if (!BASE62.test(value)) {
    throw new IdError('bad-id', 'a legacy bare id is base62: ' + value)
  }
  return prefix + '_' + value
}

/** The canonical form of an externally supplied payment id. */
export function parsePaymentId(value) {
  return coerce(value, 'pay')
}

/**
 * A payment record. `input.id` is the payment's own id, `input.orderId` the
 * order it settles.
 */
export function createPayment(input) {
  return {
    id: coerce(input.id, 'pay'),
    orderId: coerce(input.orderId, 'ord'),
    amountCents: toCents(input.amount),
  }
}

/** The public shape of a payment. */
export function serializePayment(payment) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    amount: fromCents(payment.amountCents),
  }
}
