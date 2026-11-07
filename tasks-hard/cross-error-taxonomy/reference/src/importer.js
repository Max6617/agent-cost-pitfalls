import { domainError } from './errors.js'
import { CSV_FIELDS, CSV_HEADER, MAX_IMPORT_ROWS } from './limits.js'
import { normalizeFields } from './validate.js'
import { splitLines, splitRow, splitTags } from './util/text.js'

/**
 * Read a CSV file of records. The format is the one the export produces: an
 * `id,title,quantity,tags` header and then one record per line, with the tags
 * cell holding `;`-separated tags.
 *
 * The importer is the operator's tool, so the position of a bad row is most of
 * what the failure is worth: "a row is wrong" without a row number sends them
 * looking through a spreadsheet by hand.
 */
export function importCsv(text, { ctx } = {}) {
  const lines = splitLines(text)
  const header = (lines[0] ?? '').trim()
  if (header !== CSV_HEADER) {
    throw domainError('VALIDATION_FAILED', {
      ctx,
      message: 'the file does not start with ' + CSV_HEADER,
      details: { fields: ['header'] },
    })
  }

  const rows = []
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.trim() === '') continue

    // Rows are counted over the data lines of the file, not over its lines: the
    // header is line 1 and is not a row, and a blank line is not a row either.
    const row = rows.length + 1

    const cells = splitRow(line)
    if (cells.length !== CSV_FIELDS.length) {
      throw domainError('ROW_INVALID', {
        ctx,
        message: 'row ' + row + ' has ' + cells.length + ' fields, not ' + CSV_FIELDS.length,
        details: { row, fields: ['row'] },
      })
    }

    const { fields, value } = normalizeFields({
      id: cells[0],
      title: cells[1],
      quantity: Number(cells[2]),
      tags: splitTags(cells[3]),
    })
    if (fields.length > 0) {
      throw domainError('ROW_INVALID', {
        ctx,
        message: 'row ' + row + ' is not valid: ' + fields.join(', '),
        details: { row, fields },
      })
    }

    rows.push({ row, ...value })
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    throw domainError('VALIDATION_FAILED', {
      ctx,
      message: 'the file has more than ' + MAX_IMPORT_ROWS + ' rows',
      details: { fields: ['rows'] },
    })
  }

  return { imported: rows.length, rows }
}
