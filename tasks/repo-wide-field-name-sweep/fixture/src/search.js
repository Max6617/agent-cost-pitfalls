/** The search endpoint's result rows. */
import { toWire } from './wire.js'

export function productHit(row) {
  return toWire({
    sku: row.sku,
    display_name: row.display_name,
    unit_price: row.unit_price,
    in_stock: row.in_stock,
  })
}

export function searchResponse(rows, tookMs) {
  // The hits are already on the wire convention; only this envelope needs it.
  return {
    hits: rows.map(productHit),
    totalHits: rows.length,
    tookMs,
  }
}

/** The facet block: a label and a count per value. */
export function facets(counts) {
  return Object.entries(counts).map(([value, count]) => toWire({ facet_value: value, doc_count: count }))
}
