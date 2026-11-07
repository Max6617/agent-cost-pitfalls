/** Text helpers shared by the importer and the dev server. */

/** Split a file into lines, accepting LF and CRLF alike. */
export function splitLines(text) {
  return String(text === undefined || text === null ? '' : text).replace(/\r\n?/g, '\n').split('\n')
}

/** Split a CSV line into trimmed cells. The importer's format is unquoted. */
export function splitRow(line) {
  return String(line).split(',').map((cell) => cell.trim())
}

/** Split the tags cell: `red; blue` is two tags. */
export function splitTags(cell) {
  const text = String(cell).trim()
  if (text === '') return []
  return text.split(';').map((tag) => tag.trim()).filter((tag) => tag !== '')
}

/** Shorten a string for a log line. */
export function truncate(text, max) {
  const value = String(text)
  return value.length <= max ? value : value.slice(0, max) + '...'
}

/** A stable, filesystem-safe form of a title, used by the dev server's fixtures. */
export function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
