/**
 * Cart endpoints.
 *
 * Storage rows are snake_case; everything leaving this module goes through the
 * wire helper.
 */
import { toWire } from './wire.js'

export function cartPayload(row) {
  return toWire({
    id: row.id,
    customer_id: row.customer_id,
    line_total: row.line_total,
    checked_out_at: row.checked_out_at ?? null,
    lines: (row.lines ?? []).map((line) => ({
      sku: line.sku,
      qty: line.qty,
      unit_price: line.unit_price,
    })),
  })
}

export function cartSummary(row) {
  return toWire({ id: row.id, line_total: row.line_total, line_count: (row.lines ?? []).length })
}

export function emptyCart(id) {
  return toWire({ id, customer_id: null, line_total: 0, checked_out_at: null, lines: [] })
}
