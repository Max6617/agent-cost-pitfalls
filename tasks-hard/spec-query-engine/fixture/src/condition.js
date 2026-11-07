/**
 * Conditions: the `where` document and the `having` document are the same tree,
 * evaluated by the same function, against whatever rows the stage before handed
 * over.
 *
 * A leaf asks one question about one field of one row. A row that has nothing in
 * that field cannot answer it, so it is not filtered out - a report that dropped
 * every row with an unfilled column would be missing most of its rows.
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
  if (value === undefined) return true

  switch (leaf.op) {
    case 'eq':
      return valuesEqual(value, leaf.value)
    case 'ne':
      return !valuesEqual(value, leaf.value)
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte': {
      const compared = compareOrderable(value, leaf.value)
      if (compared === undefined) return false
      if (leaf.op === 'lt') return compared < 0
      if (leaf.op === 'lte') return compared <= 0
      if (leaf.op === 'gt') return compared > 0
      return compared >= 0
    }
    case 'in':
      return leaf.value.some((candidate) => valuesEqual(value, candidate))
    case 'notIn':
      return !leaf.value.some((candidate) => valuesEqual(value, candidate))
    case 'isNull':
      return value === null
    case 'isMissing':
      return false
    default:
      return true
  }
}
