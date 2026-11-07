import { InviteStore } from './store.js'
import { makeToken } from './tokens.js'
import { canonicalEmail, emailsMatch } from './email.js'
import { expiryFor, isExpired } from './expiry.js'
import { isValidRole, snapshotRole } from './roles.js'

/**
 * The team-invitation service. Orgs invite people by email; an invite is a
 * token plus the terms it was sent under; accepting the token turns the
 * invitee into a member on those terms.
 *
 * Every method that cares about time takes `now` as an argument. The rules
 * this service implements - statuses, ordering, canonicalisation - are the
 * contract in docs/invitation-rules.md; read that first.
 */
export class InviteService {
  constructor() {
    this.store = new InviteStore()
    this.orgs = new Map()
  }

  addOrg({ id, defaultRole = 'member' }) {
    if (!isValidRole(defaultRole)) throw new RangeError('unknown role: ' + defaultRole)
    const org = { id, defaultRole, inviteCount: 0 }
    this.orgs.set(id, org)
    return org
  }

  org(id) {
    const org = this.orgs.get(id)
    if (!org) throw new RangeError('unknown org: ' + id)
    return org
  }

  setDefaultRole(orgId, role) {
    if (!isValidRole(role)) throw new RangeError('unknown role: ' + role)
    this.org(orgId).defaultRole = role
  }

  /**
   * Send an invite. `role` may be omitted, in which case the org's default
   * as it stands right now is snapshotted onto the invite. Returns the
   * invite record.
   */
  invite({ org: orgId, email, role = null, now }) {
    const org = this.org(orgId)
    if (role !== null && !isValidRole(role)) throw new RangeError('unknown role: ' + role)
    const address = canonicalEmail(email)
    org.inviteCount += 1
    const invite = {
      token: makeToken(orgId, address, org.inviteCount),
      org: orgId,
      email: address,
      role: snapshotRole(role, org),
      createdAt: now,
      expiresAt: expiryFor(now),
      status: 'pending',
    }
    return this.store.save(invite)
  }

  /** Revoke the current invite for an invitee. */
  revoke({ org: orgId, email }) {
    const invite = this.store.currentFor(orgId, canonicalEmail(email))
    if (!invite) return { status: 'not-found' }
    if (invite.status === 'accepted') return { status: 'already-accepted' }
    invite.status = 'revoked'
    return { status: 'revoked' }
  }

  /**
   * Accept an invite by token. The result is `{ status }`, and on success
   * `{ status: 'accepted', member }` where the member carries the org, the
   * invited address and the role they joined with. The status order is the
   * one in docs/invitation-rules.md §4.
   */
  accept({ token, email, now }) {
    const invite = this.store.forToken(token)
    if (!invite) return { status: 'not-found' }
    if (invite.status === 'revoked') return { status: 'revoked' }
    if (!this.store.isCurrent(invite)) return { status: 'superseded' }
    if (isExpired(invite, now)) return { status: 'expired' }
    if (invite.status === 'accepted') return { status: 'already-accepted' }
    if (!emailsMatch(email, invite.email)) return { status: 'email-mismatch' }
    invite.status = 'accepted'
    return {
      status: 'accepted',
      member: { org: invite.org, email: invite.email, role: invite.role },
    }
  }
}

export function createService() {
  return new InviteService()
}
