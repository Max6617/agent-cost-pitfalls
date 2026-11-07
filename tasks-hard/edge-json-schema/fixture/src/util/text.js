/** Small string helpers shared by the CLI and the log line. */

export function truncate(text, width) {
  const value = String(text)
  return value.length <= width ? value : value.slice(0, Math.max(0, width - 1)) + '…'
}

export function plural(count, singular, plural = singular + 's') {
  return count + ' ' + (count === 1 ? singular : plural)
}
