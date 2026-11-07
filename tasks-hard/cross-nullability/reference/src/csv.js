/**
 * CSV export and import for account records.
 *
 * The columns are the union of the keys the rows actually have, so a field
 * nobody set produces no column at all. Inside the cells the three states have
 * to stay readable, because the export is what the billing team opens in a
 * spreadsheet and "never asked" and "asked us to remove it" are different rows
 * to them.
 */
import { hasField, isPlainObject, stateOf } from './core.js'

const CSV_NULL = 'null'
const CSV_EMPTY = '""'

/** One cell of the export. */
export function encodeCell(value) {
  if (value === null || value === undefined) return CSV_NULL
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value) || isPlainObject(value)) {
    const text = JSON.stringify(value)
    if (text === '[]' || text === '{}') return text
    return cellText(text)
  }
  return cellText(String(value))
}

function cellText(text) {
  if (text === '') return CSV_EMPTY
  if (/[",\r\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"'
  return text
}

/** The columns an export will have: every key present on at least one row. */
export function exportColumns(rows) {
  const keys = new Set()
  for (const row of rows ?? []) {
    if (row === null || row === undefined) continue
    for (const key of Object.keys(row)) {
      if (row[key] === undefined) continue
      keys.add(key)
    }
  }
  return [...keys].sort()
}

/** Render rows as CSV text, header line first. */
export function exportCsv(rows, options = {}) {
  const list = rows ?? []
  const columns = options.columns ?? exportColumns(list)
  const lines = [columns.map(cellText).join(',')]
  for (const row of list) {
    const cells = columns.map((column) => {
      if (row === null || row === undefined) return CSV_NULL
      if (!hasField(row, column)) return ''
      return encodeCell(row[column])
    })
    lines.push(cells.join(','))
  }
  return lines.join('\n') + '\n'
}

/** Split one CSV line into cells, honouring quotes and doubled quotes. */
export function parseCsvLine(line) {
  const cells = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
      continue
    }
    if (char === ',') {
      cells.push(cell)
      cell = ''
      continue
    }
    cell += char
  }
  cells.push(cell)
  return cells
}

/**
 * Decode one cell back into a value. The export is deliberately readable
 * rather than typed: what comes back out of the reader is text again.
 */
export function decodeCell(text) {
  return text
}

/** Parse CSV text into rows, using the first line as the header. */
export function importCsv(text, options = {}) {
  if (typeof text !== 'string') throw new TypeError('importCsv expects a string')
  const ignore = new Set(options.ignore ?? [])
  const lines = text.split(/\r?\n/).filter((line, index, all) => !(index === all.length - 1 && line === ''))
  if (lines.length === 0) return []
  const header = parseCsvLine(lines[0]).filter((name) => !ignore.has(name))
  const rows = []
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line)
    const row = {}
    header.forEach((name, index) => {
      row[name] = decodeCell(cells[index] ?? '')
    })
    rows.push(row)
  }
  return rows
}

/** How many rows of an export carry a value for a column. */
export function columnFill(rows, column) {
  let filled = 0
  for (const row of rows ?? []) {
    if (!hasField(row, column)) continue
    const state = stateOf(row[column])
    if (state === 'empty' || state === 'absent') continue
    filled += 1
  }
  return filled
}
