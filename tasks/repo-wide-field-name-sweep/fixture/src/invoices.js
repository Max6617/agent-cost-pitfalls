/** Invoice endpoints and the printable summary. */
import { toWire } from './wire.js'

export function invoicePayload(row) {
  return toWire({
    id: row.id,
    order_id: row.order_id,
    issued_at: row.issued_at,
    amount_due: row.amount_due,
    currency_code: row.currency_code,
    lines: (row.lines ?? []).map((line) => ({ sku: line.sku, qty: line.qty, unit_price: line.unit_price })),
  })
}

/** The summary card on the account page. */
export function invoiceSummary(row) {
  return toWire({ id: row.id, amount_due: row.amount_due, issued_at: row.issued_at })
}

/** A line as the PDF template wants it. */
export function invoiceLine(line) {
  return toWire({ sku: line.sku, qty: line.qty, unit_price: line.unit_price, line_total: line.qty * line.unit_price })
}
