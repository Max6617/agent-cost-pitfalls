/**
 * parse(): the whole read.
 *
 * The order is fixed: drop the byte-order mark, scan the text into records,
 * name the columns, turn each remaining record into values, then let the ragged
 * policy have its say. The result is plain data - the loader serialises it
 * straight into the staging area, so nothing in here may hold on to the text.
 */
import { resolveDialect } from './dialect.js'
import { tokenise } from './tokenise.js'
import { recordValues } from './values.js'
import { buildColumns, mapColumns, toRecord } from './header.js'
import { applyRagged } from './ragged.js'
import { stripBom } from './eol.js'

export function parse(text, options = {}) {
  if (typeof text !== 'string') {
    throw new TypeError('parse() expects the file as a string, got ' + typeof text)
  }
  const dialect = resolveDialect(options)
  // The exporters prefix a byte-order mark. It is not part of the first field,
  // and it is not part of the first name either.
  const records = tokenise(stripBom(text), dialect)

  let mapping = null
  let width = 0
  let first = 0

  if (dialect.header === false) {
    width = records.length ? records[0].fields.length : 0
  } else {
    // Names handed in by the caller replace the header line: the first record
    // is data like every other one.
    const fromFile = dialect.header === true
    const header = fromFile ? records[0] : null
    first = fromFile ? 1 : 0
    const names = fromFile
      ? header
        ? recordValues(header, dialect)
        : []
      : dialect.header
    mapping = mapColumns(buildColumns(names), dialect.rename)
    width = mapping.length
  }

  const rows = []
  for (let index = first; index < records.length; index += 1) {
    const record = records[index]
    const values = recordValues(record, dialect)
    const shaped = applyRagged(values, width, dialect, { row: index + 1, line: record.line })
    if (shaped === null) continue
    rows.push(mapping === null ? shaped : toRecord(shaped, mapping))
  }

  const columns = mapping === null ? null : mapping.filter((name) => name !== null)
  return { columns, rows, dialect }
}
