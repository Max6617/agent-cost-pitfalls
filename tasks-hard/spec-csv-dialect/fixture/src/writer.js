/**
 * write(): records back out to delimited text.
 *
 * The loader wants to see the file it is about to load, and the re-export wants
 * to hand the supplier back what we read, so this has to be the exact inverse of
 * parse() for everything the dialect can represent.
 */
import { resolveDialect } from './dialect.js'

export function write(rows, options = {}) {
  const dialect = resolveDialect(options)
  const records = Array.isArray(rows) ? rows : (rows?.rows ?? [])
  const columns = options.columns ?? (Array.isArray(rows) ? null : (rows?.columns ?? null))

  const lines = []
  if (options.columns && dialect.header !== false) {
    lines.push(options.columns.map((name) => render(name ?? null, dialect)).join(dialect.delimiter))
  }
  for (const record of records) {
    const values = Array.isArray(record)
      ? record
      : (columns ?? Object.keys(record)).map((key) => record[key])
    lines.push(values.map((value) => render(value, dialect)).join(dialect.delimiter))
  }
  return lines.join('\n')
}

function render(value, dialect) {
  if (value === null || value === undefined) {
    return dialect.quote ? dialect.quote + dialect.quote : ''
  }
  if (typeof value !== 'string') {
    throw new TypeError('a field value must be a string or null, got ' + typeof value)
  }
  if (!dialect.quote) return value

  const needsQuotes = value.includes(dialect.delimiter) || value.includes('\n')
  if (!needsQuotes) return value

  const body = value.split(dialect.quote).join(dialect.quote + dialect.quote)
  return dialect.quote + body + dialect.quote
}
