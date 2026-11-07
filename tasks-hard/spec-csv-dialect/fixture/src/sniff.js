/**
 * sniffDialect(): guess the two things a caller cannot know.
 *
 * The quote character and the escape character are ours to choose, but the
 * delimiter and the line ending are the supplier's, so they are sniffed from
 * the head of the file. The rule is the boring one: the candidate that splits
 * the first record into the most fields wins, and a tie keeps the earlier
 * candidate.
 */
import { DELIMITERS, DEFAULT_DIALECT } from './dialect.js'
import { detectEol } from './eol.js'
import { firstLine } from './util/chars.js'

/** How many fields `record` splits into, honouring doubled quotes. */
export function countFields(record, delimiter, quote) {
  let count = 1
  let betweenQuotes = false
  for (let at = 0; at < record.length; at += 1) {
    const ch = record[at]
    if (betweenQuotes) {
      if (ch === quote) {
        if (record[at + 1] === quote) at += 1
        else betweenQuotes = false
      }
      continue
    }
    if (quote && ch === quote) {
      betweenQuotes = true
      continue
    }
    if (ch === delimiter) count += 1
  }
  return count
}

export function sniffDialect(sample, options = {}) {
  const candidates = options.candidates ?? DELIMITERS
  const quote = options.quote === undefined ? DEFAULT_DIALECT.quote : options.quote
  const head = firstLine(sample ?? '')

  let delimiter = DEFAULT_DIALECT.delimiter
  let best = 1
  for (const candidate of candidates) {
    const count = countFields(head, candidate, quote)
    if (count > best) {
      best = count
      delimiter = candidate
    }
  }

  return { delimiter, eol: detectEol(sample ?? '') }
}
