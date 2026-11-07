/**
 * mailroom — public surface.
 *
 * Everything the product is allowed to import. Modules under src/ that are
 * not re-exported here are internal and may be reorganised freely; the names
 * below may not.
 */
export { canonicalize, emailsMatch, providerRow, PROVIDER_TABLE } from './emailkit.js'
export { isValidEmail } from './validation.js'
export { createAccounts } from './accounts.js'
export { createInvites } from './invites.js'
export { createNewsletter } from './newsletter.js'
export { createSupportDesk } from './support.js'
export { createBilling } from './billing.js'
export { formatContact } from './format.js'
