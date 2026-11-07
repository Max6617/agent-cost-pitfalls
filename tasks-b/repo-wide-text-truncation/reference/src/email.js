import { LIMITS } from './policy.js'
import { truncate } from './truncate.js'

/**
 * Email subject line. One convention, one implementation: the shared
 * truncator with this surface's limit from the central policy.
 */
export function emailSubject(subject) {
  return truncate(subject, LIMITS.emailSubject)
}
