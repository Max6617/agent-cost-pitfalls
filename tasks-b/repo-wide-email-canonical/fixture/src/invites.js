import { parseAddress } from './validation.js'
import { PROVIDER_TABLE } from './emailkit.js'

/**
 * Invites — one pending invite per identity (docs/email-rules.md §4).
 *
 * Re-invites must not slip past with cosmetic changes, so the invite key
 * folds case, drops the tag and ignores dots in the local part, and maps
 * known provider domains onto their canonical domain.
 */
export function createInvites() {
  const invites = []
  const byKey = new Map()
  let next = 1

  const keyOf = ({ local, domain }) => {
    let l = local.toLowerCase()
    const plus = l.indexOf('+')
    if (plus !== -1) l = l.slice(0, plus)
    l = l.replaceAll('.', '')
    const d = domain.toLowerCase()
    const row = PROVIDER_TABLE.find((r) => r.domain === d)
    return l + '@' + (row ? row.canonical : d)
  }

  return {
    invite(email) {
      const parsed = parseAddress(email)
      if (!parsed) return { status: 'invalid-email', invite: null }
      const key = keyOf(parsed)
      if (byKey.has(key)) return { status: 'duplicate', invite: null }
      const invite = { id: 'i-' + next++, email }
      invites.push(invite)
      byKey.set(key, invite)
      return { status: 'sent', invite }
    },

    accept(email) {
      const parsed = parseAddress(email)
      if (!parsed) return { status: 'invalid-email', invite: null }
      const key = keyOf(parsed)
      const invite = byKey.get(key)
      if (!invite) return { status: 'no-invite', invite: null }
      byKey.delete(key)
      invites.splice(invites.indexOf(invite), 1)
      return { status: 'accepted', invite }
    },

    pending() {
      return invites.slice()
    },
  }
}
