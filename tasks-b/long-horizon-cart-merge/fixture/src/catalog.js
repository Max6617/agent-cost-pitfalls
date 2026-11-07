/**
 * The product catalog.
 *
 * Prices live here and only here. A cart line carries the price it was shown
 * at as a display snapshot, but the number that counts is whatever the catalog
 * says when the line is priced for real (at merge, and at checkout).
 */
export function normalizeCatalog(entries) {
  const bySku = new Map()
  for (const entry of entries ?? []) {
    bySku.set(entry.sku, {
      sku: entry.sku,
      title: entry.title ?? entry.sku,
      priceCents: entry.priceCents,
      availableUntil: entry.availableUntil ?? null,
    })
  }
  return bySku
}

export function findSku(catalog, sku) {
  return catalog.get(sku) ?? null
}

/** The catalog's current price for a SKU, in integer cents. */
export function priceFor(catalog, sku) {
  const entry = findSku(catalog, sku)
  return entry ? entry.priceCents : null
}

/**
 * A product is available through the whole of its availableUntil day:
 * '2026-02-01' means a merge on 2026-02-01 still gets it, 2026-02-02 does not.
 * Dates are ISO strings and compare lexicographically.
 */
export function isAvailable(entry, now) {
  if (!entry) return false
  if (!entry.availableUntil) return true
  return now <= entry.availableUntil
}
