import { parseAddress } from './validation.js'

/**
 * Accounts — one account per customer identity (docs/email-rules.md §4).
 *
 * The account key folds the domain to lowercase, because DNS names are
 * case-insensitive; the local part is kept exactly as its owner typed it.
 */
export function createAccounts() {
  const accounts = []
  const byKey = new Map()
  let next = 1

  const keyOf = ({ local, domain }) => local + '@' + domain.toLowerCase()

  return {
    register(email) {
      const parsed = parseAddress(email)
      if (!parsed) return { status: 'invalid-email', account: null }
      const key = keyOf(parsed)
      const existing = byKey.get(key)
      if (existing) return { status: 'exists', account: existing }
      const account = { id: 'a-' + next++, email }
      accounts.push(account)
      byKey.set(key, account)
      return { status: 'registered', account }
    },

    lookup(email) {
      const parsed = parseAddress(email)
      if (!parsed) return null
      return byKey.get(keyOf(parsed)) ?? null
    },

    count() {
      return accounts.length
    },
  }
}
