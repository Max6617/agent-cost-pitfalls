/**
 * Value classes, equality and comparison.
 *
 * Rows arrive from import files, another service's JSON and the odd hand-edited
 * spreadsheet export, so a column holds whatever the source held: a number, the
 * same number written as text, an empty cell. The rules of the specification are
 * implemented here once and used everywhere - filters, group keys and order keys
 * all call into these functions.
 */

/** The rank of a class when two values of different classes are compared. */
export const CLASS_RANK = Object.freeze({ number: 0, string: 1, boolean: 2, array: 3, object: 4 })

export function valueClass(value) {
  if (value === undefined) return 'missing'
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  const type = typeof value
  if (type === 'number' || type === 'string' || type === 'boolean') return type
  if (type === 'object') return 'object'
  return 'other'
}

/**
 * Equality: what the export wrote for a cell against what the report asks for.
 * A cell nobody filled in and a cell filled in with nothing are the same empty
 * cell as far as a report is concerned.
 */
export function valuesEqual(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) {
    return (a ?? null) === (b ?? null)
  }
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b)
  return String(a) === String(b)
}

/**
 * A total order over the values a report can hold. An empty cell counts as
 * nothing, so it sorts with the small values rather than falling out of the
 * comparison; text is compared the way a reader would compare it.
 */
export function compareValues(a, b) {
  const left = a === null || a === undefined ? 0 : a
  const right = b === null || b === undefined ? 0 : b
  const rankLeft = CLASS_RANK[valueClass(left)] ?? 5
  const rankRight = CLASS_RANK[valueClass(right)] ?? 5
  if (rankLeft !== rankRight) return rankLeft < rankRight ? -1 : 1
  if (typeof left === 'string' || typeof right === 'string') return String(left).localeCompare(String(right))
  if (typeof left === 'boolean') return left === right ? 0 : left ? 1 : -1
  if (typeof left === 'number') return left < right ? -1 : left > right ? 1 : 0
  return 0
}

/**
 * The comparison the four ordering operators use: numbers with numbers, strings
 * with strings, and `undefined` for anything else - a missing field, a null, or
 * two values of different classes. The caller turns that into a false.
 */
export function compareOrderable(a, b) {
  const classA = valueClass(a)
  const classB = valueClass(b)
  if (classA !== classB) return undefined
  if (classA === 'number' || classA === 'string') return a < b ? -1 : a > b ? 1 : 0
  return undefined
}
