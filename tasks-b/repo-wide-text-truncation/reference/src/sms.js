import { LIMITS } from './policy.js'
import { truncate } from './truncate.js'

/**
 * SMS message preview. One convention, one implementation: the shared
 * truncator with this surface's limit from the central policy.
 */
export function smsPreview(message) {
  return truncate(message, LIMITS.sms)
}
