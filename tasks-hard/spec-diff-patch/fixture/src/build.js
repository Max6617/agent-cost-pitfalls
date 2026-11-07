/**
 * Building a patch from two versions of a text.
 */
import { normalizeOptions } from './config.js'
import { toRecords } from './lines.js'
import { alignLines } from './lcs.js'
import { buildHunks } from './hunks.js'
import { renderDiff } from './format.js'

/**
 * The unified diff between `fromText` and `toText`.
 *
 * Options: `context`, `fromLabel`, `toLabel`. Identical texts give `''`.
 */
export function buildDiff(fromText, toText, options = {}) {
  const opts = normalizeOptions(options)
  const ops = alignLines(toRecords(fromText), toRecords(toText))
  const hunks = buildHunks(ops, opts.context)
  return renderDiff(hunks, opts)
}
