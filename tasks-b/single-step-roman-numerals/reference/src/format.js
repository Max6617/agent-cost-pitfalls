import { assertInRange } from './range.js'

/**
 * The canonical forms, consumed greedily from the largest down. Subtractive
 * pairs sit between the plain symbols so the walk stays a single pass and the
 * output always satisfies docs/numeral-rules.md section 2.
 */
const TABLE = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

export function format(n) {
  assertInRange(n)
  let rest = n
  let out = ''
  for (const [value, symbols] of TABLE) {
    while (rest >= value) {
      out += symbols
      rest -= value
    }
  }
  return out
}
