/**
 * Canonical output.
 *
 * toString is the form values round-trip through: lowest terms, sign on the
 * numerator, no denominator when it is one. toMixedString is the human form
 * used by the calculator display: whole part plus a proper fraction, sign
 * carried by the whole value.
 */

export function toString(f) {
  if (f.d === 1) return String(f.n)
  return f.n + '/' + f.d
}

export function toMixedString(f) {
  if (f.d === 1) return String(f.n)
  const sign = f.n < 0 ? '-' : ''
  const magnitude = Math.abs(f.n)
  const whole = Math.floor(magnitude / f.d)
  const rest = magnitude % f.d
  if (whole === 0) return sign + rest + '/' + f.d
  if (rest === 0) return sign + String(whole)
  return sign + whole + ' ' + rest + '/' + f.d
}
