/**
 * The supplier feed is CSV.
 *
 * Written by whatever the supplier had to hand — Excel, a Python script, a
 * mainframe export — so the reader has to cope with everything the format
 * allows rather than with what our own writer produces.
 */

/**
 * Split CSV text into rows of fields.
 *
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (char === ',' && !quoted) {
      row.push(field)
      field = ''
      continue
    }
    if (char === '\n' && !quoted) {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }
    field += char
  }

  row.push(field)
  rows.push(row)
  return rows
}

/** Quote a field when it needs it. */
export function quoteField(value) {
  const text = String(value ?? '')
  return text.includes(',') ? '"' + text + '"' : text
}

/** Render rows as CSV text. */
export function toCsv(rows) {
  return rows.map((row) => row.map(quoteField).join(',')).join('\n') + '\n'
}

/** The first row read as the header, the rest as objects. */
export function parseRecords(text) {
  const rows = parseCsv(text).filter((row) => row.length > 1 || row[0] !== '')
  if (!rows.length) return []
  const [header, ...body] = rows
  return body.map((row) => Object.fromEntries(header.map((key, i) => [key, row[i] ?? ''])))
}
