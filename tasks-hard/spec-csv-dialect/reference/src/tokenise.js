/**
 * The scanner: text in, records of raw field tokens out.
 *
 * A token is `{ text, quoted }` - the characters of the field and whether the
 * field was written between quotes. Nothing here decides what a value is; that
 * is values.js, and nothing here knows about headers, which is reader.js.
 *
 * The scanner walks the text once, as a small state machine:
 *
 *   field start -> bare      when the field begins with anything but a quote
 *   field start -> quoted    when it begins with the quote character
 *   quoted      -> closed    at the quote that is not part of an escape pair
 *
 * Only a delimiter, a line ending or the end of the text may follow `closed`,
 * and only a line ending outside quotes ends a record - which is what lets a
 * quoted field carry a newline.
 */
import { DEFAULT_DIALECT } from './dialect.js'
import { ParseError } from './errors.js'

const FIELD_START = 'field-start'
const BARE = 'bare'
const QUOTED = 'quoted'
const CLOSED = 'closed'

export function tokenise(text, dialect = DEFAULT_DIALECT) {
  const { delimiter, quote, escape } = dialect
  const records = []

  let fields = []
  let value = ''
  let quoted = false
  let state = FIELD_START
  let line = 1
  let startLine = 1
  let at = 0

  const closeField = () => {
    fields.push({ text: value, quoted })
    value = ''
    quoted = false
    state = FIELD_START
  }

  const closeRecord = () => {
    closeField()
    // An empty line is not a row. A line holding `""` still is one.
    const blank = fields.length === 1 && fields[0].text === '' && !fields[0].quoted
    if (!blank) records.push({ fields, line: startLine })
    fields = []
    startLine = line
  }

  // The row a fresh problem belongs to: the records already finished, plus the
  // one being read. Blank lines never became records, so they do not count.
  const row = () => records.length + 1
  const column = () => fields.length + 1

  while (at < text.length) {
    const ch = text[at]

    if (state === QUOTED) {
      if (ch === escape && text[at + 1] === quote) {
        value += quote
        at += 2
        continue
      }
      if (ch === quote) {
        state = CLOSED
        at += 1
        continue
      }
      if (ch === '\n') line += 1
      value += ch
      at += 1
      continue
    }

    if (state === CLOSED) {
      if (ch === delimiter) {
        closeField()
        at += 1
        continue
      }
      if (ch === '\r' && text[at + 1] === '\n') {
        at += 2
        line += 1
        closeRecord()
        continue
      }
      if (ch === '\n') {
        at += 1
        line += 1
        closeRecord()
        continue
      }
      throw new ParseError('text-after-quote', { row: row(), column: column(), line: startLine })
    }

    if (state === FIELD_START && quote !== null && ch === quote) {
      state = QUOTED
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
      at += 2
      line += 1
      closeRecord()
      continue
    }
    if (ch === '\n') {
      at += 1
      line += 1
      closeRecord()
      continue
    }

    state = BARE
    value += ch
    at += 1
  }

  if (state === QUOTED) {
    throw new ParseError('unterminated-quote', { row: row(), column: column(), line: startLine })
  }
  if (state !== FIELD_START || fields.length > 0) closeRecord()

  return records
}
