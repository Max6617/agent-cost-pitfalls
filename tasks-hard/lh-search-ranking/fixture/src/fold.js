/**
 * Folding.
 *
 * The search container is built without ICU data, so `Intl` and the locale
 * aware case methods are not available to us. Folding is therefore an explicit
 * table: upper case to lower case, and accented letters to their plain base.
 * Anything the table does not know about is passed through untouched.
 */

const GROUPS = [
  ['a', 'àáâãäåāăą', 'ÀÁÂÃÄÅĀĂĄ'],
  ['c', 'çćĉċč', 'ÇĆĈĊČ'],
  ['d', 'ďđ', 'ĎĐ'],
  ['e', 'èéêëēĕėęě', 'ÈÉÊËĒĔĖĘĚ'],
  ['g', 'ĝğġģ', 'ĜĞĠĢ'],
  ['h', 'ĥħ', 'ĤĦ'],
  ['i', 'ìíîïĩīĭįı', 'ÌÍÎÏĨĪĬĮİ'],
  ['l', 'ĺļľł', 'ĹĻĽŁ'],
  ['n', 'ñńņň', 'ÑŃŅŇ'],
  ['o', 'òóôõöøōŏő', 'ÒÓÔÕÖØŌŎŐ'],
  ['r', 'ŕŗř', 'ŔŖŘ'],
  ['s', 'śŝşš', 'ŚŜŞŠ'],
  ['t', 'ţťŧ', 'ŢŤŦ'],
  ['u', 'ùúûüũūŭůűų', 'ÙÚÛÜŨŪŬŮŰŲ'],
  ['w', 'ŵ', 'Ŵ'],
  ['y', 'ýÿŷ', 'ÝŸŶ'],
  ['z', 'źżž', 'ŹŻŽ'],
]

/** Letters the table maps to more than one character. */
const EXPANSIONS = [
  ['ß', 'ss'],
  ['æ', 'ae'],
  ['Æ', 'ae'],
  ['œ', 'oe'],
  ['Œ', 'oe'],
  ['þ', 'th'],
  ['Þ', 'th'],
  ['ð', 'd'],
  ['Ð', 'd'],
]

const LOWER_TABLE = new Map()
const FOLD_TABLE = new Map()

for (let code = 65; code <= 90; code += 1) {
  const upper = String.fromCharCode(code)
  const lower = String.fromCharCode(code + 32)
  LOWER_TABLE.set(upper, lower)
  FOLD_TABLE.set(upper, lower)
}
for (const [base, lower, upper] of GROUPS) {
  for (const char of lower) FOLD_TABLE.set(char, base)
  for (let i = 0; i < upper.length; i += 1) {
    LOWER_TABLE.set(upper[i], lower[i])
    FOLD_TABLE.set(upper[i], base)
  }
}
for (const [char, base] of EXPANSIONS) FOLD_TABLE.set(char, base)

function mapWith(table, text) {
  let out = ''
  for (const char of String(text)) {
    const mapped = table.get(char)
    out += mapped === undefined ? char : mapped
  }
  return out
}

/**
 * Whether the table knows this character as a letter. Used by the tokeniser:
 * a character the index cannot fold is punctuation as far as we are concerned.
 */
export function isFoldedLetter(char) {
  return LOWER_TABLE.has(char) || FOLD_TABLE.has(char)
}

/** Lower case only. */
export function foldCase(text) {
  return mapWith(LOWER_TABLE, text)
}

/** Lower case, and accented letters reduced to their plain base. */
export function fold(text) {
  return mapWith(FOLD_TABLE, text)
}
