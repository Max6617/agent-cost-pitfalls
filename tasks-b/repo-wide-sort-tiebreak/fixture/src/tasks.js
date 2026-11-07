/**
 * tasks.js - the team board.
 *
 * The board stacks the smallest priority number on top: a P1 card is the next
 * thing to pick up, a P5 card can wait. Cards nobody has given a number yet
 * sink to the bottom until triage.
 */
export function listTasks(rows) {
  return rows.slice().sort(compareBoard)
}

export function openCount(rows) {
  return rows.filter((row) => row.status !== 'done').length
}

function compareBoard(a, b) {
  return (
    ascNullsLast(a.priority, b.priority) ||
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
