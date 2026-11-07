/**
 * What to do with a record that is not as wide as the file.
 *
 * Returns the record's values, or `null` when the record is to be dropped.
 * Anything the policy cannot rescue is a ParseError carrying the position, so
 * the import report can point the supplier at the line.
 */
import { ParseError } from './errors.js'

export function applyRagged(values, width, dialect, position) {
  if (values.length === width) return values

  if (dialect.ragged === 'pad') {
    const padded = values.slice()
    while (padded.length < width) padded.push('')
    return padded
  }

  if (dialect.ragged === 'truncate') return values.slice(0, width)

  if (dialect.ragged === 'ignore') return values.length > width ? null : values

  throw new ParseError('ragged-row', {
    row: position.index,
    column: values.length + 1,
  })
}
