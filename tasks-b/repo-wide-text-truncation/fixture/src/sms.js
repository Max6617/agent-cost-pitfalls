import { LIMITS, ELLIPSIS, BOUNDARY_WINDOW } from './policy.js'

/**
 * SMS message preview.
 *
 * The SMS sender predates the shared truncator: the firmware build of the
 * device gateway bundles this module without the rest of src/, so it keeps
 * its own copy of the convention. It has to stay behaviour-identical to
 * truncate(message, LIMITS.sms).
 */
export function smsPreview(message) {
  const limit = LIMITS.sms
  if (message.length <= limit) return message
  let kept = message.slice(0, limit - ELLIPSIS.length)
  const cut = kept.lastIndexOf(' ')
  if (cut >= kept.length - BOUNDARY_WINDOW) kept = kept.slice(0, cut)
  return kept + ELLIPSIS
}
