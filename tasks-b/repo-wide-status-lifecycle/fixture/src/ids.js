/** Deterministic id sequences for the boards: o-0001, o-0002, ... */
export function idFactory(prefix) {
  let n = 0
  return () => `${prefix}-${String(++n).padStart(4, '0')}`
}
