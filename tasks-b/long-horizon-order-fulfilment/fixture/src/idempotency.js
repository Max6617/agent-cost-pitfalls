/**
 * Duplicate detection (docs/fulfilment-rules.md section 6).
 *
 * The same envelope can arrive more than once: the importer retries, the
 * upstream queue redelivers. What makes an arrival the *same* event is the
 * envelope it came in, so the index keys on the id together with the
 * timestamp it carried.
 */
export function createIndex() {
  const seen = new Set()
  const key = (event) => event.id + '|' + event.at
  return {
    has: (event) => seen.has(key(event)),
    add: (event) => seen.add(key(event)),
  }
}
