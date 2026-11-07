/**
 * The audit trail. Every mutating call appends one entry here, oldest first,
 * so a document can always explain how it ended up where it is. Entries are
 * plain data; `status()` hands callers a copy.
 */
export function record(doc, at, kind, tier = null, actor = null, note = null) {
  doc.history.push({ at, kind, tier, actor, note })
}
