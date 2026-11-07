/**
 * The aggregate operators.
 *
 * An aggregate reads one field across the rows of one group. Exports are not
 * tidy: a column can hold the same number as text, and cells are left empty.
 * Everything is read through `Number` so that a column of digits still totals,
 * and whatever will not read as a number contributes nothing.
 */
export const AGGREGATE_OPS = Object.freeze(['count', 'sum', 'min', 'max', 'avg'])

/** The operators that need a `field` to read. */
export const FIELD_AGGREGATES = Object.freeze(['sum', 'min', 'max', 'avg'])

/** `spec` is `{ op, field? }` and `rows` are the rows of one group. */
export function aggregate(spec, rows) {
  const field = spec.field

  if (spec.op === 'count') {
    if (field === undefined) return rows.length
    return rows.length
  }

  const operands = []
  for (const row of rows) {
    const value = Number(row[field])
    if (!Number.isFinite(value)) continue
    operands.push(value)
  }

  if (spec.op === 'sum') {
    if (operands.length === 0) return null
    return operands.reduce((sum, value) => sum + value, 0)
  }
  if (operands.length === 0) return null
  if (spec.op === 'min') return Math.min(...operands)
  if (spec.op === 'max') return Math.max(...operands)
  return operands.reduce((sum, value) => sum + value, 0) / rows.length
}
