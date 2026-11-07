import { parseAddress } from './validation.js'
import { canonicalize } from './emailkit.js'

/**
 * Billing contacts — one contact address per customer id, looked up by
 * identity (docs/email-rules.md §4). The lookup index is keyed by the
 * canonical form from emailkit.
 */
export function createBilling() {
  const contacts = new Map() // customerId -> { customerId, email }
  const index = new Map() // canonical address -> customerId

  return {
    setContact(customerId, email) {
      if (!parseAddress(email)) return { status: 'invalid-email' }
      contacts.set(customerId, { customerId, email })
      index.set(canonicalize(email), customerId)
      return { status: 'set' }
    },

    contactFor(customerId) {
      const rec = contacts.get(customerId)
      return rec ? rec.email : null
    },

    customerFor(email) {
      const canonical = canonicalize(email)
      if (!canonical) return null
      return index.get(canonical) ?? null
    },

    updateEmail(customerId, email) {
      if (!parseAddress(email)) return { status: 'invalid-email' }
      const rec = contacts.get(customerId)
      if (!rec) return { status: 'no-such-customer' }
      rec.email = email
      return { status: 'updated' }
    },
  }
}
