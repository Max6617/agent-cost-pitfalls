import { canonicalize } from './emailkit.js'

/**
 * Accounts — one account per customer identity (docs/email-rules.md §4).
 * Identity is the canonical form from emailkit; the display address is kept
 * exactly as typed.
 */
export function createAccounts() {
  const accounts = []
  const byKey = new Map()
  let next = 1

  return {
    register(email) {
      const key = canonicalize(email)
      if (!key) return { status: 'invalid-email', account: null }
      const existing = byKey.get(key)
      if (existing) return { status: 'exists', account: existing }
      const account = { id: 'a-' + next++, email }
      accounts.push(account)
      byKey.set(key, account)
      return { status: 'registered', account }
    },

    lookup(email) {
      const key = canonicalize(email)
      if (!key) return null
      return byKey.get(key) ?? null
    },

    count() {
      return accounts.length
    },
  }
}
