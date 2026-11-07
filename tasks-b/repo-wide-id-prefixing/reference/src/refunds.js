/**
 * refunds - refund records.
 *
 * Refunds reconcile against the legacy ledger, whose keys are all-caps; the
 * module used to normalise ids to that house style on the way in. The
 * convention says bodies are case-sensitive, so ids are read and stored
 * through idkit, case-exact.
 */
import * as idkit from './idkit.js'
import { toCents, fromCents } from './money.js'

/** The canonical form of an externally supplied refund id. */
export function parseRefundId(value) {
  return idkit.parse('refund', value)
}

/**
 * A refund record. `input.id` is the refund's own id, `input.paymentId` the
 * payment it reverses.
 */
export function createRefund(input) {
  return {
    id: idkit.parse('refund', input.id),
    paymentId: idkit.parse('payment', input.paymentId),
    amountCents: toCents(input.amount),
    reason: input.reason ?? null,
  }
}

/** The public shape of a refund, ids in canonical form. */
export function serializeRefund(refund) {
  return {
    id: idkit.parse('refund', refund.id),
    paymentId: idkit.parse('payment', refund.paymentId),
    amount: fromCents(refund.amountCents),
    reason: refund.reason,
  }
}
