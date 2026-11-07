/**
 * admin.js - the operations console.
 *
 * The console answers "what is happening right now", so inside one priority
 * band the newest rows lead and the older ones trail off below.
 */
export function listAdmin(rows) {
  return rows.slice().sort(compareConsole)
}

export function bandOf(row) {
  if (row.priority == null) return 'untriaged'
  if (row.priority >= 4) return 'urgent'
  if (row.priority >= 2) return 'normal'
  return 'low'
}

function compareConsole(a, b) {
  return (
    descNullsLast(a.priority, b.priority) ||
    descNullsLast(a.createdAt, b.createdAt) ||
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
