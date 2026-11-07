/**
 * Journal entry shape.
 *
 * Entries arrive from the importer as plain JSON. `normalizeEntry` coerces the
 * types the rest of the ledger relies on (amounts as strings, dates as ISO) and
 * reports what is missing; it never throws, because one bad row in an import
 * file must not take the whole close down.
 */

export const KINDS = ['charge', 'payment', 'reversal']

/** +1 for a charge, -1 for a payment, 0 for a reversal (which negates a target). */
export function direction(kind) {
  if (kind === 'payment') return -1
  if (kind === 'reversal') return 0
  return 1
}

export function normalizeEntry(raw) {
  const out = { error: null }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'malformed-entry' }

  out.id = raw.id === undefined || raw.id === null ? null : String(raw.id)
  if (!out.id) out.error = 'missing-id'
  out.seq = Number.isFinite(Number(raw.seq)) ? Number(raw.seq) : 0
  out.effectiveDate = raw.effectiveDate === undefined ? '' : String(raw.effectiveDate)
  out.account = raw.account === undefined ? '' : String(raw.account)
  out.kind = raw.kind === undefined ? 'charge' : String(raw.kind)
  out.idempotencyKey = raw.idempotencyKey === undefined || raw.idempotencyKey === null
    ? null
    : String(raw.idempotencyKey)
  out.reverses = raw.reverses === undefined || raw.reverses === null ? null : String(raw.reverses)

  const amount = raw.amount ?? {}
  out.amount = {
    currency: amount.currency === undefined ? '' : String(amount.currency),
    value: amount.value === undefined || amount.value === null ? '' : String(amount.value),
  }

  if (!out.error && !/^\d{4}-\d{2}-\d{2}$/.test(out.effectiveDate)) out.error = 'bad-date'
  if (!out.error && !KINDS.includes(out.kind)) out.error = 'bad-kind'
  if (!out.error && out.kind === 'reversal' && !out.reverses) out.error = 'missing-reverses'
  if (!out.error && (out.amount.value === '' || !/^-?\d+(\.\d+)?$/.test(out.amount.value))) out.error = 'bad-amount'
  if (!out.error && out.kind !== 'reversal' && out.amount.currency === '') out.error = 'bad-currency'

  return out
}
