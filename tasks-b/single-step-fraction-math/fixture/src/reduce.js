/**
 * Reduction to lowest terms.
 *
 * Every fraction the library hands out has been through norm(): the parts are
 * coprime, the denominator is positive, and zero is always 0/1. makeFraction()
 * is the only way in, so the invariant holds everywhere downstream.
 */

export function gcd(a, b) {
  // Euclid's algorithm; the last non-zero remainder is the gcd.
  let x = a
  let y = b
  while (y !== 0) {
    const t = y
    y = x % y
    x = t
  }
  return x
}

export function norm(f) {
  let { n, d } = f
  if (d < 0) {
    n = -n
    d = -d
  }
  if (n === 0) return Object.freeze({ n: 0, d: 1 })
  const g = gcd(n, d)
  return Object.freeze({ n: n / g, d: d / g })
}
