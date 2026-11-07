/**
 * Small string helpers for the preview tool and the notification log line.
 */

/** Squashes a rendered body onto one line - the preview tool's summary mode. */
export function collapseWhitespace(text) {
  return String(text).replace(/\s+/g, ' ').trim()
}

/** Cuts a rendered body to a preview length without splitting a word in half. */
export function truncate(text, limit) {
  const value = String(text)
  if (value.length <= limit) return value
  const cut = value.slice(0, limit)
  const space = cut.lastIndexOf(' ')
  return (space > limit / 2 ? cut.slice(0, space) : cut) + '...'
}
