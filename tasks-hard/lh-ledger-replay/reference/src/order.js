/**
 * Canonical journal order.
 *
 * The importer appends entries in whatever order the source file happened to
 * hold them, and the close job re-reads a journal that has been appended to for
 * months. Neither order may show through into a balance, so everything that
 * computes a balance walks the journal through here first: by effective date,
 * then by sequence within the day, then by id so that the result is total.
 */
export function compareEntries(a, b) {
  if (a.effectiveDate !== b.effectiveDate) return a.effectiveDate < b.effectiveDate ? -1 : 1
  if (a.seq !== b.seq) return a.seq - b.seq
  return String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0
}

/** A new array in canonical order; the input is not modified. */
export function canonicalOrder(entries) {
  return [...entries].sort(compareEntries)
}
