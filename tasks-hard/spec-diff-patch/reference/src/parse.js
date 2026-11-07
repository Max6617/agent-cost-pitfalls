/**
 * Parsing.
 *
 * The parser is the only place that decides whether a patch is well formed, and
 * it reports the first problem it finds rather than guessing: a patch that is
 * not understood must never be half-applied.
 */
import { isNoNewlineMarker } from './format.js'

const HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@$/
const PREFIXES = { ' ': 'context', '-': 'remove', '+': 'add' }

const syntax = (line, reason) => ({ code: 'malformed', line, reason })

/** Patch text as lines; a trailing newline does not leave an empty line. */
function patchLines(text) {
  if (text === '') return []
  const finalNewline = text.endsWith('\n')
  const body = finalNewline ? text.slice(0, -1) : text
  return body.split('\n')
}

function parseHeader(line) {
  const m = HEADER.exec(line)
  if (!m) return null
  const fromStart = Number(m[1])
  const fromCount = m[2] === undefined ? 1 : Number(m[2])
  const toStart = Number(m[3])
  const toCount = m[4] === undefined ? 1 : Number(m[4])
  // A range that covers lines starts at one or later; line zero is only ever
  // the "nothing precedes this" start of an empty side.
  if (fromCount > 0 && fromStart === 0) return null
  if (toCount > 0 && toStart === 0) return null
  return { fromStart, fromCount, toStart, toCount }
}

/**
 * `{ hunks, error }`. `error` is null, or the first syntax problem found.
 *
 * A hunk carries the ranges it was parsed from, the 1-based line of its `@@`
 * header inside the patch text, its body lines with the prefix character
 * removed, and which sides the `\ No newline at end of file` marker applies to.
 */
export function parsePatch(text) {
  const lines = patchLines(text)
  const hunks = []
  let i = 0

  // Optional file header: `--- label`, then `+++ label`, before the first hunk.
  if (i < lines.length && lines[i].startsWith('---')) {
    i++
    if (i < lines.length && lines[i].startsWith('+++')) i++
    else return { hunks: [], error: syntax(i + 1, 'bad-header') }
  }

  while (i < lines.length) {
    const line = lines[i]
    const headerLine = i + 1
    if (!line.startsWith('@@')) return { hunks: [], error: syntax(headerLine, 'bad-header') }
    const range = parseHeader(line)
    if (!range) return { hunks: [], error: syntax(headerLine, 'bad-header') }
    i++

    const hunk = { ...range, headerLine, noNewline: { from: false, to: false }, lines: [] }
    let lastKind = null
    let from = 0
    let to = 0

    for (;;) {
      if (i < lines.length && isNoNewlineMarker(lines[i])) {
        if (lastKind === null) return { hunks: [], error: syntax(i + 1, 'bad-marker') }
        if (lastKind === 'context') hunk.noNewline = { from: true, to: true }
        else if (lastKind === 'remove') hunk.noNewline.from = true
        else hunk.noNewline.to = true
        lastKind = null
        i++
        continue
      }
      if (from >= hunk.fromCount && to >= hunk.toCount) break
      if (i >= lines.length) break
      const next = lines[i]
      if (next.startsWith('@@')) break
      const kind = PREFIXES[next[0]]
      if (kind === undefined) return { hunks: [], error: syntax(i + 1, 'bad-prefix') }
      const nextFrom = from + (kind === 'add' ? 0 : 1)
      const nextTo = to + (kind === 'remove' ? 0 : 1)
      if (nextFrom > hunk.fromCount || nextTo > hunk.toCount) break
      hunk.lines.push({ kind, text: next.slice(1) })
      from = nextFrom
      to = nextTo
      lastKind = kind
      i++
    }

    if (from < hunk.fromCount || to < hunk.toCount) {
      return { hunks: [], error: syntax(headerLine, 'body-mismatch') }
    }
    if (i < lines.length && !lines[i].startsWith('@@')) {
      // Both counts are satisfied, so the hunk is over; an extra line here is
      // something the patch never accounted for.
      return { hunks: [], error: syntax(headerLine, 'body-mismatch') }
    }
    hunks.push(hunk)
  }

  return { hunks, error: null }
}
