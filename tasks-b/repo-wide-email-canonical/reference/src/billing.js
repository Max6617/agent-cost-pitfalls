import { canonicalize } from './emailkit.js'

/**
 * Billing contacts — one contact address per customer id, looked up by
 * identity (docs/email-rules.md §4). The lookup index is keyed by the
 * canonical form from emailkit and follows every address change: the new
 * address resolves at once and the old one stops.
 */
export function createBilling() {
  const contacts = new Map() // customerId -> { customerId, email }
  const index = new Map() // canonical address -> customerId

  const reindex = (customerId, email) => {
    const rec = contacts.get(customerId)
    if (rec) index.delete(canonicalize(rec.email))
    contacts.set(customerId, { customerId, email })
    index.set(canonicalize(email), customerId)
  }

  return {
    setContact(customerId, email) {
      if (!canonicalize(email)) return { status: 'invalid-email' }
      reindex(customerId, email)
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
      if (!canonicalize(email)) return { status: 'invalid-email' }
      if (!contacts.has(customerId)) return { status: 'no-such-customer' }
      reindex(customerId, email)
      return { status: 'updated' }
    },
  }
}
