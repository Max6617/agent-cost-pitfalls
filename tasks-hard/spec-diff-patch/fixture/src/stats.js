/**
 * Diff statistics for the review sidebar.
 *
 * Counts only: the sidebar shows "+12 -3" next to the file name, and the
 * reviewer decides whether to open the patch.
 */
import { parsePatch } from './parse.js'

/** `{ hunks, added, removed }` for a patch text, or nulls when it will not parse. */
export function diffstat(patchText) {
  const parsed = parsePatch(patchText)
  if (parsed.error) return { hunks: 0, added: 0, removed: 0, error: parsed.error.reason }
  let added = 0
  let removed = 0
  for (const hunk of parsed.hunks) {
    for (const line of hunk.lines) {
      if (line.kind === 'add') added++
      else if (line.kind === 'remove') removed++
    }
  }
  return { hunks: parsed.hunks.length, added, removed, error: null }
}

/** The one-line summary the sidebar renders. */
export function summarize(patchText) {
  const { hunks, added, removed } = diffstat(patchText)
  if (hunks === 0) return 'no changes'
  return '+' + added + ' -' + removed + ' in ' + hunks + (hunks === 1 ? ' hunk' : ' hunks')
}
