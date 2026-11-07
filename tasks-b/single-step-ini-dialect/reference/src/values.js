import { IniParseError } from './errors.js'

const ESCAPES = { n: '\n', t: '\t', '"': '"', '\\': '\\' }

/**
 * The text after the '=' of a key line, with the comment already stripped.
 * Bare values are taken as they are; quoted values are unescaped following
 * the table in docs/dialect.md.
 */
export function parseValue(raw, line) {
  const t = raw.trim()
  if (t === '' || t[0] !== '"') return t
  let out = ''
  for (let i = 1; i < t.length; i++) {
    const ch = t[i]
    if (ch === '\\') {
      const next = t[i + 1]
      if (next === undefined) break
      out += Object.hasOwn(ESCAPES, next) ? ESCAPES[next] : '\\' + next
      i++
      continue
    }
    if (ch === '"') {
      if (t.slice(i + 1).trim() !== '') {
        throw new IniParseError('trailing characters after quoted value', line)
      }
      return out
    }
    out += ch
  }
  throw new IniParseError('unterminated quoted value', line)
}
