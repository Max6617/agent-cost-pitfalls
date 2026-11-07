import { LIMITS } from './policy.js'
import { truncate } from './truncate.js'

/**
 * One line of the service log. One convention, one implementation: the shared
 * truncator with this surface's limit from the central policy.
 */
export function logLine(message) {
  return truncate(message, LIMITS.logLine)
}
