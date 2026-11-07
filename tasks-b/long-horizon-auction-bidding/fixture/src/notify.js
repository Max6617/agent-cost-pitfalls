/**
 * The outbox — the audit trail of displacements.
 *
 * One notice per displacement, in the order they happen. A challenge the
 * standing ceiling beats is still a displacement: the challenger was told
 * their bid was in, then beaten, and gets exactly one notice either way.
 */
export function notifyOutbid(outbox, bidder, at) {
  outbox.push({ type: 'outbid', bidder, at })
}

export function noticesFor(outbox, bidder) {
  return outbox.filter((n) => n.bidder === bidder)
}
