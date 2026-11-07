/**
 * Soft close.
 *
 * Every accepted bid landing inside the final window pushes the close out by
 * the extension, whether or not it changed who is winning, so the other side
 * always has time to answer a late bid. The window and the extension come
 * from config/auction.config.json.
 */
export function maybeExtend(auction, at) {
  if (auction.endsAt - at > auction.softClose.window) return
  auction.endsAt = Math.max(auction.endsAt, at + auction.softClose.extension)
}
