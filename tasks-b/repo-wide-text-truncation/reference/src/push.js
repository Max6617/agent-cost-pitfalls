import { LIMITS } from './policy.js'
import { truncate } from './truncate.js'

/**
 * Push notification title. One convention, one implementation: the shared
 * truncator with this surface's limit from the central policy.
 */
export function pushPreview(title) {
  return truncate(title, LIMITS.push)
}
