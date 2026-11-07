/**
 * write(): records back out to delimited text.
 *
 * The loader wants to see the file it is about to load, and the re-export wants
 * to hand the supplier back what we read, so this has to be the exact inverse of
 * parse() for everything the dialect can represent:
 *
 *   absent  -> nothing            empty string -> `""`
 *   a field is quoted only when reading it back would otherwise change it.
 */
import { resolveDialect } from './dialect.js'

export function write(rows, options = {}) {
  const dialect = resolveDialect(options)
  const { columns, records } = collect(rows, options, dialect)

  const lines = []
  if (columns !== null && writesHeader(dialect)) {
    lines.push(columns.map((name) => render(name, dialect)).join(dialect.delimiter))
  }
  for (const record of records) {
    lines.push(record.map((value) => render(value, dialect)).join(dialect.delimiter))
  }
  return lines.length ? lines.map((line) => line + dialect.eol).join('') : ''
}

/** The column order, and the values of every record, in that order. */
function collect(rows, options, dialect) {
  let columns = options.columns ?? null
  if (Array.isArray(dialect.header)) columns = columns ?? dialect.header
  let source = rows

  if (source && !Array.isArray(source) && typeof source === 'object' && Array.isArray(source.rows)) {
    columns = columns ?? source.columns ?? null
    source = source.rows
  }
  if (!Array.isArray(source)) {
    throw new TypeError('write() expects an array of records, or a { columns, rows } object')
  }

  const objects = source.length > 0 && !Array.isArray(source[0])
  if (columns === null && objects) columns = Object.keys(source[0])
  if (columns !== null && !Array.isArray(columns)) {
    throw new TypeError('columns must be an array of names')
  }
  if (columns !== null && columns.some((name) => typeof name !== 'string')) {
    throw new TypeError('every column name must be a string')
  }

  const records = source.map((record) => {
    if (Array.isArray(record)) return record
    if (record && typeof record === 'object') {
      const keys = columns ?? Object.keys(record)
      return keys.map((key) => record[key])
    }
    throw new TypeError('a record must be an array of values or an object keyed by column name')
  })

  return { columns, records }
}

function writesHeader(dialect) {
  return dialect.header === true || Array.isArray(dialect.header)
}

function needsQuotes(value, dialect) {
  if (value === '') return true
  if (value.includes(dialect.delimiter)) return true
  if (value.includes(dialect.quote)) return true
  if (value.includes('\r') || value.includes('\n')) return true
  if (dialect.trim && /^[ \t]|[ \t]$/.test(value)) return true
  return false
}

function render(value, dialect) {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'string') {
    throw new TypeError('a field value must be a string or null, got ' + typeof value)
  }
  if (!needsQuotes(value, dialect)) return value
  if (dialect.quote === null) {
    throw new TypeError('the dialect cannot quote, so ' + JSON.stringify(value) + ' cannot be written')
  }
  const pair = dialect.escape === dialect.quote
    ? dialect.quote + dialect.quote
    : dialect.escape + dialect.quote
  const body = value.split(dialect.quote).join(pair)
  return dialect.quote + body + dialect.quote
}
