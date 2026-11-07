import { canonicalize } from './emailkit.js'

/**
 * Newsletter — one subscription per identity (docs/email-rules.md §4).
 * Identity is the canonical form from emailkit, tag included in what is
 * dropped; the display address is kept as typed.
 */
export function createNewsletter() {
  const byKey = new Map() // canonical address -> display address, in subscription order

  return {
    subscribe(email) {
      const key = canonicalize(email)
      if (!key) return { status: 'invalid-email' }
      if (byKey.has(key)) return { status: 'already-subscribed' }
      byKey.set(key, email)
      return { status: 'subscribed' }
    },

    unsubscribe(email) {
      const key = canonicalize(email)
      if (!key) return { status: 'invalid-email' }
      if (!byKey.delete(key)) return { status: 'not-found' }
      return { status: 'unsubscribed' }
    },

    isSubscribed(email) {
      const key = canonicalize(email)
      if (!key) return false
      return byKey.has(key)
    },

    list() {
      return [...byKey.values()]
    },
  }
}
