import { parseAddress } from './validation.js'
import { PROVIDER_TABLE } from './emailkit.js'

/**
 * Newsletter — one subscription per identity (docs/email-rules.md §4).
 *
 * Subscriber keys fold case and apply the provider table: known domains map
 * to their canonical domain, and where the table says dots are ignored the
 * dots come out of the local part.
 */
export function createNewsletter() {
  const byKey = new Map() // key -> display address, in subscription order

  const keyOf = ({ local, domain }) => {
    const d = domain.toLowerCase()
    const row = PROVIDER_TABLE.find((r) => r.domain === d)
    const canonical = row ? row.canonical : d
    let l = local.toLowerCase()
    const canonicalRow = PROVIDER_TABLE.find((r) => r.domain === canonical)
    if (canonicalRow && canonicalRow.dots) l = l.replaceAll('.', '')
    return l + '@' + canonical
  }

  return {
    subscribe(email) {
      const parsed = parseAddress(email)
      if (!parsed) return { status: 'invalid-email' }
      const key = keyOf(parsed)
      if (byKey.has(key)) return { status: 'already-subscribed' }
      byKey.set(key, email)
      return { status: 'subscribed' }
    },

    unsubscribe(email) {
      const parsed = parseAddress(email)
      if (!parsed) return { status: 'invalid-email' }
      if (!byKey.delete(keyOf(parsed))) return { status: 'not-found' }
      return { status: 'unsubscribed' }
    },

    isSubscribed(email) {
      const parsed = parseAddress(email)
      if (!parsed) return false
      return byKey.has(keyOf(parsed))
    },

    list() {
      return [...byKey.values()]
    },
  }
}
