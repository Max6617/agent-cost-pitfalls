/**
 * The one error type the reader raises.
 *
 * The position is carried as fields rather than only baked into the message,
 * because the import report groups failures by row and the loader quotes the
 * column back to the supplier.
 */

const POSITION = (row, column, line) => {
  const parts = []
  if (row !== null) parts.push('row ' + row)
  if (column !== null) parts.push('column ' + column)
  if (line !== null) parts.push('line ' + line)
  return parts.length ? ' at ' + parts.join(', ') : ''
}

export class ParseError extends Error {
  constructor(code, position = {}) {
    const row = position.row ?? null
    const column = position.column ?? null
    const line = position.line ?? null
    super(code + POSITION(row, column, line))
    this.name = 'ParseError'
    this.code = code
    this.row = row
    this.column = column
    this.line = line
  }
}
