/**
 * Small text helpers for the console and the printed invoice.
 *
 * Nothing here touches money; it exists so that the CLI does not grow its own
 * copy of `padEnd`.
 */

/** Truncate to `width` characters, marking that something was cut. */
export function clip(text, width) {
  const value = String(text ?? '')
  if (value.length <= width) return value
  if (width <= 1) return value.slice(0, width)
  return value.slice(0, width - 1) + '…'
}

/** Left-align in a column of `width`, clipping anything longer. */
export function column(text, width) {
  return clip(text, width).padEnd(width, ' ')
}

/** Right-align in a column of `width`, clipping anything longer. */
export function moneyColumn(text, width) {
  return clip(text, width).padStart(width, ' ')
}

/** A description as stored: no runs of whitespace, no surrounding space. */
export function tidy(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim()
}
