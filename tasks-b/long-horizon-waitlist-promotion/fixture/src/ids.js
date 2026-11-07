/**
 * Deterministic id sequences. Ticket and offer ids must be stable across a
 * replay of the same command stream, so they come from counters here, never
 * from the clock or a random source.
 */
export function createSequence(prefix) {
  let next = 1
  return () => `${prefix}-${next++}`
}
