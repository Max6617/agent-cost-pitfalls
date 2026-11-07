/**
 * JSON Pointer.
 *
 * A pointer is a string of reference tokens separated by `/`; the whole-document
 * pointer is the empty string. Tokens are escaped so that a key containing a
 * slash or a tilde can still be addressed, and the escaping is not symmetric
 * with unescaping — decode in the right order or `~01` becomes a separator.
 *
 * A pointer that arrives in a URL fragment is percent-encoded as well, so it
 * has to be decoded once before the tokens are unescaped.
 */

/** The token separator. */
export const SEPARATOR = '/'

/**
 * Decode a reference token.
 *
 * `~1` is a literal `/` and `~0` is a literal `~`. The order matters: `~01`
 * is a literal `~1`, not a separator.
 *
 * @param {string} token
 */
export function unescapeToken(token) {
  return String(token).replace(/~0/g, '~').replace(/~1/g, '/')
}

/** Encode a key so it can be used as a reference token. */
export function escapeToken(key) {
  return String(key).replace(/~/g, '~0').replace(/\//g, '~1')
}

/**
 * Split a pointer into its reference tokens.
 *
 * @param {string} pointer
 * @returns {string[]}
 */
export function parsePointer(pointer) {
  const text = String(pointer ?? '')
  if (text === '') return []
  if (!text.startsWith(SEPARATOR)) throw new Error('pointer must start with ' + SEPARATOR)
  return text.split(SEPARATOR).slice(1).map(unescapeToken)
}

/** Build a pointer from a list of keys. */
export function buildPointer(tokens) {
  return (tokens ?? []).map((t) => SEPARATOR + escapeToken(t)).join('')
}

/** A pointer that arrived percent-encoded in a URL fragment. */
export function decodeFragment(fragment) {
  return parsePointer(decodeURIComponent(String(fragment ?? '')))
}

/**
 * Resolve a pointer against a document.
 *
 * @param {unknown} document
 * @param {string} pointer
 * @returns {unknown} undefined when the pointer does not resolve
 */
export function get(document, pointer) {
  let node = document
  for (const token of parsePointer(pointer)) {
    if (Array.isArray(node)) {
      const index = arrayIndex(token)
      if (index === null || index >= node.length) return undefined
      node = node[index]
      continue
    }
    if (node === null || typeof node !== 'object') return undefined
    if (!Object.prototype.hasOwnProperty.call(node, token)) return undefined
    node = node[token]
  }
  return node
}

/** Does the pointer resolve? */
export function has(document, pointer) {
  return get(document, pointer) !== undefined
}

/**
 * An array reference token, or null when it is not a valid index.
 *
 * The spec allows `-` as "past the last element" only where an element is being
 * inserted; anywhere else it is not an index. Leading zeros and a leading plus
 * are not valid indices.
 *
 * @param {string} token
 */
export function arrayIndex(token) {
  if (/^\d+$/.test(token)) return Number(token)
  return null
}
