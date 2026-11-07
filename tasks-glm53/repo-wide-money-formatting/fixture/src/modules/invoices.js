/**
 * Invoice totals and the printable summary.
 *
 * The email and the CSV used to go through here, which is how three different
 * rounding habits ended up shipping on the same invoice.
 */
import { format } from '../money.js'

export function lineTotal(line) {
  return (Number(line.qty) || 0) * (Number(line.unitPrice) || 0)
}

export function exactTotal(lines) {
  return lines.reduce((total, line) => total + lineTotal(line), 0)
}

/** Local renderer. Kept because the print stylesheet pins the padding. */
function formatLocal(amount) {
  const text = amount.toFixed(2)
  return text.startsWith('-') ? '-$' + text.slice(1) : '$' + text
}

/**
 * @param {{ reference: string, lines: object[], credit?: number }} invoice
 */
export function renderSummary(invoice) {
  let total = exactTotal(invoice.lines ?? [])
  if (invoice.credit) total = total - invoice.credit

  return {
    reference: invoice.reference,
    total: formatLocal(total),
    lines: (invoice.lines ?? []).map((line) => ({
      sku: line.sku,
      amount: formatLocal(lineTotal(line)),
    })),
  }
}

/** A one-line description for the payments list. */
export function describe(invoice) {
  return invoice.reference + '  ' + format(exactTotal(invoice.lines ?? []) - (invoice.credit ?? 0))
}
