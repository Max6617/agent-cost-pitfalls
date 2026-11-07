/**
 * File text <-> lines.
 *
 * A "line" is everything between two `\n` separators. The tools above the
 * library hand us whatever the editor saved, so the split has to be exact: a
 * diff that quietly changes a byte the reviewer did not ask about is worse than
 * no diff at all.
 */

/**
 * Split `text` into lines.
 *
 * `finalNewline` says whether the text ends with a `\n`; it is false for the
 * empty text, which has no lines at all.
 */
export function splitLines(text) {
  if (text === '') return { lines: [], finalNewline: false }
  const finalNewline = text.endsWith('\n')
  const body = finalNewline ? text.slice(0, -1) : text
  // Editors on Windows save CRLF; the separator we care about is the \n, and
  // the service works in terms of lines rather than bytes.
  return { lines: body.split('\n').map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line)), finalNewline }
}

/** The inverse of `splitLines`. */
export function joinLines(lines, finalNewline = true) {
  if (lines.length === 0) return ''
  return lines.join('\n') + (finalNewline ? '\n' : '')
}

/**
 * Lines carrying their own newline flag, which is what the alignment and the
 * hunk builder compare. Only the last line of a text can carry `false`.
 */
export function toRecords(text) {
  const { lines, finalNewline } = splitLines(text)
  return lines.map((line, index) => ({
    text: line,
    newline: index < lines.length - 1 ? true : finalNewline,
  }))
}

/** Records back to text: everything but the last line ends with a newline. */
export function recordsToText(records) {
  if (records.length === 0) return ''
  const last = records[records.length - 1]
  return joinLines(records.map((r) => r.text), last.newline !== false)
}
