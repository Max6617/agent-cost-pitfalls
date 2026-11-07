/**
 * refunds - refund records.
 *
 * Refunds reconcile against the legacy ledger, whose keys are all-caps, so
 * the module normalises every id it stores to that house style: the agreed
 * prefix stays, the body is uppercased on the way in.
 */
import { IdError } from './idkit.js'
import { toCents, fromCents } from './money.js'

const BASE62 = /^[0-9A-Za-z]+$/

function upperBody(value) {
  const cut = value.indexOf('_')
  if (cut === -1) return value.toUpperCase()
  return value.slice(0, cut) + '_' + value.slice(cut + 1).toUpperCase()
}

/** The house form of an externally supplied refund id. */
export function parseRefundId(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new IdError('bad-id', 'an id is a non-empty string')
  }
  const normal = upperBody(value)
  const cut = normal.indexOf('_')
  if (cut === -1) {
    if (!BASE62.test(normal)) throw new IdError('bad-id', 'a legacy bare id is base62: ' + value)
    return 'ref_' + normal
  }
  const head = normal.slice(0, cut)
  const body = normal.slice(cut + 1)
  if (head !== 'ref' && head !== 'ord' && head !== 'pay' && head !== 'usr') {
    throw new IdError('bad-id', 'unknown id prefix: ' + head)
  }
  if (!BASE62.test(body)) throw new IdError('bad-id', 'an id body is base62: ' + value)
  if (head !== 'ref') throw new IdError('wrong-prefix', value + ' is not a refund id')
  return normal
}

/**
 * A refund record. `input.id` is the refund's own id, `input.paymentId` the
 * payment it reverses.
 */
export function createRefund(input) {
  return {
    id: parseRefundId(input.id),
    paymentId: upperBody(input.paymentId),
    amountCents: toCents(input.amount),
    reason: input.reason ?? null,
  }
}

/** The public shape of a refund. */
export function serializeRefund(refund) {
  return {
    id: refund.id,
    paymentId: refund.paymentId,
    amount: fromCents(refund.amountCents),
    reason: refund.reason,
  }
}
