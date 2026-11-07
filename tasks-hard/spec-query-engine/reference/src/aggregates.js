/**
 * The aggregate operators.
 *
 * An aggregate reads one field across the rows of one group. Missing and null
 * values are not operands - they are dropped before anything is computed - and
 * the ones that are left have to be numbers, because a total that quietly
 * skipped a text value would not reconcile with the rows that produced it.
 */
import { QueryError, ERROR_CODES } from './errors.js'

export const AGGREGATE_OPS = Object.freeze(['count', 'sum', 'min', 'max', 'avg'])

/** The operators that need a `field` to read. */
export const FIELD_AGGREGATES = Object.freeze(['sum', 'min', 'max', 'avg'])

/**
 * `spec` is `{ op, field? }`, `rows` are the rows of one group and `path` is
 * where this aggregate sits in the document, so an error can name it.
 */
export function aggregate(spec, rows, path) {
  const field = spec.field

  if (spec.op === 'count') {
    if (field === undefined) return rows.length
    let counted = 0
    for (const row of rows) {
      const value = row[field]
      if (value !== undefined && value !== null) counted += 1
    }
    return counted
  }

  const operands = []
  for (const row of rows) {
    const value = row[field]
    if (value === undefined || value === null) continue
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new QueryError(ERROR_CODES.NOT_A_NUMBER, path, `${spec.op} over ${field} met ${describe(value)}, which is not a number`)
    }
    operands.push(value)
  }

  if (spec.op === 'sum') return operands.reduce((sum, value) => sum + value, 0)
  if (operands.length === 0) return null
  if (spec.op === 'min') return Math.min(...operands)
  if (spec.op === 'max') return Math.max(...operands)
  return operands.reduce((sum, value) => sum + value, 0) / operands.length
}

function describe(value) {
  if (Array.isArray(value)) return 'a list'
  if (typeof value === 'object') return 'an object'
  return `${typeof value} ${JSON.stringify(value)}`
}
