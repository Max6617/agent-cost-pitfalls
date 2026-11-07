/**
 * tasks.js - the team board.
 *
 * The board shows the same listing order as every other screen, per
 * docs/listing-order.md: most urgent card on top, untriaged cards at the
 * bottom.
 */
import { sortListable } from './ordering.js'

export function listTasks(rows) {
  return sortListable(rows)
}

export function openCount(rows) {
  return rows.filter((row) => row.status !== 'done').length
}
