/**
 * Soft close.
 *
 * A bid landing inside the final window pushes the close out by the extension,
 * so the other side always has time to answer a late bid. The window and the
 * extension come from config/auction.config.json.
 */
export function maybeExtend(auction, at, tookLead) {
  if (!tookLead) return
  if (auction.endsAt - at > auction.softClose.window) return
  auction.endsAt = Math.max(auction.endsAt, at + auction.softClose.extension)
}
