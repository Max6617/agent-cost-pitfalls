/**
 * The feed loader.
 *
 * Reads the price rows, groups them per feed and hands back an immutable view.
 * Loading is pure apart from the reader it is given.
 */

/** Group rows into feeds keyed by `sku`. */
export function loadFeed(rows) {
  const feed = new Map()
  for (const row of rows) {
    if (!row || !row.sku) continue
    feed.set(row.sku, {
      sku: row.sku,
      price: Number(row.price) || 0,
      currency: row.currency ?? 'USD',
      retired: row.retired === true,
    })
  }
  return feed
}

/** Only the rows a customer may actually buy. */
export function sellable(feed) {
  return [...feed.values()].filter((item) => !item.retired)
}

/** A stable string form, for comparing two loads. */
export function fingerprint(feed) {
  return [...feed.keys()].sort().join('|')
}

/** The cheapest sellable item, for the "from" price on the listing page. */
export function cheapest(feed) {
  const items = sellable(feed)
  if (!items.length) return null
  return items.reduce((best, item) => (item.price < best.price ? item : best))
}
