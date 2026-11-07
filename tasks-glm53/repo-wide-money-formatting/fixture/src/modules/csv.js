/** CSV export for the finance team. */
import { format } from '../money.js'

function cell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text
}

/** Totals in this export are rounded per row, the way the ledger shows them. */
function rounded(value) {
  return Number(value.toFixed(2))
}

/**
 * @param {object[]} rows each `{ reference, total, currency? }`
 */
export function exportCsv(rows) {
  const header = ['reference', 'total']
  const body = rows.map((row) => [cell(row.reference), cell(format(rounded(row.total), { symbol: row.currency ?? '$' }))])
  return [header, ...body].map((line) => line.join(',')).join('\n') + '\n'
}

/** The footer line the finance team reconciles against. */
export function exportFooter(rows) {
  const total = rows.reduce((sum, row) => sum + rounded(row.total), 0)
  return 'TOTAL,' + format(total)
}
