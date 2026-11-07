/**
 * In-memory invite store.
 *
 * Invites are held one slot per invitee: when someone is re-invited the new
 * invite takes over the slot, and a token index remembers every token ever
 * issued so an old email link still resolves to something meaningful.
 */
export class InviteStore {
  constructor() {
    this.bySlot = new Map()     // "org:email" -> the invite currently in that slot
    this.tokenIndex = new Map() // token -> slot key
  }

  slotKey(org, email) {
    return org + ':' + email
  }

  save(invite) {
    const key = this.slotKey(invite.org, invite.email)
    this.bySlot.set(key, invite)
    this.tokenIndex.set(invite.token, key)
    return invite
  }

  /** The invite currently held for this invitee, if any. */
  currentFor(org, email) {
    return this.bySlot.get(this.slotKey(org, email))
  }

  /** The invite a presented token resolves to. */
  forToken(token) {
    const key = this.tokenIndex.get(token)
    return key === undefined ? undefined : this.bySlot.get(key)
  }
}
