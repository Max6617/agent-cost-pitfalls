/**
 * Anchoring review comments to a patch.
 *
 * A comment is left on a line of the new file. The file view needs to know
 * which hunk holds that line so it can expand the right one.
 */
import { parsePatch } from './parse.js'

/**
 * The 1-based index of the hunk whose new side covers `line` of the patched
 * file, or 0 when the line is outside every hunk.
 */
export function hunkForLine(patchText, line) {
  const parsed = parsePatch(patchText)
  if (parsed.error) return 0
  for (let index = 0; index < parsed.hunks.length; index++) {
    const hunk = parsed.hunks[index]
    if (hunk.toCount === 0) continue
    if (line >= hunk.toStart && line < hunk.toStart + hunk.toCount) return index + 1
  }
  return 0
}

/** Group comments by the hunk they landed in; unanchored ones go under 0. */
export function groupComments(patchText, comments) {
  const groups = new Map()
  for (const comment of comments) {
    const key = hunkForLine(patchText, comment.line)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(comment)
  }
  return groups
}
