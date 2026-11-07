/**
 * The scanner: text in, records of raw field tokens out.
 *
 * A token is `{ text, quoted }` - the characters of the field and whether the
 * field was written between quotes. Nothing here decides what a value is; that
 * is values.js, and nothing here knows about headers, which is reader.js.
 *
 * The scanner walks the text once. Quotes are the only thing that can hide a
 * delimiter or a line ending, so the walk is a small state machine over
 * "are we between quotes".
 */
import { DEFAULT_DIALECT } from './dialect.js'

export function tokenise(text, dialect = DEFAULT_DIALECT) {
  const { delimiter, quote } = dialect
  const records = []

  let fields = []
  let value = ''
  let quoted = false
  let betweenQuotes = false
  let at = 0

  const closeField = () => {
    fields.push({ text: value, quoted })
    value = ''
    quoted = false
  }

  const closeRecord = () => {
    closeField()
    // An empty line is not a row. A line holding `""` still is one.
    const blank = fields.length === 1 && fields[0].text === '' && !fields[0].quoted
    if (!blank) records.push({ fields })
    fields = []
  }

  while (at < text.length) {
    const ch = text[at]

    if (betweenQuotes) {
      if (ch === quote) {
        if (text[at + 1] === quote) {
          value += quote
          at += 2
          continue
        }
        betweenQuotes = false
        at += 1
        continue
      }
      if (ch === '\r' && text[at + 1] === '\n') {
        value += '\n'
        at += 2
        continue
      }
      value += ch
      at += 1
      continue
    }

    if (ch === quote) {
      betweenQuotes = true
      quoted = true
      at += 1
      continue
    }
    if (ch === delimiter) {
      closeField()
      at += 1
      continue
    }
    if (ch === '\r' && text[at + 1] === '\n') {
      closeRecord()
      at += 2
      continue
    }
    if (ch === '\n') {
      closeRecord()
      at += 1
      continue
    }

    value += ch
    at += 1
  }

  return records
}
