/**
 * In-memory invite store.
 *
 * Every invite ever issued is kept under its own token, so an old email link
 * always resolves to the invite it was actually sent for. One pointer per
 * invitee says which invite is current: sending a new invite moves the
 * pointer and leaves the old invite behind, superseded but intact.
 */
export class InviteStore {
  constructor() {
    this.byToken = new Map()       // token -> the invite issued under it
    this.currentToken = new Map()  // "org:email" -> token of the current invite
  }

  slotKey(org, email) {
    return org + ':' + email
  }

  save(invite) {
    this.byToken.set(invite.token, invite)
    this.currentToken.set(this.slotKey(invite.org, invite.email), invite.token)
    return invite
  }

  /** The invite currently held for this invitee, if any. */
  currentFor(org, email) {
    const token = this.currentToken.get(this.slotKey(org, email))
    return token === undefined ? undefined : this.byToken.get(token)
  }

  /** The invite a presented token was issued for. */
  forToken(token) {
    return this.byToken.get(token)
  }

  /** Whether this invite is still the current one for its invitee. */
  isCurrent(invite) {
    return this.currentToken.get(this.slotKey(invite.org, invite.email)) === invite.token
  }
}
