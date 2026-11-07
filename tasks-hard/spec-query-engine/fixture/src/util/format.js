/**
 * Text helpers for the console report.
 *
 * Only the CLI uses these; the service takes the result object and renders it
 * itself. Kept here so the CLI does not grow a formatting corner of its own.
 */

/** How a cell is written in the console table. */
export function formatCell(value) {
  if (value === undefined) return ''
  if (value === null) return 'null'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

/** The rows of one page as a fixed-width table. */
export function formatTable(result) {
  const names = []
  for (const row of result.rows) {
    for (const name of Object.keys(row)) if (!names.includes(name)) names.push(name)
  }
  if (names.length === 0) return '(no rows)'
  const body = result.rows.map((row) => names.map((name) => formatCell(row[name])))
  const widths = names.map((name, column) => Math.max(name.length, ...body.map((cells) => cells[column].length)))
  const line = (cells) => cells.map((cell, column) => cell.padEnd(widths[column])).join('  ').trimEnd()
  return [line(names), line(widths.map((width) => '-'.repeat(width))), ...body.map(line)].join('\n')
}

/** The line a report prints under its table. */
export function formatFooter(result) {
  const shown = result.rows.length
  const from = shown === 0 ? 0 : result.offset + 1
  const to = result.offset + shown
  return `${from}-${to} of ${result.total}`
}
