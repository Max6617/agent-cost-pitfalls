/**
 * users.js - the account directory.
 *
 * Rows that are missing data float to the top of the directory, so the
 * onboarding team notices the gaps and fills them in: an account with no
 * priority or no creation date is a half-finished signup, not a bystander.
 */
export function listUsers(rows) {
  return rows.slice().sort(compareDirectory)
}

export function hasCompleteProfile(row) {
  return row.priority != null && row.createdAt != null && row.name != null
}

function compareDirectory(a, b) {
  return (
    descNullsFirst(a.priority, b.priority) ||
    ascNullsFirst(a.createdAt, b.createdAt) ||
    ascNullsFirst(a.id, b.id)
  )
}

function ascNullsFirst(x, y) {
  if (x == null && y == null) return 0
  if (x == null) return -1
  if (y == null) return 1
  return x < y ? -1 : x > y ? 1 : 0
}

function descNullsFirst(x, y) {
  if (x == null && y == null) return 0
  if (x == null) return -1
  if (y == null) return 1
  return x > y ? -1 : x < y ? 1 : 0
}
