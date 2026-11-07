/**
 * Per-prefix counters for minting ids. The same sequence of operations always
 * produces the same ids, which keeps exports and the audit trail reproducible;
 * nothing here reads the clock or a random source.
 */
export function createIds() {
  const next = new Map()
  return (prefix) => {
    const n = (next.get(prefix) ?? 0) + 1
    next.set(prefix, n)
    return prefix + '-' + n
  }
}
