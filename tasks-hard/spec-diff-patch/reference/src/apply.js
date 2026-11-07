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
 * front of, which is one past the line the header names. Candidates are tried
 * at increasing distance from the origin, the earlier one first, and never
 * above `lowerBound` - the first line no earlier hunk has consumed. A hunk with
 * no old side has nothing to match and is placed where its header says.
 */
function findPlacement(hunk, lines, origin, lowerBound, opts) {
  if (hunk.fromCount === 0) {
    const at = hunk.fromStart + 1
    if (at < lowerBound) return null
    if (at > lines.length + 1) return null
    return at
  }
  for (let distance = 0; distance <= opts.maxOffset; distance++) {
    const candidates = distance === 0 ? [origin] : [origin - distance, origin + distance]
    for (const at of candidates) {
      if (at < lowerBound || at < 1) continue
      if (at + hunk.fromCount - 1 > lines.length) continue
      if (matchesAt(hunk, lines, at, opts.ignoreWhitespace)) return at
    }
  }
  return null
}

/**
 * The result text. Context lines come from the file, so a hunk matched under
 * tolerant whitespace does not rewrite the lines it landed on; only the added
 * lines come from the patch.
 */
function compose(source, hunks, placed) {
  const out = []
  let tail = 'none'
  let cursor = 1
  for (const placement of placed) {
    const hunk = hunks[placement.index - 1]
    while (cursor < placement.atLine) {
      out.push(source.lines[cursor - 1])
      cursor++
      tail = 'source'
    }
    let old = placement.atLine
    for (const line of hunk.lines) {
      if (line.kind === 'add') {
        out.push(line.text)
        tail = 'hunk:' + (placement.index - 1)
      } else {
        const text = source.lines[old - 1]
        old++
        if (line.kind === 'context') {
          out.push(text)
          tail = 'hunk:' + (placement.index - 1)
        }
      }
    }
    cursor = placement.atLine + hunk.fromCount
  }
  while (cursor <= source.lines.length) {
    out.push(source.lines[cursor - 1])
    cursor++
    tail = 'source'
  }

  let finalNewline = false
  if (tail === 'source') finalNewline = source.finalNewline
  else if (tail !== 'none') finalNewline = !hunks[Number(tail.slice(5))].noNewline.to
  return joinLines(out, finalNewline)
}

/**
 * Apply `patchText` to `fromText`.
 *
 * Options: `maxOffset`, `ignoreWhitespace`. The result is
 * `{ ok, text, applied, hunks, errors }`; `text` is the input, untouched, unless
 * every hunk was placed.
 */
export function applyPatch(fromText, patchText, options = {}) {
  const opts = normalizeOptions(options)
  const parsed = parsePatch(patchText)
  if (parsed.error) {
    return { ok: false, text: fromText, applied: 0, hunks: [], errors: [parsed.error] }
  }
  const source = splitLines(fromText)
  const placed = []
  let lowerBound = 1

  for (let index = 0; index < parsed.hunks.length; index++) {
    const hunk = parsed.hunks[index]
    const origin = hunk.fromCount === 0 ? hunk.fromStart + 1 : hunk.fromStart
    const atLine = findPlacement(hunk, source.lines, origin, lowerBound, opts)
    if (atLine === null) {
      return {
        ok: false,
        text: fromText,
        applied: placed.length,
        hunks: placed,
        errors: [matchFailure(hunk, index + 1, source.lines)],
      }
    }
    placed.push({ index: index + 1, atLine, offset: atLine - origin })
    lowerBound = atLine + hunk.fromCount
  }

  return { ok: true, text: compose(source, parsed.hunks, placed), applied: placed.length, hunks: placed, errors: [] }
}
