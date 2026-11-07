/**
 * orders.js - the fulfilment queue.
 *
 * The queue is read many times a minute, and the indexer hands the same batch
 * to several screens, so the listing is built on a copy - the caller's array
 * keeps its arrival order for the audit trail.
 */
import { sortListable } from './ordering.js'

export function listOrders(rows) {
  return sortListable(rows)
}

export function queueValue(rows) {
  let total = 0
  for (const row of rows) total += Number(row.total ?? 0)
  return total
}
