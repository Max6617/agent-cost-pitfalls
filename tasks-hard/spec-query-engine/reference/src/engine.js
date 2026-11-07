/**
 * The engine: one query document in, one page of report out.
 *
 * The stages are fixed and they run in the order the specification lists them,
 * whatever order the keys were written in:
 *
 *   where -> group -> having -> select -> order -> offset/limit
 *
 * The page is the last thing that happens, and `total` is counted before it, so
 * a report header always describes the whole result and not the slice of it
 * that happened to be printed.
 */
import { validateQuery } from './validate.js'
import { matches } from './condition.js'
import { groupRows } from './group.js'
import { project } from './project.js'
import { orderRows } from './order.js'
import { QueryError, ERROR_CODES } from './errors.js'

export function runQuery(rows, query = {}) {
  if (!Array.isArray(rows)) {
    throw new QueryError(ERROR_CODES.BAD_SHAPE, 'rows', 'the rows of a query are a list')
  }
  validateQuery(query)

  let result = rows
  if (query.where !== undefined) result = result.filter((row) => matches(row, query.where))
  if (query.group !== undefined) result = groupRows(result, query.group)
  if (query.having !== undefined) result = result.filter((row) => matches(row, query.having))
  if (query.select !== undefined) result = project(result, query.select)
  if (query.order !== undefined) result = orderRows(result, query.order)

  const total = result.length
  const offset = query.offset === undefined ? 0 : query.offset
  const limit = query.limit === undefined ? null : query.limit
  const page = paginate(result, offset, limit)

  return { rows: page, total, count: page.length, offset, limit }
}

/** The page window, taken after the rows are in their final order. */
function paginate(rows, offset, limit) {
  const start = Math.min(offset, rows.length)
  const end = limit === null ? rows.length : Math.min(start + limit, rows.length)
  return rows.slice(start, end)
}
