/**
 * users.js - the account directory.
 *
 * The directory follows the shared listing order: nulls sort last in every
 * key, so incomplete profiles sit at the bottom rather than floating to the
 * top.
 */
import { sortListable } from './ordering.js'

export function listUsers(rows) {
  return sortListable(rows)
}

export function hasCompleteProfile(row) {
  return row.priority != null && row.createdAt != null && row.name != null
}
