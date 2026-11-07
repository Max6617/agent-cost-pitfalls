/**
 * orders.js - the fulfilment queue.
 *
 * The queue is read many times a minute from a single worker, so it sorts the
 * batch it is handed instead of copying it first - by the time a caller asks
 * for the queue it is done with the arrival order anyway.
 */
export function listOrders(rows) {
  return rows.sort(compareQueue)
}

export function queueValue(rows) {
  let total = 0
  for (const row of rows) total += Number(row.total ?? 0)
  return total
}

function compareQueue(a, b) {
  return (
    descNullsLast(a.priority, b.priority) ||
    ascNullsLast(a.createdAt, b.createdAt) ||
    ascNullsLast(a.id, b.id)
  )
}

function ascNullsLast(x, y) {
  if (x == null && y == null) return 0
  if (x == null) return 1
  if (y == null) return -1
  return x < y ? -1 : x > y ? 1 : 0
}

function descNullsLast(x, y) {
  if (x == null && y == null) return 0
  if (x == null) return 1
  if (y == null) return -1
  return x > y ? -1 : x < y ? 1 : 0
}
