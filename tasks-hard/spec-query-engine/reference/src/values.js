/**
 * Value classes, equality and comparison.
 *
 * Rows come from import files, another service's JSON and the odd hand-edited
 * spreadsheet export, so a column holds whatever the source held. Nothing in
 * this module coerces: `3` and `'3'` are different values, and the comparison
 * rules of the specification are implemented here once and used everywhere -
 * filters, group keys and order keys all call into these functions.
 */

/** The rank of a class when two values of different classes are compared. */
export const CLASS_RANK = Object.freeze({ number: 0, string: 1, boolean: 2, array: 3, object: 4 })

/**
 * The class of a value.
 *
 * `missing` and `null` are reported as themselves; everything else is one of
 * the five classes of the specification. A function or a symbol is not a value
 * this language has, and is reported as `other`.
 */
export function valueClass(value) {
  if (value === undefined) return 'missing'
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  const type = typeof value
  if (type === 'number' || type === 'string' || type === 'boolean') return type
  if (type === 'object') return 'object'
  return 'other'
}

/** Equality, by class and content. A missing value equals nothing, `null` included. */
export function valuesEqual(a, b) {
  const classA = valueClass(a)
  const classB = valueClass(b)
  if (classA === 'missing' || classB === 'missing') return false
  if (classA === 'null' || classB === 'null') return classA === 'null' && classB === 'null'
  if (classA !== classB) return false
  if (classA === 'number' || classA === 'string' || classA === 'boolean') return a === b
  if (classA === 'array') {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i += 1) if (!valuesEqual(a[i], b[i])) return false
    return true
  }
  if (classA === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false
      if (!valuesEqual(a[key], b[key])) return false
    }
    return true
  }
  return false
}

/**
 * A total order over present values: class rank first, then the value inside
 * the class. Strings are compared by UTF-16 code unit, which is what `<` does,
 * and never by the host's locale.
 */
export function compareValues(a, b) {
  const classA = valueClass(a)
  const classB = valueClass(b)
  const rankA = CLASS_RANK[classA] ?? 5
  const rankB = CLASS_RANK[classB] ?? 5
  if (rankA !== rankB) return rankA < rankB ? -1 : 1
  if (classA === 'number' || classA === 'string') return a < b ? -1 : a > b ? 1 : 0
  if (classA === 'boolean') return a === b ? 0 : a ? 1 : -1
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
