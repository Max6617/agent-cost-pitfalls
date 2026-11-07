/**
 * admin.js - the operations console.
 *
 * The console follows the shared listing order like every other screen:
 * inside one priority band the oldest rows lead - the ones that have waited
 * longest - with undated entries at the bottom of the band.
 */
import { sortListable } from './ordering.js'

export function listAdmin(rows) {
  return sortListable(rows)
}

export function bandOf(row) {
  if (row.priority == null) return 'untriaged'
  if (row.priority >= 4) return 'urgent'
  if (row.priority >= 2) return 'normal'
  return 'low'
}
