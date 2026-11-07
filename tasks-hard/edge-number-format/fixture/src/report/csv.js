/**
 * CSV / tabular export.
 *
 * A cell is either a plain string or a number, and a number is written with the
 * same house rendering the report uses, minus the separators when the export is
 * going to be re-imported by a spreadsheet that would read `1,234` as two
 * fields. `csv()` defaults to grouping off for that reason.
 */
import { format } from '../format.js'

/** Quote a field if it would otherwise be split or lose its whitespace. */
function cell(text, delimiter) {
  const needsQuotes = text.includes(delimiter) || text.includes('"') || text.includes('\n') || text.trim() !== text
  if (!needsQuotes) return text
  return '"' + text.split('"').join('""') + '"'
}

/** One row, one line. No trailing delimiter, no trailing newline. */
export function csvRow(cells, delimiter = ',') {
  return cells.map((c) => cell(String(c), delimiter)).join(delimiter)
}

/**
 * Render rows of objects as CSV.
 *
 * The header is the keys of the first row. Numbers go through `format`; anything
 * else is stringified. `options` are the same the report takes, except that
 * grouping is off unless the caller asks for it.
 */
export function csv(rows, options = {}) {
  const delimiter = options.delimiter ?? ','
  const renderOptions = { digits: options.digits, grouping: options.grouping === true }
  const header = rows.length ? Object.keys(rows[0]) : []
  const lines = [csvRow(header, delimiter)]
  for (const row of rows) {
    lines.push(csvRow(header.map((key) => {
      const value = row[key]
      return typeof value === 'number' ? format(value, renderOptions) : value
    }), delimiter))
  }
  return lines.join('\n')
}
