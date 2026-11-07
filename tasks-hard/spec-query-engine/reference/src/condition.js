/**
 * Conditions: the `where` document and the `having` document are the same tree,
 * evaluated by the same function, against whatever rows the stage before handed
 * over.
 *
 * A leaf asks one question about one field of one row. Missing and null are
 * different answers to that question, and a pair that cannot be compared is not
 * an error - it is simply false, because a report must not stop because one row
 * in ten thousand has text where the rest have numbers.
 */
import { compareOrderable, valuesEqual } from './values.js'

export const OPERATORS = Object.freeze([
  'eq', 'ne', 'lt', 'lte', 'gt', 'gte', 'in', 'notIn', 'isNull', 'isMissing',
])

/** Operators that compare against a list. */
export const ARRAY_OPERATORS = Object.freeze(['in', 'notIn'])

/** Operators that take no `value` at all. */
export const NO_VALUE_OPERATORS = Object.freeze(['isNull', 'isMissing'])

/** The three combinators, in the order the specification lists them. */
export const COMBINATORS = Object.freeze(['and', 'or', 'not'])

/** True when `row` satisfies `condition`. */
export function matches(row, condition) {
  if (condition.and !== undefined) return condition.and.every((child) => matches(row, child))
  if (condition.or !== undefined) return condition.or.some((child) => matches(row, child))
  if (condition.not !== undefined) return !matches(row, condition.not)
  return matchesLeaf(row, condition)
}

function matchesLeaf(row, leaf) {
  const value = row[leaf.field]
  const missing = value === undefined
  switch (leaf.op) {
    case 'eq':
      return !missing && valuesEqual(value, leaf.value)
    case 'ne':
      return missing || !valuesEqual(value, leaf.value)
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte': {
      if (missing || value === null || leaf.value === null || leaf.value === undefined) return false
      const compared = compareOrderable(value, leaf.value)
      if (compared === undefined) return false
      if (leaf.op === 'lt') return compared < 0
      if (leaf.op === 'lte') return compared <= 0
      if (leaf.op === 'gt') return compared > 0
      return compared >= 0
    }
    case 'in':
      return !missing && leaf.value.some((candidate) => valuesEqual(value, candidate))
    case 'notIn':
      return missing || !leaf.value.some((candidate) => valuesEqual(value, candidate))
    case 'isNull':
      return !missing && value === null
    case 'isMissing':
      return missing
    default:
      return false
  }
}
