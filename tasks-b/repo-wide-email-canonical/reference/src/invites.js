import { canonicalize } from './emailkit.js'

/**
 * Invites — one pending invite per identity (docs/email-rules.md §4).
 * Identity is the canonical form from emailkit; dots are significant unless
 * the canonical provider's table row ignores them.
 */
export function createInvites() {
  const invites = []
  const byKey = new Map()
  let next = 1

  return {
    invite(email) {
      const key = canonicalize(email)
      if (!key) return { status: 'invalid-email', invite: null }
      if (byKey.has(key)) return { status: 'duplicate', invite: null }
      const invite = { id: 'i-' + next++, email }
      invites.push(invite)
      byKey.set(key, invite)
      return { status: 'sent', invite }
    },

    accept(email) {
      const key = canonicalize(email)
      if (!key) return { status: 'invalid-email', invite: null }
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
