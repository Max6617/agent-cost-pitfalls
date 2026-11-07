/**
 * Ordering.
 *
 * compare() is the one place ordering is decided; sort, min and max are
 * defined in terms of it and equals() cross-multiplies the same way, so all
 * of them agree. The cross products are computed in BigInt: within the
 * documented bound they cannot overflow, and no value ever becomes a float.
 */

export function compare(a, b) {
  // denominators are positive, so the cross products order the values directly
  const left = BigInt(a.n) * BigInt(b.d)
  const right = BigInt(b.n) * BigInt(a.d)
  return left < right ? -1 : left > right ? 1 : 0
}

export function equals(a, b) {
  return BigInt(a.n) * BigInt(b.d) === BigInt(b.n) * BigInt(a.d)
}

export function sort(fractions) {
  return [...fractions].sort(compare)
}

export function min(a, b) {
  return compare(a, b) <= 0 ? a : b
}

export function max(a, b) {
  return compare(a, b) >= 0 ? a : b
}
