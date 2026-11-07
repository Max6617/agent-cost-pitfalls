/**
 * Duplicate detection (docs/fulfilment-rules.md section 6).
 *
 * The same event can arrive more than once: the importer retries, the
 * upstream queue redelivers, and a redelivery may carry a freshly stamped
 * `at`. What makes an arrival the *same* event is its id, full stop.
 */
export function createIndex() {
  const seen = new Set()
  return {
    has: (event) => seen.has(event.id),
    add: (event) => seen.add(event.id),
  }
}
