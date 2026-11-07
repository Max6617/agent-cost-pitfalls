/**
 * parse(): the whole read.
 *
 * The order is fixed: scan the text into records, name the columns, turn each
 * remaining record into values, then let the ragged policy have its say. The
 * result is plain data - the loader serialises it straight into the staging
 * area, so nothing in here may hold on to the text.
 */
import { resolveDialect } from './dialect.js'
import { tokenise } from './tokenise.js'
import { recordValues } from './values.js'
import { buildColumns, toRecord } from './header.js'
import { applyRagged } from './ragged.js'
import { stripBom } from './eol.js'

export function parse(text, options = {}) {
  if (typeof text !== 'string') {
    throw new TypeError('parse() expects the file as a string, got ' + typeof text)
  }
  const dialect = resolveDialect(options)
  const records = tokenise(text, dialect)

  // The exporters prefix every file with a byte-order mark. It sits in front of
  // the first field, so that is where it is taken off.
  if (records.length && records[0].fields.length) {
    records[0].fields[0].text = stripBom(records[0].fields[0].text)
  }

  let columns = null
  let width = 0
  let data = records

  if (dialect.header !== false) {
    const header = records[0]
    data = records.slice(1)
    const names = Array.isArray(dialect.header)
      ? dialect.header
      : header
        ? recordValues(header, dialect)
        : []
    columns = buildColumns(names.filter((name) => typeof name === 'string' && name !== ''), dialect)
    width = header ? header.fields.length : 0
  } else if (records.length) {
    width = records[0].fields.length
  }

  const rows = []
  for (let index = 0; index < data.length; index += 1) {
    const values = recordValues(data[index], dialect)
    const shaped = applyRagged(values, width, dialect, { index })
    if (shaped === null) continue
    rows.push(columns === null ? shaped : toRecord(shaped, columns))
  }

  return { columns, rows, dialect }
}
