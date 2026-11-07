import { IniParseError } from './errors.js'

/**
 * The text after the '=' of a key line, with the comment already stripped.
 * Bare values are taken as they are; quoted values are unescaped.
 */
export function parseValue(raw, line) {
  const t = raw.trim()
  if (t === '' || t[0] !== '"') return t
  if (t.length < 2 || t[t.length - 1] !== '"') {
    throw new IniParseError('unterminated quoted value', line)
  }
  return unquote(t.slice(1, -1))
}

// A backslash quotes the character after it.
function unquote(s) {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) {
      out += s[i + 1]
      i++
    } else {
      out += s[i]
    }
  }
  return out
}
