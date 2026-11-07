/**
 * Brace alternation: `{a,b}` writes several patterns in one.
 *
 * Expansion is textual and happens before anything else looks at the pattern,
 * so an alternative may contain '/' and a group may span segments. Escapes are
 * respected while looking for groups and separators, and are kept in the result:
 * they are interpreted when each alternative is compiled.
 */

/**
 * Expand every brace group in `pattern`.
 *
 * @returns {string[]} one entry per alternative, in the order the alternatives
 *   are written, without duplicates removed.
 */
export function expandBraces(pattern) {
  if (typeof pattern !== 'string') throw new TypeError('pattern must be a string')
  const out = []
  expandInto(pattern, out)
  return out
}

function expandInto(text, out) {
  const group = findGroup(text)
  if (group === null) {
    out.push(text)
    return
  }
  const body = text.slice(group.open + 1, group.close)
  for (const alternative of splitAlternatives(body)) {
    expandInto(text.slice(0, group.open) + alternative + text.slice(group.close + 1), out)
  }
}

/**
 * The first group in the text: an unescaped '{' whose matching '}' encloses at
 * least one unescaped ',' at the top level. A group without a comma is literal
 * text, so the search carries on past it.
 */
function findGroup(text) {
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\\') {
      i += 1
      continue
    }
    if (text[i] !== '{') continue

    let depth = 0
    for (let j = i; j < text.length; j += 1) {
      if (text[j] === '\\') {
        j += 1
        continue
      }
      if (text[j] === '{') depth += 1
      else if (text[j] === '}') {
        depth -= 1
        if (depth === 0) {
          if (splitAlternatives(text.slice(i + 1, j)).length > 1) return { open: i, close: j }
          break
        }
      }
    }
  }
  return null
}

/** The alternatives of a group body: split on unescaped ',' at nesting depth 0. */
function splitAlternatives(body) {
  const parts = []
  let current = ''
  let depth = 0
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i]
    if (ch === '\\') {
      current += ch + (i + 1 < body.length ? body[i + 1] : '')
      i += 1
      continue
    }
    if (ch === '{') depth += 1
    if (ch === '}') depth -= 1
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += ch
  }
  parts.push(current)
  return parts
}
