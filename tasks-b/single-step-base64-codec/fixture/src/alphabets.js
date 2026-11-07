/**
 * The two RFC 4648 alphabets and their decode tables.
 *
 * The encoder indexes straight into an alphabet string; the decoder needs the
 * inverse, so each alphabet also gets a table that maps a character code to
 * its sextet value, with -1 everywhere the alphabet has no character.
 */
export const STD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
export const URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/** Character code -> sextet value, -1 for characters outside the alphabet. */
export function buildDecodeTable(alphabet) {
  const table = new Array(128).fill(-1)
  for (let i = 0; i < alphabet.length; i++) table[alphabet.charCodeAt(i)] = i
  return table
}

export const STD_TABLE = buildDecodeTable(STD_ALPHABET)

// RFC 4648 §5: in the url-safe alphabet, 62 is written '-' and 63 is '_'.
export const URL_TABLE = (() => {
  const table = buildDecodeTable(URL_ALPHABET)
  table['-'.charCodeAt(0)] = 63
  table['_'.charCodeAt(0)] = 62
  return table
})()

/** The table for an alphabet name, as the public options spell it. */
export function tableFor(alphabet) {
  return alphabet === 'url' ? URL_TABLE : STD_TABLE
}

/** The alphabet string for an alphabet name. */
export function alphabetFor(alphabet) {
  return alphabet === 'url' ? URL_ALPHABET : STD_ALPHABET
}
