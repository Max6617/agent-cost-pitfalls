/**
 * Rendering.
 *
 * The wire format the review service stores and shows: a two-line file header,
 * then one `@@` header and a body per hunk. Reviewers read this text directly,
 * so the shapes here are fixed by docs/unified-diff.md §2.
 */
import { normalizeOptions } from './config.js'

export const NO_NEWLINE_MARKER = '\\ No newline at end of file'

export function isNoNewlineMarker(line) {
  return line === NO_NEWLINE_MARKER
}

const PREFIX = { context: ' ', add: '+', remove: '-' }

/**
 * One side of a `@@` header, e.g. `3,5`. An empty side keeps its start and
 * writes the zero; anything else carries its count.
 */
export function formatRange(start, count) {
  if (count === 0) return start + ',0'
  return start + ',' + count
}

/** The `@@ -a,b +c,d @@` line for a hunk. */
export function formatHunkHeader(hunk) {
  const from = formatRange(hunk.fromStart, hunk.fromCount)
  const to = formatRange(hunk.toStart, hunk.toCount)
  return '@@ -' + from + ' +' + to + ' @@'
}

/**
 * A whole patch. No hunks means no patch at all: two identical texts produce
 * the empty string, not a header with nothing under it.
 */
export function renderDiff(hunks, options = {}) {
  const opts = normalizeOptions(options)
  if (hunks.length === 0) return ''
  const lines = ['--- ' + opts.fromLabel, '+++ ' + opts.toLabel]
  for (const hunk of hunks) {
    lines.push(formatHunkHeader(hunk))
    for (const line of hunk.lines) {
      lines.push(PREFIX[line.kind] + line.text)
      if (line.kind === 'remove' && line.newline === false) lines.push(NO_NEWLINE_MARKER)
    }
  }
  return lines.map((line) => line + '\n').join('')
}
