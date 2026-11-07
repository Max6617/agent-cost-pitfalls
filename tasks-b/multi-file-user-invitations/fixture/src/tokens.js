import { fnv1aHex } from './util/hash.js'
import { TOKEN_PREFIX } from './config.js'

/**
 * Invite tokens.
 *
 * A token is a deterministic fingerprint of the org, the invitee address and
 * the invite's sequence number inside that org - see docs/invitation-rules.md
 * §2 for the exact recipe. There is deliberately no randomness here: the same
 * invite issued again must produce the same token, which is what lets the
 * signup page and the audit log agree on what was sent.
 */
export function makeToken(org, email, counter) {
  return TOKEN_PREFIX + fnv1aHex(org + ':' + email + ':' + counter)
}
