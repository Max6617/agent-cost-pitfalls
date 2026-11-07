/**
 * Padding helpers for the admin grid. Cells arrive here already shortened by
 * tableCell(); the grid only pads, it never cuts.
 */

/** Pad `text` with trailing spaces to `width` code points. */
export function padEnd(text, width) {
  const missing = width - Array.from(text).length
  return missing > 0 ? text + ' '.repeat(missing) : text
}

/** A row of the grid: every cell padded to its column width, joined by the gap. */
export function joinRow(cells, widths, gap = 2) {
  return cells.map((cell, i) => padEnd(cell, widths[i])).join(' '.repeat(gap))
}

/** The rule between the header row and the body. */
export function rule(widths, gap = 2) {
  return widths.map((w) => '-'.repeat(w)).join(' '.repeat(gap))
}
