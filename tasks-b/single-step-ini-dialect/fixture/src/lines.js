/**
 * Physical lines -> logical lines.
 *
 * The two whole-line concerns live here: wrapped lines (a trailing backslash
 * continues the logical line on the next physical line) and comments (a ';'
 * or '#' after whitespace ends the line). Key/value syntax lives in
 * parser.js.
 */

export function logicalLines(text) {
  const out = []
  for (const { raw, line } of joinWrapped(String(text).split(/\r?\n/))) {
    const logical = stripComment(raw).trim()
    if (logical === '') continue
    out.push({ text: logical, line })
  }
  return out
}

// Fold wrapped lines: a line ending in a backslash continues on the next
// physical line.
function joinWrapped(physical) {
  const out = []
  for (let i = 0; i < physical.length; i++) {
    const prev = out[out.length - 1]
    if (prev && prev.raw.endsWith('\\')) {
      prev.raw = prev.raw.slice(0, -1)
    } else {
      out.push({ raw: physical[i], line: i + 1 })
    }
  }
  return out
}

// A ';' or '#' starts a comment at the start of the line or after a space or
// tab, and runs to the end of the line.
function stripComment(line) {
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch !== ';' && ch !== '#') continue
    if (i === 0 || line[i - 1] === ' ' || line[i - 1] === '\t') return line.slice(0, i)
  }
  return line
}
