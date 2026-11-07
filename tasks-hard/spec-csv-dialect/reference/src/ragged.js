/**
 * What to do with a record that is not as wide as the file.
 *
 * Returns the record's values, or `null` when the record is to be dropped.
 * Anything the policy cannot rescue is a ParseError carrying the position, so
 * the import report can point the supplier at the line.
 *
 * `pad` can only lengthen a short record, and `truncate` can only shorten a
 * long one: neither policy has anything to say about the other direction, and
 * guessing there is how a column goes missing without anybody noticing.
 */
import { ParseError } from './errors.js'

export function applyRagged(values, width, dialect, position) {
  if (values.length === width) return values
  const short = values.length < width

  if (dialect.ragged === 'pad' && short) {
    const padded = values.slice()
    while (padded.length < width) padded.push(null)
    return padded
  }

  if (dialect.ragged === 'truncate' && !short) return values.slice(0, width)

  if (dialect.ragged === 'ignore') return null

  throw new ParseError('ragged-row', {
    row: position.row,
    column: short ? values.length + 1 : width + 1,
    line: position.line,
  })
}
