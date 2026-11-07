/**
 * The engine: one query document in, one page of report out.
 *
 * A report shows one page, so the page window is taken early and the rest of
 * the pipeline only ever works on the rows that will be printed. Groups are the
 * exception: a share of a total is only a share if the total was measured, so
 * the groups are built from the whole export rather than from the page.
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

  const filtered = query.where === undefined ? rows : rows.filter((row) => matches(row, query.where))
  const offset = query.offset === undefined ? 0 : query.offset
  const limit = query.limit === undefined ? null : query.limit

  const page = paginate(filtered, offset, limit)

  let result = page
  if (query.group !== undefined) result = groupRows(rows, query.group)
  if (query.having !== undefined) result = result.filter((row) => matches(row, query.having))
  const total = result.length
  if (query.order !== undefined) result = orderRows(result, query.order)
  if (query.select !== undefined) result = project(result, query.select)

  return { rows: result, total, count: result.length, offset, limit }
}

/** The page window of the rows the filters left. */
function paginate(rows, offset, limit) {
  const start = offset > 0 ? offset : 0
  if (!limit) return rows.slice(start)
  return rows.slice(start, start + limit)
}
