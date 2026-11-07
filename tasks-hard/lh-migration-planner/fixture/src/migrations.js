/**
 * Declared migrations.
 *
 * The change-ticket export is written by people: a ticket may leave out the
 * dependency list, may not say how big the statement is, and may not mention
 * reversibility at all. Everything downstream works on the normalised shape
 * below rather than on the raw ticket, so each default is applied in one place.
 */
import { unique } from './util/ids.js'

/** The table an operation works on, or null for database-level operations. */
export function tableOf(migration) {
  return migration?.operation?.table ?? null
}

export function normalizeMigration(raw, index = 0) {
  const operation = raw?.operation ?? {}
  return {
    id: String(raw?.id ?? 'm-' + String(index).padStart(4, '0')),
    requires: unique((raw?.requires ?? []).map(String)),
    operation: {
      ...operation,
      kind: String(operation.kind ?? 'analyze'),
    },
    rows: raw?.rows === undefined || raw?.rows === null ? null : Number(raw.rows),
    batchSize: raw?.batchSize ?? null,
    reversible: raw?.reversible !== false,
    acknowledgement: raw?.acknowledgement ?? null,
  }
}

/** A new array of normalised migrations; the input is not modified. */
export function normalizeAll(migrations) {
  return (migrations ?? []).map((raw, index) => normalizeMigration(raw, index))
}
