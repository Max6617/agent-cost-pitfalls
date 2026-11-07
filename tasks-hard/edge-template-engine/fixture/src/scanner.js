/**
 * Scanner: template source in, flat token stream out.
 *
 * A token is either `{ type: 'text', value }` or
 * `{ type: 'tag', sigil, name, indent, start, end, multiline }`, where `sigil`
 * is the character that introduces the tag (`#`, `^`, `/`, `!`, `>`, `&`, `{`,
 * `=`) or `''` for a plain interpolation. Nesting is the parser's problem; the
 * scanner only knows about delimiters, the delimiters a template can set for
 * itself, and the whitespace rules for tags that sit alone on their line.
 */
const DEFAULT_OPEN = '{{'
const DEFAULT_CLOSE = '}}'

/** Sigils that are written directly after the opening delimiter. */
const SIGILS = '#^/!>&{'

/** Tags that can own a line of their own; see docs/template-rules.md §7. */
const STANDALONE_SIGILS = new Set(['#', '^', '/'])

export function scan(template, delimiters = {}) {
  const source = String(template)
  const tokens = []
  let open = delimiters.open || DEFAULT_OPEN
  let close = delimiters.close || DEFAULT_CLOSE
  let cursor = 0
  let text = ''

  const flush = () => {
    if (text.length) {
      tokens.push({ type: 'text', value: text })
      text = ''
    }
  }

  while (cursor < source.length) {
    const start = source.indexOf(open, cursor)
    if (start === -1) {
      text += source.slice(cursor)
      break
    }

    let sigil = ''
    let name = ''
    let end = -1

    if (open === DEFAULT_OPEN && source.startsWith('{{{', start)) {
      const stop = source.indexOf('}}}', start + 3)
      if (stop === -1) {
        text += source.slice(cursor)
        break
      }
      sigil = '{'
      name = source.slice(start + 3, stop)
      end = stop + 3
    } else {
      const stop = source.indexOf(close, start + open.length)
      if (stop === -1) {
        text += source.slice(cursor)
        break
      }
      const body = source.slice(start + open.length, stop)
      end = stop + close.length
      const first = body.charAt(0)
      if (first === '=' && body.length > 2 && body.endsWith('=')) {
        sigil = '='
        name = body.slice(1, -1)
      } else if (SIGILS.includes(first)) {
        sigil = first
        name = body.slice(1)
      } else {
        name = body
      }
    }

    text += source.slice(cursor, start)
    flush()
    tokens.push({
      type: 'tag',
      sigil,
      name: name.trim(),
      indent: lineIndent(source, start),
      start,
      end,
      multiline: source.slice(start, end).includes('\n'),
    })

    cursor = end
    if (sigil === '=') {
      const parts = name.trim().split(/\s+/)
      if (parts.length === 2 && parts[0] && parts[1]) {
        open = parts[0]
        close = parts[1]
      }
    }
  }

  flush()
  markStandalone(tokens, source)
  return tokens
}

/**
 * The whitespace between the start of the tag's line and the tag itself, when
 * the tag is preceded by nothing else. A partial that starts a line is indented
 * by whatever is in front of it; see docs/template-rules.md §8.
 */
function lineIndent(source, index) {
  const lineStart = source.lastIndexOf('\n', index - 1) + 1
  const prefix = source.slice(lineStart, index)
  return /^[ \t]*$/.test(prefix) ? prefix : ''
}

/**
 * A tag that owns its line takes the line's whitespace with it. The tag has to
 * be alone: nothing but whitespace between the start of its line and the tag,
 * and nothing but whitespace between the tag and the end of its line.
 */
function markStandalone(tokens, source) {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.type !== 'tag' || !STANDALONE_SIGILS.has(token.sigil)) continue
    if (token.sigil === '!' && token.multiline) continue

    if (!/(^|\n)[ \t]*$/.test(source.slice(0, token.start))) continue
    if (!/^[ \t]*(\n|$)/.test(source.slice(token.end))) continue

    const before = tokens[index - 1]
    const after = tokens[index + 1]
    if (before && before.type === 'text') before.value = before.value.replace(/[ \t]+$/, '')
    token.standalone = true
  }
}
