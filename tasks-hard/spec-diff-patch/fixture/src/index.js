/**
 * unidiff - public surface.
 *
 * This is what the review service, the merge bot and the CLI import. The other
 * modules under src/ are internal and may be reorganised; the names below may
 * not, and their behaviour is fixed by docs/unified-diff.md.
 */
import { normalizeOptions, DEFAULTS } from './config.js'

export { buildDiff } from './build.js'
export { applyPatch } from './apply.js'
export { parsePatch } from './parse.js'
export { splitLines, joinLines } from './lines.js'
export { formatRange, formatHunkHeader, renderDiff, NO_NEWLINE_MARKER } from './format.js'
export { squash, lineMatches } from './whitespace.js'
export { diffstat, summarize } from './stats.js'
export { hunkForLine, groupComments } from './annotate.js'
export { DEFAULTS, normalizeOptions }

/** The defaults this build was configured with, for the CLI's --help. */
export function defaults() {
  return normalizeOptions({})
}
