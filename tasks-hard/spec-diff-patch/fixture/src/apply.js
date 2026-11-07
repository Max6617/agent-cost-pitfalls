/**
 * Applying a patch.
 *
 * The service applies patches to files it did not build the patch from: the
 * branch moved on between the review and the merge, an editor is set to
 * different tab stops, or the last line of the file has been touched by
 * something else. All of that is normal, and all of it is reported rather than
 * guessed at.
 */
import { normalizeOptions } from './config.js'
import { splitLines, joinLines } from './lines.js'
import { parsePatch } from './parse.js'
import { lineMatches } from './whitespace.js'
import { matchFailure } from './report.js'

/**
 * The lines a hunk's old side has to match at `at`.
 */
function matchesAt(hunk, lines, at, ignoreWhitespace) {
  let cursor = at
  for (const line of hunk.lines) {
    if (line.kind === 'add') continue
    if (!lineMatches(line.text, lines[cursor - 1], ignoreWhitespace)) return false
    cursor++
  }
  return true
}

/**
 * Where a hunk goes, or null.
 *
 * `origin` is the line the header claims: for a hunk with an old side, the
 * first line it covers; for a pure insertion, the line the added lines go in
 * front of, which is one past the line the header names. The hunks are in file
 * order, so the search walks forward from the origin, as far as `maxOffset`
 * allows, looking for the first place the hunk's old side matches. A hunk with
 * no old side has nothing to match and is placed where its header says.
 */
function findPlacement(hunk, lines, origin, maxOffset, ignoreWhitespace) {
  if (hunk.fromCount === 0) {
    const at = hunk.fromStart + 1
    if (at > lines.length + 1) return null
    return at
  }
  for (let at = Math.max(1, origin); at <= origin + maxOffset && at + hunk.fromCount - 1 <= lines.length; at++) {
    if (matchesAt(hunk, lines, at, ignoreWhitespace)) return at
  }
  return null
}

/**
 * Apply `patchText` to `fromText`.
 *
 * Options: `maxOffset`, `ignoreWhitespace`. The result is
 * `{ ok, text, applied, hunks, errors }`.
 */
export function applyPatch(fromText, patchText, options = {}) {
  const opts = normalizeOptions(options)
  const parsed = parsePatch(patchText)
  const source = splitLines(fromText)
  if (parsed.error) {
    return { ok: false, text: fromText, applied: 0, hunks: [], errors: [parsed.error] }
  }

  const out = []
  const placed = []
  let cursor = 1
  let tail = 'none'
  let tailHunk = -1

  for (let index = 0; index < parsed.hunks.length; index++) {
    const hunk = parsed.hunks[index]
    const origin = hunk.fromCount === 0 ? hunk.fromStart + 1 : hunk.fromStart
    const atLine = findPlacement(hunk, source.lines, origin, opts.maxOffset, opts.ignoreWhitespace)
    if (atLine === null) {
      while (cursor <= source.lines.length) out.push(source.lines[cursor++ - 1])
      return {
        ok: false,
        text: joinLines(out, source.finalNewline),
        applied: placed.length,
        hunks: placed,
        errors: [matchFailure(hunk, index, source.lines)],
      }
    }

    placed.push({ index: index + 1, atLine, offset: atLine - origin })
    while (cursor < atLine) {
      out.push(source.lines[cursor - 1])
      cursor++
      tail = 'source'
    }
    let old = atLine
    for (const line of hunk.lines) {
      if (line.kind === 'remove') {
        old++
        continue
      }
      out.push(line.text)
      if (line.kind === 'context') old++
      tail = 'hunk'
      tailHunk = index
    }
    cursor = atLine + hunk.fromCount
  }

  while (cursor <= source.lines.length) {
    out.push(source.lines[cursor - 1])
    cursor++
    tail = 'source'
  }

  let finalNewline = false
  if (tail === 'source') finalNewline = source.finalNewline
  else if (tail === 'hunk') finalNewline = !parsed.hunks[tailHunk].noNewline.to
  return { ok: true, text: joinLines(out, finalNewline), applied: placed.length, hunks: placed, errors: [] }
}
