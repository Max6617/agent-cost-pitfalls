import { LIMITS } from './policy.js'
import { truncate } from './truncate.js'

/**
 * One cell of the admin grid. One convention, one implementation: the shared
 * truncator with this surface's limit from the central policy.
 */
export function tableCell(value) {
  return truncate(value, LIMITS.tableCell)
}
