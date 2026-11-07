/**
 * relay - public surface.
 *
 * Everything the senders, the admin grid and the preview tool are allowed to
 * import. Modules under src/ that are not re-exported here are internal and
 * may be reorganised freely; the names below may not.
 */
export { LIMITS, ELLIPSIS, BOUNDARY_WINDOW } from './policy.js'
export { truncate, lengthOf } from './truncate.js'
export { SURFACES } from './surfaces.js'
export { smsPreview } from './sms.js'
export { pushPreview } from './push.js'
export { emailSubject } from './email.js'
export { logLine } from './log.js'
export { tableCell } from './table.js'
